import { Prisma } from '@prisma/client';

/** Publication readiness is applied in the database before counts and pagination. */
export const publicJobWhere = { isActive: true, translationStatus: 'ready' } satisfies Prisma.JobWhereInput;

export const publicJobSelect = {
    id: true, title: true, company: true, location: true, jobType: true,
    experienceLevel: true, degreeRequired: true, description: true, applyUrl: true,
    source: true, postedDate: true, lastVerified: true, isActive: true, createdAt: true,
    translatedAt: true, lastVerificationError: true,
} satisfies Prisma.JobSelect;

export type PublicJobRecord = Prisma.JobGetPayload<{ select: typeof publicJobSelect }>;

/** Explicit allowlist prevents original text and operational diagnostics leaking. */
export function toPublicJob(job: PublicJobRecord) {
    return {
        id: job.id, title: job.title, company: job.company, location: job.location,
        jobType: job.jobType, experienceLevel: job.experienceLevel, degreeRequired: job.degreeRequired,
        description: job.description, applyUrl: job.applyUrl, source: job.source,
        postedDate: job.postedDate, lastVerified: job.lastVerified, isActive: job.isActive,
        createdAt: job.createdAt, translatedAt: job.translatedAt,
        isTranslated: job.translatedAt != null,
        availabilityCheckPending: !!job.lastVerificationError,
    };
}
