import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JobFiltersDto } from './dto/job-filters.dto';
import { publicJobSelect, publicJobWhere, toPublicJob } from './public-job';

@Injectable()
export class JobsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters: JobFiltersDto) {
        const where: Prisma.JobWhereInput = {
            ...publicJobWhere,
        };

        // Apply search filter
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { company: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        // Apply experience level filter
        if (filters.experienceLevel && filters.experienceLevel.length > 0) {
            where.experienceLevel = { in: filters.experienceLevel };
        }

        // Apply degree filter
        if (filters.degree && filters.degree.length > 0) {
            where.degreeRequired = { in: filters.degree };
        }

        // Apply job type filter
        if (filters.jobType && filters.jobType.length > 0) {
            where.jobType = { in: filters.jobType };
        }

        // Apply location filter
        if (filters.location) {
            where.location = { contains: filters.location, mode: 'insensitive' };
        }

        // Apply company filter
        if (filters.company) {
            where.company = { contains: filters.company, mode: 'insensitive' };
        }

        if (filters.source?.length) {
            where.source = { in: filters.source };
        }

        if (filters.postedWithin) {
            const days = { '24h': 1, '7d': 7, '30d': 30 }[filters.postedWithin];
            where.postedDate = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
        }

        // Keep this separate from location and the search OR so all filters compose.
        if (filters.remote) {
            where.AND = [{ location: { contains: 'remote', mode: 'insensitive' } }];
        }

        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;

        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                select: publicJobSelect,
                skip,
                take: limit,
                orderBy: [
                    { postedDate: { sort: 'desc', nulls: 'last' } },
                    { createdAt: 'desc' },
                    { id: 'asc' },
                ],
            }),
            this.prisma.job.count({ where }),
        ]);

        return {
            jobs: jobs.map(toPublicJob),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string) {
        const job = await this.prisma.job.findFirst({
            where: { id, ...publicJobWhere },
            select: publicJobSelect,
        });
        return job ? toPublicJob(job) : null;
    }

    async create(data: Prisma.JobCreateInput) {
        // Generic internal creation must pass through the publication pipeline later.
        return this.prisma.job.create({ data: { ...data, translationStatus: 'pending' } });
    }

    async findByHash(contentHash: string) {
        return this.prisma.job.findUnique({ where: { contentHash } });
    }

    async upsertByHash(contentHash: string, data: Prisma.JobCreateInput) {
        // Rediscovery must not erase a failed check or reopen a known closed listing.
        const {
            lastVerified: _lastVerified,
            isActive: _isActive,
            verificationAttempts: _verificationAttempts,
            lastVerificationError: _lastVerificationError,
            ...listingData
        } = data;
        return this.prisma.job.upsert({
            where: { contentHash },
            update: listingData,
            create: data,
        });
    }

    async markAsVerified(id: string) {
        return this.prisma.job.update({
            where: { id },
            data: { lastVerified: new Date() },
        });
    }

    async markAsInactive(id: string) {
        return this.prisma.job.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async expireStaleJobs(_daysOld: number = 7) {
        // A delayed refresh does not prove that a listing has closed.
        // Keep the optional argument for compatibility with existing callers.
        return this.prisma.job.updateMany({
            where: {
                isActive: true,
                verificationAttempts: { gte: 3 },
            },
            data: { isActive: false },
        });
    }

    async getStats() {
        const [totalActive, totalByType, totalByLevel, recentJobs, totalBySource, verification] = await Promise.all([
            this.prisma.job.count({ where: publicJobWhere }),
            this.prisma.job.groupBy({
                by: ['jobType'],
                where: publicJobWhere,
                _count: true,
            }),
            this.prisma.job.groupBy({
                by: ['experienceLevel'],
                where: publicJobWhere,
                _count: true,
            }),
            this.prisma.job.count({
                where: {
                    ...publicJobWhere,
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.job.groupBy({
                by: ['source'],
                where: publicJobWhere,
                _count: true,
                orderBy: { _count: { source: 'desc' } },
            }),
            this.prisma.job.aggregate({
                where: publicJobWhere,
                _max: { lastVerified: true },
            }),
        ]);

        return {
            totalActive,
            byType: totalByType,
            byLevel: totalByLevel,
            addedLast24h: recentJobs,
            bySource: totalBySource,
            lastVerifiedAt: verification._max.lastVerified,
        };
    }

    async getFilterOptions() {
        const [companies, locations, sources] = await Promise.all([
            this.prisma.job.groupBy({
                by: ['company'],
                where: publicJobWhere,
                _count: true,
                orderBy: { _count: { company: 'desc' } },
                take: 50,
            }),
            this.prisma.job.groupBy({
                by: ['location'],
                where: { ...publicJobWhere, location: { not: null } },
                _count: true,
                orderBy: { _count: { location: 'desc' } },
                take: 50,
            }),
            this.prisma.job.groupBy({
                by: ['source'],
                where: publicJobWhere,
                _count: true,
                orderBy: { source: 'asc' },
            }),
        ]);

        return {
            companies: companies.map((c) => c.company),
            locations: locations.map((l) => l.location),
            sources: sources.map((s) => s.source),
            experienceLevels: ['fresher', '1-3', '3-5', '5+'],
            degrees: ['btech', 'ballb', 'llb', 'any'],
            jobTypes: ['internship', 'full-time', 'part-time', 'contract'],
            postedWithin: ['24h', '7d', '30d'],
        };
    }
}
