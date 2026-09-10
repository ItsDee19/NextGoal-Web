import axios from 'axios';
import { JobVerificationService } from './job-verification.service';

jest.mock('axios');
const get = axios.get as jest.Mock;

describe('JobVerificationService', () => {
    let service: JobVerificationService;
    let prisma: any;

    beforeEach(() => {
        get.mockReset();
        prisma = { job: {
            findUnique: jest.fn().mockResolvedValue({ id: 'job-1', isActive: true, verificationAttempts: 2, applyUrl: 'https://jobs.lever.co/acme/job-1' }),
            findMany: jest.fn().mockResolvedValue([{ id: 'job-1' }]),
            update: jest.fn().mockResolvedValue({}),
        } };
        service = new JobVerificationService(prisma);
    });

    it.each([401, 403, 429, 500, 502, 503])('does not retire or increment closure attempts for HTTP %s', async (status) => {
        get.mockResolvedValue({ status, headers: {}, data: '' });
        expect(await service.verifyJob('job-1')).toBe('inconclusive');
        const data = prisma.job.update.mock.calls[0][0].data;
        expect(data).not.toHaveProperty('isActive');
        expect(data).not.toHaveProperty('verificationAttempts');
        expect(data.lastVerificationError).toContain(String(status));
    });

    it('treats a timeout as inconclusive and reports truthful run totals', async () => {
        get.mockRejectedValue(new Error('Request timeout'));
        expect(await service.verifyAllActiveJobs()).toEqual({ verified: 0, markedInactive: 0, errors: 0, inconclusive: 1 });
    });

    it.each([404, 410])('retires a posting after the third confirmed HTTP %s response', async (status) => {
        get.mockResolvedValue({ status, headers: {}, data: '' });
        expect(await service.verifyJob('job-1')).toBe('markedInactive');
        expect(prisma.job.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ verificationAttempts: 3, isActive: false }) }));
    });

    it('keeps the first confirmed closure pending', async () => {
        prisma.job.findUnique.mockResolvedValue({ id: 'job-1', isActive: true, verificationAttempts: 0, applyUrl: 'https://jobs.lever.co/acme/job-1' });
        get.mockResolvedValue({ status: 404, headers: {}, data: '' });
        expect(await service.verifyJob('job-1')).toBe('closurePending');
        expect(prisma.job.update.mock.calls[0][0].data.isActive).toBe(true);
    });

    it('does not interpret scripts or generic application policy as closure', async () => {
        get.mockResolvedValue({ status: 200, headers: {}, data: '<h1>Engineer</h1><script>this job is closed</script><p>Applications are reviewed until this position is filled.</p>' });
        expect(await service.verifyJob('job-1')).toBe('verified');
        expect(prisma.job.update.mock.calls[0][0].data.verificationAttempts).toBe(0);
    });

    it('recognizes an explicit closed-job heading', async () => {
        get.mockResolvedValue({ status: 200, headers: {}, data: '<h1>This job is closed</h1>' });
        expect(await service.verifyJobUrl('https://jobs.lever.co/acme/job-1')).toMatchObject({ status: 'closed', isValid: false });
    });

    it('rejects an unsafe saved URL without making a request', async () => {
        expect(await service.verifyJobUrl('http://127.0.0.1/admin')).toMatchObject({ status: 'unsafe' });
        expect(get).not.toHaveBeenCalled();
    });

    it('refuses a redirect to an internal destination before requesting it', async () => {
        get.mockResolvedValue({ status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } });
        expect(await service.verifyJobUrl('https://jobs.lever.co/acme/job-1')).toMatchObject({ status: 'unsafe' });
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('retires a URL whose hostname resolves to an internal address', async () => {
        get.mockRejectedValue(Object.assign(new Error('Private address'), { code: 'UNSAFE_APPLICATION_ADDRESS' }));
        expect(await service.verifyJob('job-1')).toBe('markedInactive');
        expect(prisma.job.update.mock.calls[0][0].data.isActive).toBe(false);
    });

    it('follows a safe relative redirect while enforcing network guards', async () => {
        get.mockResolvedValueOnce({ status: 302, headers: { location: '/acme/job-1/apply' } })
            .mockResolvedValueOnce({ status: 200, headers: {}, data: '<h1>Apply for Engineer</h1>' });
        expect(await service.verifyJobUrl('https://jobs.lever.co/acme/job-1')).toMatchObject({ status: 'valid' });
        expect(get).toHaveBeenLastCalledWith('https://jobs.lever.co/acme/job-1/apply', expect.objectContaining({ proxy: false, maxRedirects: 0, httpAgent: expect.anything(), httpsAgent: expect.anything() }));
    });
});
