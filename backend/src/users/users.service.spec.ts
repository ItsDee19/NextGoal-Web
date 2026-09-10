import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { publicJobSelect, publicJobWhere } from '../jobs/public-job';
import { UsersService } from './users.service';

describe('UsersService saved listing publication', () => {
    const savedJob = { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() };
    const job = { findFirst: jest.fn() };
    let service: UsersService;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new UsersService({ savedJob, job } as unknown as PrismaService);
    });

    it('scopes saved jobs to the user and public readiness before retrieving any job text', async () => {
        savedJob.findMany.mockResolvedValue([{ job: { id: 'ready', title: 'Engineer', originalTitle: 'PRIVATE ORIGINAL',
            translationError: 'PRIVATE ERROR', lastVerificationError: 'PRIVATE CHECK', translatedAt: null } }]);
        const result = await service.getSavedJobs('user-a');
        expect(savedJob.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-a', job: { is: { isActive: true, translationStatus: 'ready' } } },
            select: { job: { select: publicJobSelect } }, orderBy: { savedAt: 'desc' },
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'ready', title: 'Engineer', availabilityCheckPending: true, isTranslated: false });
        expect(JSON.stringify(result)).not.toContain('PRIVATE');
    });

    it('rejects unavailable IDs with the same error and does not create a saved reference', async () => {
        job.findFirst.mockResolvedValue(null);
        await expect(service.saveJob('user-a', 'unavailable')).rejects.toThrow(new NotFoundException('Job not found'));
        expect(job.findFirst).toHaveBeenCalledWith({
            where: { id: 'unavailable', isActive: true, translationStatus: 'ready' }, select: { id: true },
        });
        expect(savedJob.upsert).not.toHaveBeenCalled();
    });

    it('saves a ready active job idempotently for the requesting user', async () => {
        job.findFirst.mockResolvedValue({ id: 'ready' });
        savedJob.upsert.mockResolvedValue({ userId: 'user-a', jobId: 'ready' });
        expect(await service.saveJob('user-a', 'ready')).toMatchObject({ userId: 'user-a', jobId: 'ready' });
        expect(savedJob.upsert).toHaveBeenCalledWith({
            where: { userId_jobId: { userId: 'user-a', jobId: 'ready' } }, update: {},
            create: { userId: 'user-a', jobId: 'ready' },
        });
    });

    it('does not reveal whether an unpublished job exists in saved status', async () => {
        savedJob.findFirst.mockResolvedValue(null);
        expect(await service.isJobSaved('user-a', 'unpublished')).toBe(false);
        expect(savedJob.findFirst).toHaveBeenCalledWith({
            where: { userId: 'user-a', jobId: 'unpublished', job: { is: publicJobWhere } }, select: { jobId: true },
        });
        savedJob.findFirst.mockResolvedValue({ jobId: 'ready' });
        expect(await service.isJobSaved('user-a', 'ready')).toBe(true);
    });

    it('removes only the current users reference and accepts an already absent saved job', async () => {
        savedJob.deleteMany.mockResolvedValue({ count: 0 });
        await expect(service.unsaveJob('user-a', 'hidden')).resolves.toEqual({ count: 0 });
        expect(savedJob.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-a', jobId: 'hidden' } });
    });
});
