import { ScrapersService } from './scrapers.service';

describe('ScrapersService reliability', () => {
    let service: ScrapersService;
    let redis: any;
    let jobs: any;
    let greenhouse: any;
    let lever: any;
    let english: any;
    const posting = { title: 'Engineer', company: 'Acme', location: 'Remote', source: 'greenhouse', sourceId: '123', applyUrl: 'https://boards.greenhouse.io/acme/jobs/123' };

    beforeEach(() => {
        redis = { set: jest.fn().mockResolvedValue('OK'), get: jest.fn().mockResolvedValue(null), eval: jest.fn().mockResolvedValue(1) };
        jobs = { findByHash: jest.fn().mockResolvedValue(null), upsertByHash: jest.fn().mockResolvedValue({}), expireStaleJobs: jest.fn() };
        greenhouse = { scrape: jest.fn().mockResolvedValue([posting]) };
        lever = { scrape: jest.fn().mockResolvedValue([]) };
        english = { prepare: jest.fn().mockImplementation(async (source) => ({ title: source.title, description: source.description ?? null, location: source.location ?? null, translationStatus: 'ready' })) };
        service = new ScrapersService({ client: redis } as any, jobs, greenhouse, lever, {} as any, {} as any, {} as any, english);
        jest.spyOn(service, 'getSampleCompanies').mockReturnValue([{ source: 'greenhouse', companyId: 'acme' }]);
    });

    it('skips unsafe application links before database writes', async () => {
        expect(await service.processScrapedJobs([{ ...posting, applyUrl: 'javascript:alert(1)' }, posting]))
            .toEqual({ added: 1, updated: 0, errors: 1, englishReady: 1, translationPending: 0 });
        expect(jobs.upsertByHash).toHaveBeenCalledTimes(1);
        expect(jobs.upsertByHash.mock.calls[0][1].applyUrl).toBe(posting.applyUrl);
    });

    it('coalesces overlapping full runs in one process', async () => {
        const first = service.runFullScrape();
        const second = service.runFullScrape();
        expect(first).toBe(second);
        await Promise.all([first, second]);
        expect(greenhouse.scrape).toHaveBeenCalledTimes(1);
    });

    it('retains a foreign source job privately when translation is unavailable', async () => {
        english.prepare.mockResolvedValue({ title: 'Awaiting English translation', originalTitle: 'Ingénieur logiciel', originalDescription: 'Notre équipe', originalLocation: 'Paris, France', translationStatus: 'pending' });
        const result = await service.processScrapedJobs([{ ...posting, title: 'Ingénieur logiciel', description: 'Notre équipe' }]);
        expect(result).toMatchObject({ added: 1, errors: 0, englishReady: 0, translationPending: 1 });
        expect(jobs.upsertByHash.mock.calls[0][1]).toMatchObject({ originalTitle: 'Ingénieur logiciel', translationStatus: 'pending', applyUrl: posting.applyUrl, company: posting.company });
    });

    it('skips when another instance holds the Redis lock', async () => {
        redis.set.mockResolvedValueOnce(null);
        expect(await service.runFullScrape()).toMatchObject({ skipped: 'already-running' });
        expect(greenhouse.scrape).not.toHaveBeenCalled();
    });

    it('does not scrape unlocked if Redis fails', async () => {
        redis.set.mockRejectedValue(new Error('Redis offline'));
        await expect(service.runFullScrape()).rejects.toThrow('Redis offline');
        expect(greenhouse.scrape).not.toHaveBeenCalled();
    });

    it('uses the persisted completion time to avoid unnecessary startup fetching', async () => {
        redis.get.mockResolvedValue(String(Date.now() - 60 * 60 * 1000));
        expect(await service.runFullScrape({ onlyIfDue: true })).toMatchObject({ skipped: 'not-due' });
        expect(greenhouse.scrape).not.toHaveBeenCalled();
        expect(redis.eval).toHaveBeenCalled();
    });

    it('catches up after more than 24 hours and records completion', async () => {
        redis.get.mockResolvedValue(String(Date.now() - 25 * 60 * 60 * 1000));
        expect(await service.runFullScrape({ onlyIfDue: true })).toMatchObject({ added: 1, successful: 1, failed: 0 });
        expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 2, 'nextgoal:scraper:lock', 'nextgoal:scraper:last-completed', expect.any(String), expect.any(String));
        expect(jobs.expireStaleJobs).not.toHaveBeenCalled();
    });

    it('reports a failed board while retaining successful results from others', async () => {
        (service.getSampleCompanies as jest.Mock).mockReturnValue([{ source: 'greenhouse', companyId: 'acme' }, { source: 'lever', companyId: 'other' }]);
        lever.scrape.mockRejectedValue(new Error('HTTP 429'));
        expect(await service.runFullScrape()).toMatchObject({ added: 1, successful: 1, failed: 1, companies: [expect.objectContaining({ companyId: 'acme' }), expect.objectContaining({ companyId: 'other', error: 'HTTP 429' })] });
        expect(jobs.expireStaleJobs).not.toHaveBeenCalled();
    });

    it('does not record completion after losing ownership of its lock', async () => {
        redis.eval.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
        await expect(service.runFullScrape()).rejects.toThrow('lock lost before recording completion');
        expect(redis.set).toHaveBeenCalledTimes(1);
    });
});
