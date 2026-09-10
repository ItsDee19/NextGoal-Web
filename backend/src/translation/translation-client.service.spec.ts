import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { TranslationClient } from './translation-client.service';

jest.mock('axios');
const post = axios.post as jest.Mock;

describe('configured translation clients', () => {
    beforeEach(() => post.mockReset());

    it('does not contact a service unless configured', async () => {
        const client = new TranslationClient(new ConfigService({ TRANSLATION_PROVIDER: 'none' }));
        expect(client.isConfigured()).toBe(false);
        await expect(client.translate(['Bonjour'])).rejects.toThrow('not configured');
        expect(post).not.toHaveBeenCalled();
    });

    it('uses LibreTranslate auto detection and supports self-hosting without a key', async () => {
        post.mockResolvedValue({ data: { translatedText: ['Software Engineer', 'Build products &amp; services'] } });
        const client = new TranslationClient(new ConfigService({ TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'http://localhost:5000/' }));
        expect(await client.translate(['Ingénieur logiciel', 'Créer des produits'])).toEqual(['Software Engineer', 'Build products & services']);
        expect(post).toHaveBeenCalledWith('http://localhost:5000/translate', {
            q: ['Ingénieur logiciel', 'Créer des produits'], source: 'auto', target: 'en', format: 'text',
        }, expect.objectContaining({ timeout: 20000, maxRedirects: 0 }));
    });

    it('uses Google Basic v2 batch translation to English', async () => {
        post.mockResolvedValue({ data: { data: { translations: [{ translatedText: 'Software Engineer', detectedSourceLanguage: 'fr' }] } } });
        const client = new TranslationClient(new ConfigService({ TRANSLATION_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'test-key' }));
        expect(await client.translate(['Ingénieur logiciel'])).toEqual(['Software Engineer']);
        expect(post).toHaveBeenCalledWith('https://translation.googleapis.com/language/translate/v2', { q: ['Ingénieur logiciel'], target: 'en', format: 'text' }, expect.objectContaining({ params: { key: 'test-key' }, maxRedirects: 0 }));
    });

    it('rejects a partial translation response', async () => {
        post.mockResolvedValue({ data: { translatedText: ['Software Engineer'] } });
        const client = new TranslationClient(new ConfigService({ TRANSLATION_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'http://localhost:5000' }));
        await expect(client.translate(['Ingénieur logiciel', 'Notre équipe'])).rejects.toThrow('incomplete');
    });

    it('does not expose provider errors containing credentials or source text', async () => {
        post.mockRejectedValue({ message: 'secret-key in private upstream URL', response: { status: 429, data: { error: 'Notre équipe' } } });
        const client = new TranslationClient(new ConfigService({ TRANSLATION_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'secret-key' }));
        await expect(client.translate(['Notre équipe'])).rejects.toThrow('Translation provider returned HTTP 429');
    });
});
