import { Injectable, Logger } from '@nestjs/common';
import { Job } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { acceptableEnglishTranslation, assessEnglish, englishLocationText, JobTextField, languageHint, plainJobText } from './english-language';
import { TranslationClient, TranslationFailure } from './translation-client.service';

export interface JobSourceText { title: string; description?: string | null; location?: string | null; }
export interface EnglishPublication {
    title: string;
    description: string | null;
    location: string | null;
    originalTitle: string;
    originalDescription: string | null;
    originalLocation: string | null;
    sourceLanguage: string;
    translationStatus: 'ready' | 'pending' | 'failed';
    translationFingerprint: string;
    translationProvider: string | null;
    translationAttempts: number;
    translationError: string | null;
    translatedAt: Date | null;
    translationNextRetryAt: Date | null;
}

const DAY = 24 * 60 * 60 * 1000;
const fields: JobTextField[] = ['title', 'description', 'location'];
const POLICY_VERSION = 'english-publication-v1';

export function sourceTextFingerprint(source: JobSourceText): string {
    return createHash('sha256').update(JSON.stringify([POLICY_VERSION, source.title, source.description ?? null, source.location ?? null])).digest('hex');
}

function chunks(text: string, maximum = 3000): string[] {
    const characters = Array.from(text);
    const result: string[] = [];
    while (characters.length > maximum) {
        let end = maximum;
        while (end > maximum / 2 && !/\s/.test(characters[end])) end--;
        if (end <= maximum / 2) end = maximum;
        result.push(characters.splice(0, end).join('').trim());
    }
    if (characters.length) result.push(characters.join('').trim());
    return result.filter(Boolean);
}

@Injectable()
export class JobEnglishService {
    private readonly logger = new Logger(JobEnglishService.name);
    private readonly activeTranslations = new Map<string, Promise<EnglishPublication>>();
    private retryRun?: Promise<{ examined: number; ready: number; pending: number; failed: number; skipped: number }>;

    constructor(private prisma: PrismaService, private translator: TranslationClient) { }

    prepare(source: JobSourceText, existing?: Partial<Job> | null, force = false): Promise<EnglishPublication> {
        const fingerprint = sourceTextFingerprint(source);
        const active = this.activeTranslations.get(fingerprint);
        if (active) return active;
        const operation = this.prepareOnce(source, existing, force).finally(() => this.activeTranslations.delete(fingerprint));
        this.activeTranslations.set(fingerprint, operation);
        return operation;
    }

    private async prepareOnce(source: JobSourceText, existing?: Partial<Job> | null, force = false): Promise<EnglishPublication> {
        const fingerprint = sourceTextFingerprint(source);
        const clean = { title: plainJobText(source.title), description: plainJobText(source.description), location: englishLocationText(source.location) };
        const sameContent = existing?.translationFingerprint === fingerprint;
        const base: EnglishPublication = {
            // Pending records have safe placeholders; originals are retained in separate private columns.
            title: 'Awaiting English translation', description: null, location: null,
            originalTitle: source.title, originalDescription: source.description ?? null, originalLocation: source.location ?? null,
            sourceLanguage: languageHint([clean.title, clean.description].join('\n')),
            translationStatus: 'pending', translationFingerprint: fingerprint, translationProvider: null,
            translationAttempts: sameContent ? existing?.translationAttempts ?? 0 : 0,
            translationError: null, translatedAt: null, translationNextRetryAt: null,
        };
        if (sameContent && existing?.translationStatus === 'ready') {
            return { ...base, title: existing.title!, description: existing.description ?? null, location: existing.location ?? null,
                sourceLanguage: existing.sourceLanguage || 'en', translationStatus: 'ready', translationProvider: existing.translationProvider ?? null,
                translatedAt: existing.translatedAt ?? null };
        }
        if (!force && sameContent && existing?.translationNextRetryAt && existing.translationNextRetryAt.getTime() > Date.now()) {
            return { ...base, translationStatus: existing.translationStatus === 'failed' ? 'failed' : 'pending',
                translationError: existing.translationError ?? null, translationNextRetryAt: existing.translationNextRetryAt };
        }
        if (!clean.title) return this.failure(base, 'The source job title is empty');
        if (fields.every((field) => assessEnglish(clean[field], field) === 'english')) {
            return { ...base, ...clean, description: clean.description || null, location: clean.location || null,
                sourceLanguage: 'en', translationStatus: 'ready', translationProvider: 'original', translationAttempts: 0 };
        }

        const cached = await this.prisma.jobTranslationCache.findUnique({ where: { fingerprint } });
        if (cached && fields.every((field) => !clean[field] || acceptableEnglishTranslation(cached[field] || '', clean[field], field))) {
            return { ...base, title: cached.title, description: cached.description, location: cached.location,
                sourceLanguage: cached.sourceLanguage || base.sourceLanguage, translationStatus: 'ready',
                translationProvider: cached.provider, translatedAt: cached.createdAt };
        }
        if (!this.translator.isConfigured()) {
            return { ...base, translationError: 'Configure an English translation service to publish this job', translationNextRetryAt: new Date(Date.now() + DAY) };
        }

        try {
            const segments = fields.flatMap((field) => chunks(clean[field]).map((text) => ({ field, text })));
            const output: Record<JobTextField, string[]> = { title: [], description: [], location: [] };
            // Small requests suit both Google Basic and self-hosted LibreTranslate character limits.
            for (let i = 0; i < segments.length;) {
                const batch: typeof segments = [];
                let length = 0;
                while (i < segments.length && length + Array.from(segments[i].text).length <= 4000) {
                    length += Array.from(segments[i].text).length;
                    batch.push(segments[i++]);
                }
                const translated = await this.translator.translate(batch.map(({ text }) => text));
                if (translated.length !== batch.length) throw new TranslationFailure('Translation provider returned incomplete translated text');
                translated.forEach((text, index) => output[batch[index].field].push(text));
            }
            const result = { title: output.title.join('\n'), description: output.description.join('\n'), location: output.location.join('\n') };
            if (!fields.every((field) => !clean[field] || acceptableEnglishTranslation(result[field], clean[field], field))) {
                throw new TranslationFailure('Translation is incomplete or cannot be confirmed as English');
            }
            const provider = this.translator.provider;
            const translatedAt = new Date();
            await this.prisma.jobTranslationCache.upsert({
                where: { fingerprint }, update: {},
                create: { fingerprint, ...result, description: result.description || null, location: result.location || null,
                    sourceLanguage: base.sourceLanguage, provider },
            });
            return { ...base, ...result, description: result.description || null, location: result.location || null,
                translationStatus: 'ready', translationProvider: provider, translationAttempts: base.translationAttempts + 1, translatedAt };
        } catch (error) {
            return this.failure(base, error instanceof TranslationFailure ? error.message : 'English publication could not be completed');
        }
    }

