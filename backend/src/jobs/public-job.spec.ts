import { PublicJobRecord, publicJobSelect, toPublicJob } from './public-job';

const listing: PublicJobRecord = {
    id: 'job-1', title: 'Engineer', company: 'Acme', location: 'Remote', jobType: 'full-time',
    experienceLevel: '1-3', degreeRequired: 'any', description: 'Build useful things.',
    applyUrl: 'https://jobs.lever.co/acme/job-1', source: 'lever', postedDate: null,
    lastVerified: new Date('2026-09-10T10:00:00Z'), isActive: true,
    createdAt: new Date('2026-09-09T10:00:00Z'), translatedAt: null, lastVerificationError: null,
};

describe('public job projection', () => {
    it('returns an explicit safe shape even when handed a full internal database record', () => {
        const internal = { ...listing, originalTitle: 'PRIVATE ORIGINAL', originalDescription: 'PRIVATE BODY',
            originalLocation: 'PRIVATE LOCATION', sourceLanguage: 'PRIVATE LANGUAGE', translationFingerprint: 'PRIVATE HASH',
            translationProvider: 'PRIVATE PROVIDER', translationError: 'PRIVATE FAILURE', translationAttempts: 2,
            translationStatus: 'ready', translationNextRetryAt: new Date(), sourceId: 'PRIVATE SOURCE ID',
            contentHash: 'PRIVATE CONTENT HASH', verificationAttempts: 2, lastVerificationError: 'PRIVATE CHECK DIAGNOSTIC' };
        const result = toPublicJob(internal);
        expect(Object.keys(result).sort()).toEqual([
            'id', 'title', 'company', 'location', 'jobType', 'experienceLevel', 'degreeRequired',
            'description', 'applyUrl', 'source', 'postedDate', 'lastVerified', 'isActive', 'createdAt',
            'translatedAt', 'isTranslated', 'availabilityCheckPending',
        ].sort());
        expect(JSON.stringify(result)).not.toContain('PRIVATE');
        expect(result.availabilityCheckPending).toBe(true);
    });

    it('selects no raw source text or translation operational fields from public database queries', () => {
        for (const key of ['originalTitle', 'originalDescription', 'originalLocation', 'sourceLanguage',
            'translationStatus', 'translationProvider', 'translationFingerprint', 'translationError',
            'translationAttempts', 'translationNextRetryAt', 'contentHash', 'sourceId']) {
            expect(publicJobSelect).not.toHaveProperty(key);
        }
    });

    it('does not badge an unchanged English listing', () => {
        expect(toPublicJob({ ...listing, translatedAt: null })).toMatchObject({
            isTranslated: false, translatedAt: null, availabilityCheckPending: false,
        });
    });

    it('badges successful translations and translations reused from cache', () => {
        const translatedAt = new Date('2026-09-10T09:00:00Z');
        expect(toPublicJob({ ...listing, translatedAt })).toMatchObject({ isTranslated: true, translatedAt });
    });
});
