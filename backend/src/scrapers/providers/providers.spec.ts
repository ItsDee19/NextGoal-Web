import axios from 'axios';
import { AshbyScraper } from './ashby.scraper';
import { LeverScraper } from './lever.scraper';
import { GreenhouseScraper } from './greenhouse.scraper';
import { SmartRecruitersScraper } from './smartrecruiters.scraper';
import { WorkdayScraper } from './workday.scraper';

jest.mock('axios');
const get = axios.get as jest.Mock;

describe('provider collection contracts', () => {
    beforeEach(() => get.mockReset());

    it('uses the public Ashby API, preserves actual application URLs and excludes unlisted jobs', async () => {
        get.mockResolvedValue({ data: { jobs: [
            { title: 'Engineer', location: 'India', isRemote: true, isListed: true, employmentType: 'FullTime', descriptionPlain: 'Build useful products', jobUrl: 'https://jobs.ashbyhq.com/acme/123', applyUrl: 'https://jobs.ashbyhq.com/acme/123/application', publishedAt: '2026-09-01T00:00:00Z' },
            { title: 'Unlisted Engineer', isListed: false },
        ] } });
        const jobs = await new AshbyScraper().scrape('acme');
        expect(get).toHaveBeenCalledWith('https://api.ashbyhq.com/posting-api/job-board/acme', expect.objectContaining({ timeout: 15000 }));
        expect(jobs).toHaveLength(1);
        expect(jobs[0]).toMatchObject({ applyUrl: 'https://jobs.ashbyhq.com/acme/123/application', location: 'India · Remote', description: 'Build useful products' });
    });

    it('prefers Lever application URLs over its overview pages', async () => {
        get.mockResolvedValue({ data: [{ id: '123', text: 'Engineer', hostedUrl: 'https://jobs.lever.co/acme/123', applyUrl: 'https://jobs.lever.co/acme/123/apply' }] });
        const [job] = await new LeverScraper().scrape('acme');
        expect(job.applyUrl).toBe('https://jobs.lever.co/acme/123/apply');
        expect(job.postedDate).toBeUndefined();
        expect(job.location).toBeUndefined();
    });

    it('requests Greenhouse descriptions and preserves the employer-provided destination', async () => {
        get.mockResolvedValue({ data: { jobs: [{ id: 123, title: 'Engineer', content: '<p>Build products</p>', absolute_url: 'https://careers.acme.com/jobs/123' }] } });
        const [job] = await new GreenhouseScraper().scrape('acme');
        expect(get).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: { content: true } }));
        expect(job).toMatchObject({ description: 'Build products', applyUrl: 'https://careers.acme.com/jobs/123' });
        expect(job.postedDate).toBeUndefined();
    });

    it('paginates SmartRecruiters beyond the first response', async () => {
        get.mockResolvedValueOnce({ data: { totalFound: 2, content: [{ id: '123', name: 'Engineer', applyUrl: 'https://jobs.smartrecruiters.com/acme/123/apply' }] } })
            .mockResolvedValueOnce({ data: { totalFound: 2, content: [{ id: '456', name: 'Designer', jobAdUrl: 'https://jobs.smartrecruiters.com/acme/456-designer' }] } });
        const jobs = await new SmartRecruitersScraper().scrape('acme');
        expect(jobs).toHaveLength(2);
        expect(get).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ params: { limit: 100, offset: 1 } }));
        expect(jobs[0].applyUrl).toBe('https://jobs.smartrecruiters.com/acme/123/apply');
        expect(jobs[1].applyUrl).toBe('https://jobs.smartrecruiters.com/acme/456-designer');
    });

    it('reports broken pagination rather than silently truncating', async () => {
        get.mockResolvedValue({ data: { totalFound: 2, content: [{ id: '123', name: 'Engineer' }] } });
        await expect(new SmartRecruitersScraper().scrape('acme')).rejects.toThrow('pagination made no progress');
    });

    it.each([GreenhouseScraper, LeverScraper, AshbyScraper, SmartRecruitersScraper])('propagates upstream failures for %p', async (Provider) => {
        get.mockRejectedValue(new Error('Upstream unavailable'));
        await expect(new Provider().scrape('acme')).rejects.toThrow('Upstream unavailable');
    });

    it('reports Workday as unsupported rather than successfully empty', async () => {
        await expect(new WorkdayScraper().scrape('acme')).rejects.toThrow('not supported');
        expect(get).not.toHaveBeenCalled();
    });
});
