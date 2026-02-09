import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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
        });
    }

    async getSavedJobs(userId: string) {
        const savedJobs = await this.prisma.savedJob.findMany({
            where: { userId },
            include: { job: true },
            orderBy: { savedAt: 'desc' },
        });
        return savedJobs.map((sj) => sj.job);
    }

    async saveJob(userId: string, jobId: string) {
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
        return this.prisma.savedJob.delete({
            where: {
                userId_jobId: { userId, jobId },
            },
        });
    }

    async isJobSaved(userId: string, jobId: string) {
        const saved = await this.prisma.savedJob.findUnique({
            where: {
                userId_jobId: { userId, jobId },
            },
        });
        return !!saved;
    }
}
