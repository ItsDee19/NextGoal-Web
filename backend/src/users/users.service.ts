import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { publicJobSelect, publicJobWhere, toPublicJob } from '../jobs/public-job';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(data: {
        email: string;
        passwordHash?: string;
        name?: string;
        googleId?: string;
    }) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: data.passwordHash,
                name: data.name,
                googleId: data.googleId,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findByGoogleId(googleId: string) {
        return this.prisma.user.findUnique({
            where: { googleId },
        });
    }

    async update(id: string, data: Prisma.UserUpdateInput) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async updatePreferences(id: string, preferences: Record<string, any>) {
        return this.prisma.user.update({
            where: { id },
            data: { preferences },
            select: {
                id: true,
                email: true,
                name: true,
                preferences: true,
                createdAt: true,
            },
        });
    }

    async getSavedJobs(userId: string) {
        const savedJobs = await this.prisma.savedJob.findMany({
            where: { userId, job: { is: publicJobWhere } },
            select: { job: { select: publicJobSelect } },
            orderBy: { savedAt: 'desc' },
        });
        return savedJobs.map((saved) => toPublicJob(saved.job));
    }

    async saveJob(userId: string, jobId: string) {
        const available = await this.prisma.job.findFirst({
            where: { id: jobId, ...publicJobWhere },
            select: { id: true },
        });
        if (!available) throw new NotFoundException('Job not found');
        return this.prisma.savedJob.upsert({
            where: {
                userId_jobId: { userId, jobId },
            },
            update: {},
            create: {
                userId,
                jobId,
            },
        });
    }

    async unsaveJob(userId: string, jobId: string) {
        // Idempotent removal does not reveal whether an unpublished job was saved.
        return this.prisma.savedJob.deleteMany({ where: { userId, jobId } });
    }

    async isJobSaved(userId: string, jobId: string) {
        const saved = await this.prisma.savedJob.findFirst({
            where: { userId, jobId, job: { is: publicJobWhere } },
            select: { jobId: true },
        });
        return !!saved;
    }
}
