import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { plainJobText } from './english-language';

export class TranslationFailure extends Error { }

@Injectable()
export class TranslationClient {
    constructor(private config: ConfigService) { }

    get provider(): string { return (this.config.get<string>('TRANSLATION_PROVIDER') || 'none').toLowerCase(); }

    isConfigured(): boolean {
        if (this.provider === 'google') return !!this.config.get<string>('GOOGLE_TRANSLATE_API_KEY')?.trim();
        if (this.provider === 'libretranslate') return !!this.config.get<string>('LIBRETRANSLATE_URL')?.trim();
        return false;
    }

    async translate(texts: string[]): Promise<string[]> {
        if (!this.isConfigured()) throw new TranslationFailure('English translation service is not configured');
        if (!texts.length) return [];
        try {
            let translated: unknown;
            if (this.provider === 'google') {
                // https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate
                const response = await axios.post('https://translation.googleapis.com/language/translate/v2', {
                    q: texts, target: 'en', format: 'text',
                }, {
                    params: { key: this.config.get<string>('GOOGLE_TRANSLATE_API_KEY') },
                    timeout: 20000, maxRedirects: 0, maxContentLength: 1024 * 1024,
                });
                translated = response.data?.data?.translations?.map((item: any) => item.translatedText);
            } else {
                // https://docs.libretranslate.com/api/operations/translate/
                const base = new URL(this.config.get<string>('LIBRETRANSLATE_URL')!.trim());
                if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
                    throw new TranslationFailure('LibreTranslate URL must be an HTTP(S) base URL without credentials or query parameters');
                }
                const apiKey = this.config.get<string>('LIBRETRANSLATE_API_KEY');
                const response = await axios.post(`${base.href.replace(/\/$/, '')}/translate`, {
                    q: texts, source: 'auto', target: 'en', format: 'text', ...(apiKey ? { api_key: apiKey } : {}),
                }, { timeout: 20000, maxRedirects: 0, maxContentLength: 1024 * 1024 });
                translated = response.data?.translatedText;
                if (typeof translated === 'string' && texts.length === 1) translated = [translated];
            }
            if (!Array.isArray(translated) || translated.length !== texts.length || translated.some((text) => typeof text !== 'string' || !text.trim())) {
                throw new TranslationFailure('Translation provider returned incomplete translated text');
            }
            return translated.map((text) => plainJobText(text));
        } catch (error: any) {
            if (error instanceof TranslationFailure) throw error;
            // Never persist/log an Axios request object, source text or an API key in diagnostics.
            const status = error.response?.status;
            throw new TranslationFailure(status ? `Translation provider returned HTTP ${status}` : 'Translation provider is temporarily unavailable');
        }
    }
}
