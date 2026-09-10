import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { publicJobSelect, publicJobWhere } from './public-job';

describe('JobsService discovery', () => {
    const job = {
        findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn(),
        upsert: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(),
    };
    let service: JobsService;

    beforeEach(() => {
        jest.resetAllMocks();
        job.findMany.mockResolvedValue([{ id: 'listing-1' }]);
        job.count.mockResolvedValue(25);
        service = new JobsService({ job } as unknown as PrismaService);
    });

    afterEach(() => jest.useRealTimers());

    it('combines source, recency, remote and location with keyword search and existing filters', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-09-10T12:00:00Z'));
        const result = await service.findAll({
            search: 'design', source: ['greenhouse', 'lever'], postedWithin: '7d', remote: true,
            location: 'India', company: 'Acme', jobType: ['full-time'], degree: ['any'],
            experienceLevel: ['1-3'], page: 2, limit: 12,
        });

        const query = job.findMany.mock.calls[0][0];
        expect(query.where).toEqual({
            isActive: true,
            translationStatus: 'ready',
            OR: [
                { title: { contains: 'design', mode: 'insensitive' } },
                { company: { contains: 'design', mode: 'insensitive' } },
                { description: { contains: 'design', mode: 'insensitive' } },
            ],
            AND: [{ location: { contains: 'remote', mode: 'insensitive' } }],
            location: { contains: 'India', mode: 'insensitive' },
            company: { contains: 'Acme', mode: 'insensitive' },
            source: { in: ['greenhouse', 'lever'] },
            postedDate: { gte: new Date('2026-09-03T12:00:00Z') },
            jobType: { in: ['full-time'] }, degreeRequired: { in: ['any'] },
            experienceLevel: { in: ['1-3'] },
        });
        expect(job.count).toHaveBeenCalledWith({ where: query.where });
        expect(query).toMatchObject({ skip: 12, take: 12 });
        expect(result.pagination).toEqual({ page: 2, limit: 12, total: 25, totalPages: 3 });
    });

    it('defaults to active ready listings, without treating ingestion time as a posting date', async () => {
        const result = await service.findAll({ remote: false });
        expect(job.findMany).toHaveBeenCalledWith({
            where: publicJobWhere, select: publicJobSelect, skip: 0, take: 20,
            orderBy: [
                { postedDate: { sort: 'desc', nulls: 'last' } },
                { createdAt: 'desc' }, { id: 'asc' },
            ],
        });
        expect(result.pagination).toEqual({ page: 1, limit: 20, total: 25, totalPages: 2 });
    });

    it.each([
        ['24h', '2026-09-09T12:00:00Z'], ['30d', '2026-08-11T12:00:00Z'],
    ] as const)('uses the exact %s posting cutoff', async (postedWithin, cutoff) => {
        jest.useFakeTimers().setSystemTime(new Date('2026-09-10T12:00:00Z'));
        await service.findAll({ postedWithin });
        expect(job.findMany.mock.calls[0][0].where.postedDate).toEqual({ gte: new Date(cutoff) });
    });

    it('returns honest zero pagination for an empty result', async () => {
        job.count.mockResolvedValue(0);
        job.findMany.mockResolvedValue([]);
        expect(await service.findAll({})).toEqual({
            jobs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
    });

    it('reports source coverage and actual stored check time', async () => {
        const lastVerified = new Date('2026-09-09T08:00:00Z');
        job.count.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
        job.groupBy.mockResolvedValueOnce([{ jobType: 'full-time', _count: 8 }])
            .mockResolvedValueOnce([{ experienceLevel: 'fresher', _count: 8 }])
            .mockResolvedValueOnce([{ source: 'lever', _count: 8 }]);
        job.aggregate.mockResolvedValue({ _max: { lastVerified } });

        expect(await service.getStats()).toEqual({
            totalActive: 8, addedLast24h: 2,
            byType: [{ jobType: 'full-time', _count: 8 }],
            byLevel: [{ experienceLevel: 'fresher', _count: 8 }],
            bySource: [{ source: 'lever', _count: 8 }], lastVerifiedAt: lastVerified,
        });
        expect(job.aggregate).toHaveBeenCalledWith({ where: publicJobWhere, _max: { lastVerified: true } });
        for (const [query] of [...job.count.mock.calls, ...job.groupBy.mock.calls]) {
            expect(query.where).toMatchObject(publicJobWhere);
        }
    });

    it('keeps the latest check time unknown when there are no active listings', async () => {
        job.count.mockResolvedValue(0);
        job.groupBy.mockResolvedValue([]);
        job.aggregate.mockResolvedValue({ _max: { lastVerified: null } });
        expect(await service.getStats()).toMatchObject({ bySource: [], lastVerifiedAt: null, totalActive: 0 });
    });

    it('builds available source filters from active database rows', async () => {
        job.groupBy.mockResolvedValueOnce([{ company: 'Acme' }])
            .mockResolvedValueOnce([{ location: 'Remote' }])
            .mockResolvedValueOnce([{ source: 'ashby' }, { source: 'lever' }]);
        expect(await service.getFilterOptions()).toMatchObject({
            companies: ['Acme'], locations: ['Remote'], sources: ['ashby', 'lever'],
            postedWithin: ['24h', '7d', '30d'],
            jobTypes: ['internship', 'full-time', 'part-time', 'contract'],
        });
        for (const [query] of job.groupBy.mock.calls) expect(query.where).toMatchObject(publicJobWhere);
    });

    it('applies readiness in the database before both pagination and the result count', async () => {
        await service.findAll({ page: 3, limit: 2 });
        expect(job.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { isActive: true, translationStatus: 'ready' }, select: publicJobSelect, skip: 4, take: 2,
        }));
        expect(job.count).toHaveBeenCalledWith({ where: { isActive: true, translationStatus: 'ready' } });
    });

    it('does not expose a nonready or inactive listing through its detail endpoint', async () => {
        job.findFirst.mockResolvedValue(null);
        expect(await service.findById('unpublished')).toBeNull();
        expect(job.findFirst).toHaveBeenCalledWith({
            where: { id: 'unpublished', isActive: true, translationStatus: 'ready' }, select: publicJobSelect,
        });
    });

    it('uses the public projection for both list and detail responses', async () => {
        const row = { id: 'public', title: 'Engineer', originalTitle: 'PRIVATE ORIGINAL',
            translationError: 'PRIVATE ERROR', lastVerificationError: 'PRIVATE URL', translatedAt: new Date() };
        job.findMany.mockResolvedValue([row]);
        job.findFirst.mockResolvedValue(row);
        const list = await service.findAll({});
        const detail = await service.findById('public');
        expect(list.jobs[0]).toEqual(detail);
        expect(detail).toMatchObject({ id: 'public', title: 'Engineer', isTranslated: true, availabilityCheckPending: true });
        expect(JSON.stringify(list)).not.toContain('PRIVATE');
        expect(JSON.stringify(detail)).not.toContain('PRIVATE');
    });

    it('forces generic creation through publication preparation even if the input claims readiness', async () => {
        const data = { title: 'Role', company: 'Acme', source: 'lever', applyUrl: 'https://jobs.lever.co/acme/role',
            contentHash: 'hash', translationStatus: 'ready' };
        await service.create(data);
        expect(job.create).toHaveBeenCalledWith({ data: { ...data, translationStatus: 'pending' } });
    });

    it('retains full translation context for the internal source-refresh cache lookup', async () => {
        const row = { id: 'cached', originalTitle: 'Original', translationFingerprint: 'fingerprint', translationStatus: 'ready' };
        job.findUnique.mockResolvedValue(row);
        expect(await service.findByHash('hash')).toBe(row);
        expect(job.findUnique).toHaveBeenCalledWith({ where: { contentHash: 'hash' } });
    });

    it('does not reset existing link-check evidence during source refresh', async () => {
        const data = {
            title: 'Engineer', company: 'Acme', source: 'lever',
            applyUrl: 'https://jobs.lever.co/acme/job', contentHash: 'hash',
            isActive: true, lastVerified: new Date(), verificationAttempts: 0, lastVerificationError: null,
        };
        await service.upsertByHash('hash', data);
        const update = job.upsert.mock.calls[0][0].update;
        expect(update).not.toHaveProperty('lastVerified');
        expect(update).not.toHaveProperty('verificationAttempts');
        expect(update).not.toHaveProperty('lastVerificationError');
        expect(update).not.toHaveProperty('isActive');
    });

    it('requires repeated link-check failures to expire a listing, regardless of refresh age', async () => {
        await service.expireStaleJobs(7);
        expect(job.updateMany).toHaveBeenCalledWith({
            where: { isActive: true, verificationAttempts: { gte: 3 } }, data: { isActive: false },
        });
    });
});
