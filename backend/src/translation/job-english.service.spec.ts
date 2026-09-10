import { JobEnglishService, sourceTextFingerprint } from './job-english.service';
import { TranslationFailure } from './translation-client.service';

describe('durable English publication', () => {
    let prisma: any;
    let client: any;
    let service: JobEnglishService;
    const french = { title: 'Ingénieur logiciel', description: 'Nous créons des outils avec notre équipe.', location: 'Paris, France' };
    const translated = ['Software Engineer', 'We build useful products with our team.', 'Paris, France'];

    beforeEach(() => {
        prisma = {
            jobTranslationCache: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) },
            job: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
        client = { provider: 'libretranslate', isConfigured: jest.fn().mockReturnValue(true), translate: jest.fn().mockResolvedValue(translated) };
        service = new JobEnglishService(prisma, client);
    });

    it('publishes confidently English source text without a provider or translation badge', async () => {
        client.isConfigured.mockReturnValue(false);
        const source = { title: 'Software Engineer', description: 'We build useful products with our team.', location: 'Remote' };
        expect(await service.prepare(source)).toMatchObject({ ...source, originalTitle: source.title, translationStatus: 'ready', translationProvider: 'original', sourceLanguage: 'en', translatedAt: null });
        expect(client.translate).not.toHaveBeenCalled();
    });

    it('translates every populated text field while preserving exact originals privately', async () => {
        const result = await service.prepare(french);
        expect(result).toMatchObject({ title: translated[0], description: translated[1], location: translated[2], originalTitle: french.title,
            originalDescription: french.description, originalLocation: french.location, translationStatus: 'ready', translatedAt: expect.any(Date) });
        expect(client.translate).toHaveBeenCalledWith([french.title, french.description, french.location]);
        expect(prisma.jobTranslationCache.upsert).toHaveBeenCalledTimes(1);
        expect(result).not.toHaveProperty('applyUrl');
        expect(result).not.toHaveProperty('company');
    });

    it('allows the provider to preserve an already-English description with proper names while translating the title', async () => {
        const description = 'Join OpenAI in Des Moines to build reliable software products and help our customers solve complex problems.';
        const source = { title: french.title, description, location: 'Des Moines · Remote' };
        client.translate.mockResolvedValue(['Software Engineer', description, source.location]);
        expect(await service.prepare(source)).toMatchObject({ title: 'Software Engineer', description, location: source.location, translationStatus: 'ready' });
    });

    it('retains foreign text for retry without publishing it when no provider is configured', async () => {
        client.isConfigured.mockReturnValue(false);
        const result = await service.prepare(french);
        expect(result).toMatchObject({ title: 'Awaiting English translation', description: null, location: null, originalTitle: french.title,
            originalDescription: french.description, translationStatus: 'pending', translationAttempts: 0, translationNextRetryAt: expect.any(Date) });
        expect(client.translate).not.toHaveBeenCalled();
    });

    it('keeps source data and schedules retry after upstream translation failure', async () => {
        client.translate.mockRejectedValue(new TranslationFailure('Translation provider returned HTTP 503'));
        const result = await service.prepare(french);
        expect(result).toMatchObject({ translationStatus: 'failed', translationAttempts: 1, originalTitle: french.title, translationError: 'Translation provider returned HTTP 503' });
        expect(result.translationNextRetryAt!.getTime()).toBeGreaterThan(Date.now());
        expect(prisma.jobTranslationCache.upsert).not.toHaveBeenCalled();
    });

    it.each([
        ['Software Engineer'],
        ['Software Engineer', 'Nous créons des outils avec notre équipe.', 'Paris, France'],
        ['软件工程师', 'We build useful products with our team.', 'Paris, France'],
    ])('does not publish partially translated fields %#', async (...response) => {
        client.translate.mockResolvedValue(response);
        expect(await service.prepare(french)).toMatchObject({ translationStatus: 'failed', originalTitle: french.title, title: 'Awaiting English translation' });
        expect(prisma.jobTranslationCache.upsert).not.toHaveBeenCalled();
    });

    it('reuses an unchanged successful record without translation calls', async () => {
        const first = await service.prepare(french);
        const second = await service.prepare(french, first);
        expect(second).toMatchObject({ title: translated[0], translationStatus: 'ready', translatedAt: first.translatedAt });
        expect(client.translate).toHaveBeenCalledTimes(1);
    });

    it('reuses persistent translations after a process restart even without provider credentials', async () => {
        client.isConfigured.mockReturnValue(false);
        prisma.jobTranslationCache.findUnique.mockResolvedValue({ fingerprint: sourceTextFingerprint(french), title: translated[0], description: translated[1], location: translated[2], sourceLanguage: 'fr', provider: 'google', createdAt: new Date() });
        expect(await service.prepare(french)).toMatchObject({ translationStatus: 'ready', translationProvider: 'google' });
        expect(client.translate).not.toHaveBeenCalled();
    });

    it('invalidates a prior English publication when original source content changes', async () => {
        const first = await service.prepare(french);
        client.isConfigured.mockReturnValue(false);
        const updated = { ...french, description: `${french.description} Nouveau poste.` };
        const result = await service.prepare(updated, first);
        expect(result).toMatchObject({ translationStatus: 'pending', originalDescription: updated.description });
        expect(result.translationFingerprint).not.toBe(first.translationFingerprint);
    });

    it('coalesces simultaneous identical translations within a process', async () => {
        const first = service.prepare(french);
        const second = service.prepare(french);
        expect(first).toBe(second);
        await Promise.all([first, second]);
        expect(client.translate).toHaveBeenCalledTimes(1);
    });

    it('respects persisted retry timing unless explicitly forced', async () => {
        client.translate.mockRejectedValue(new TranslationFailure('Translation provider returned HTTP 429'));
        const failed = await service.prepare(french);
        await service.prepare(french, failed);
        expect(client.translate).toHaveBeenCalledTimes(1);
        await service.prepare(french, failed, true);
        expect(client.translate).toHaveBeenCalledTimes(2);
    });

    it('backfills legacy source text using an atomic claim and does not touch links or company names', async () => {
        const stored = { id: 'job-1', title: french.title, description: french.description, location: french.location, originalTitle: null, originalDescription: null,
            originalLocation: null, translationStatus: 'pending', translationFingerprint: null, translationNextRetryAt: null, translationAttempts: 0 };
        prisma.job.findMany.mockResolvedValueOnce([stored]).mockResolvedValueOnce([]);
        expect(await service.retryPending()).toEqual({ examined: 1, ready: 1, pending: 0, failed: 0, skipped: 0 });
        expect(prisma.job.updateMany.mock.calls[1][0].where).toMatchObject({ id: 'job-1', translationFingerprint: null, translationNextRetryAt: expect.any(Date) });
        const published = prisma.job.updateMany.mock.calls[1][0].data;
        expect(published).toMatchObject({ translationStatus: 'ready', originalTitle: french.title });
        expect(published).not.toHaveProperty('applyUrl');
        expect(published).not.toHaveProperty('company');
    });

    it('does not overwrite a newer source refresh after a translation finishes', async () => {
        prisma.job.findMany.mockResolvedValueOnce([{ id: 'job-1', ...french, originalTitle: null, translationStatus: 'pending', translationFingerprint: null, translationNextRetryAt: null }]).mockResolvedValueOnce([]);
        prisma.job.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
        expect(await service.retryPending()).toMatchObject({ ready: 0, skipped: 1 });
    });
});