    private failure(base: EnglishPublication, error: string): EnglishPublication {
        const attempts = base.translationAttempts + 1;
        const delay = Math.min(DAY, 60 * 60 * 1000 * (2 ** Math.min(attempts - 1, 5)));
        return { ...base, translationStatus: 'failed', translationAttempts: attempts, translationError: error,
            translationProvider: this.translator.provider, translationNextRetryAt: new Date(Date.now() + delay) };
    }

    retryPending(options: { limit?: number; force?: boolean } = {}) {
        if (this.retryRun) return this.retryRun;
        this.retryRun = this.retryBatch(options).finally(() => { this.retryRun = undefined; });
        return this.retryRun;
    }

    private async retryBatch({ limit = 1000, force = false }: { limit?: number; force?: boolean }) {
        const results = { examined: 0, ready: 0, pending: 0, failed: 0, skipped: 0 };
        let cursor: string | undefined;
        while (results.examined < limit) {
            const jobs = await this.prisma.job.findMany({
                where: { isActive: true, translationStatus: { not: 'ready' },
                    ...(!force ? { OR: [{ translationNextRetryAt: null }, { translationNextRetryAt: { lte: new Date() } }] } : {}) },
                orderBy: { id: 'asc' }, take: Math.min(50, limit - results.examined),
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });
            if (!jobs.length) break;
            for (const job of jobs) {
                results.examined++;
                cursor = job.id;
                const lease = new Date(Date.now() + 10 * 60 * 1000);
                const claim = await this.prisma.job.updateMany({
                    where: { id: job.id, translationStatus: job.translationStatus, translationFingerprint: job.translationFingerprint,
                        translationNextRetryAt: job.translationNextRetryAt },
                    data: { translationNextRetryAt: lease },
                });
                if (!claim.count) { results.skipped++; continue; }
                try {
                    const publication = await this.prepare({
                        title: job.originalTitle ?? job.title,
                        description: job.originalTitle === null ? job.description : job.originalDescription,
                        location: job.originalTitle === null ? job.location : job.originalLocation,
                    }, job, true);
                    // A source refresh may arrive while translation is running. Never overwrite newer source text.
                    const saved = await this.prisma.job.updateMany({
                        where: { id: job.id, translationFingerprint: job.translationFingerprint, translationNextRetryAt: lease },
                        data: publication,
                    });
                    if (!saved.count) results.skipped++;
                    else results[publication.translationStatus]++;
                } catch {
                    results.failed++;
                    await this.prisma.job.updateMany({
                        where: { id: job.id, translationFingerprint: job.translationFingerprint, translationNextRetryAt: lease },
                        data: { translationStatus: 'failed', translationError: 'English publication retry failed',
                            translationAttempts: { increment: 1 }, translationNextRetryAt: new Date(Date.now() + DAY) },
                    });
                }
            }
        }
        this.logger.log(`English publication retry: ${JSON.stringify(results)}`);
        return results;
    }
}
