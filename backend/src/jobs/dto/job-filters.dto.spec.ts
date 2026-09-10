import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { JobFiltersDto } from './job-filters.dto';

describe('JobFiltersDto request validation', () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
    const parse = (query: Record<string, unknown>): Promise<JobFiltersDto> =>
        pipe.transform(query, { type: 'query', metatype: JobFiltersDto });

    it('transforms URL query values and trims free text', async () => {
        const filters = await parse({
            search: '  software engineer  ', location: '  India ', company: ' Acme ',
            source: 'greenhouse', experienceLevel: 'fresher', jobType: ['internship', 'full-time'],
            degree: ['btech', 'any'], postedWithin: '7d', remote: 'true', page: '2', limit: '12',
        });

        expect(filters).toMatchObject({
            search: 'software engineer', location: 'India', company: 'Acme',
            source: ['greenhouse'], experienceLevel: ['fresher'], jobType: ['internship', 'full-time'],
            degree: ['btech', 'any'], postedWithin: '7d', remote: true, page: 2, limit: 12,
        });
    });

    it('uses bounded defaults and interprets false as false', async () => {
        expect(await parse({ remote: 'false' })).toMatchObject({ page: 1, limit: 20, remote: false });
    });

    it.each([
        { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '100001' }, { page: 'abc' },
        { limit: '0' }, { limit: '-20' }, { limit: '2.5' }, { limit: '101' }, { limit: 'Infinity' },
        { postedWithin: 'yesterday' }, { remote: 'yes' }, { source: [42] }, { source: [''] },
        { degree: [{ bad: true }] }, { experienceLevel: [false] }, { jobType: [null] },
        { source: Array(21).fill('greenhouse') }, { search: 'a'.repeat(201) }, { extra: 'unknown' },
    ])('rejects invalid query %j before a database request', async (query) => {
        await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each(['24h', '7d', '30d'])('accepts the supported posting window %s', async (postedWithin) => {
        expect((await parse({ postedWithin })).postedWithin).toBe(postedWithin);
    });
});
