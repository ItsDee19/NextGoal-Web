import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { JobFiltersDto } from './dto/job-filters.dto';

@Injectable()
export class JobsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters: JobFiltersDto) {
        const where: Prisma.JobWhereInput = {
            isActive: true,
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

        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                skip,
                take: limit,
                orderBy: { postedDate: 'desc' },
            }),
            this.prisma.job.count({ where }),
        ]);

        return {
            jobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: string) {
        return this.prisma.job.findUnique({
            where: { id },
        });
    }

    async create(data: Prisma.JobCreateInput) {
        return this.prisma.job.create({ data });
    }

    async upsertByHash(contentHash: string, data: Prisma.JobCreateInput) {
        return this.prisma.job.upsert({
            where: { contentHash },
            update: {
                ...data,
                lastVerified: new Date(),
                isActive: true,
                verificationAttempts: 0,
                lastVerificationError: null,
            },
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

    async expireStaleJobs(daysOld: number = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        // Mark jobs as inactive if:
        // 1. Not verified within X days, OR
        // 2. Have 3+ consecutive verification failures
        return this.prisma.job.updateMany({
            where: {
                isActive: true,
                OR: [
                    { lastVerified: { lt: cutoffDate } },
                    { verificationAttempts: { gte: 3 } },
                ],
            },
            data: { isActive: false },
        });
    }

    async getStats() {
        const [totalActive, totalByType, totalByLevel, recentJobs] = await Promise.all([
            this.prisma.job.count({ where: { isActive: true } }),
            this.prisma.job.groupBy({
                by: ['jobType'],
                where: { isActive: true },
                _count: true,
            }),
            this.prisma.job.groupBy({
                by: ['experienceLevel'],
                where: { isActive: true },
                _count: true,
            }),
            this.prisma.job.count({
                where: {
                    isActive: true,
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ]);

        return {
            totalActive,
            byType: totalByType,
            byLevel: totalByLevel,
            addedLast24h: recentJobs,
        };
    }

    async getFilterOptions() {
        const [companies, locations] = await Promise.all([
            this.prisma.job.groupBy({
                by: ['company'],
                where: { isActive: true },
                _count: true,
                orderBy: { _count: { company: 'desc' } },
                take: 50,
            }),
            this.prisma.job.groupBy({
                by: ['location'],
                where: { isActive: true, location: { not: null } },
                _count: true,
                orderBy: { _count: { location: 'desc' } },
                take: 50,
            }),
        ]);

        return {
            companies: companies.map((c) => c.company),
            locations: locations.map((l) => l.location),
            experienceLevels: ['fresher', '1-3', '3-5', '5+'],
            degrees: ['btech', 'ballb', 'llb', 'any'],
            jobTypes: ['internship', 'full-time'],
        };
    }
}
