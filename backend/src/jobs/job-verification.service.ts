import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class JobVerificationService {
    private readonly logger = new Logger(JobVerificationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Verify if a job URL is still valid (returns 200 status)
     */
    async verifyJobUrl(url: string): Promise<{ isValid: boolean; error?: string }> {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                maxRedirects: 5,
                validateStatus: (status) => status < 500, // Accept any status < 500
                headers: {
                    'User-Agent': 'NextGoal Job Aggregator (contact@example.com)',
                },
            });

            // Check if page indicates job is closed
            if (response.status === 200) {
                const isClosed = this.checkJobClosed(response.data);
                if (isClosed) {
                    return { isValid: false, error: 'Job marked as closed on page' };
                }
                return { isValid: true };
            }

            if (response.status === 404) {
                return { isValid: false, error: '404 Not Found' };
            }

            if (response.status === 410) {
                return { isValid: false, error: '410 Gone (Job Removed)' };
            }

            return { isValid: false, error: `HTTP ${response.status}` };
        } catch (error: any) {
            if (error.code === 'ENOTFOUND') {
                return { isValid: false, error: 'Domain not found' };
            }
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                return { isValid: false, error: 'Request timeout' };
            }
            return { isValid: false, error: error.message || 'Unknown error' };
        }
    }

    /**
     * Check if job page HTML contains "closed" indicators
     */
    private checkJobClosed(html: string): boolean {
        try {
            const $ = cheerio.load(html);
            const pageText = $.text().toLowerCase();

            const closedPhrases = [
                'position filled',
                'no longer accepting applications',
                'this job is closed',
                'this position is no longer available',
                'application closed',
                'job closed',
                'posting has closed',
                'applications are closed',
                'opportunity has closed',
            ];

            return closedPhrases.some((phrase) => pageText.includes(phrase));
        } catch (error) {
            this.logger.warn('Error parsing HTML for closed status', error);
            return false;
        }
    }

    /**
     * Verify a single job by ID
     */
    async verifyJob(jobId: string): Promise<void> {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            this.logger.warn(`Job ${jobId} not found`);
            return;
        }

        if (!job.isActive) {
            this.logger.debug(`Skipping inactive job ${jobId}`);
            return;
        }

        const verification = await this.verifyJobUrl(job.applyUrl);

        if (verification.isValid) {
            // Job is valid - reset verification attempts
            await this.prisma.job.update({
                where: { id: jobId },
                data: {
                    lastVerified: new Date(),
                    verificationAttempts: 0,
                    lastVerificationError: null,
                },
            });
            this.logger.debug(`Job ${jobId} verified successfully`);
        } else {
            // Job verification failed - increment attempts
            const newAttempts = job.verificationAttempts + 1;
            const shouldMarkInactive = newAttempts >= 3;

            await this.prisma.job.update({
                where: { id: jobId },
                data: {
                    lastVerified: new Date(),
                    verificationAttempts: newAttempts,
                    lastVerificationError: verification.error,
                    isActive: shouldMarkInactive ? false : job.isActive,
                },
            });

            if (shouldMarkInactive) {
                this.logger.log(
                    `Job ${jobId} marked inactive after ${newAttempts} failed attempts. Last error: ${verification.error}`,
                );
            } else {
                this.logger.debug(
                    `Job ${jobId} verification failed (attempt ${newAttempts}/3): ${verification.error}`,
                );
            }
        }
    }

    /**
     * Verify all active jobs in batches
     */
    async verifyAllActiveJobs(): Promise<{ verified: number; markedInactive: number; errors: number }> {
        // Only verify jobs not checked in the last 20 hours (incremental nightly run)
        const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

        const activeJobs = await this.prisma.job.findMany({
            where: {
                isActive: true,
                lastVerified: { lt: twentyHoursAgo },
            },
            select: { id: true },
        });

        this.logger.log(`Starting verification for ${activeJobs.length} active jobs`);

        let verified = 0;
        let markedInactive = 0;
        let errors = 0;

        // Process in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < activeJobs.length; i += batchSize) {
            const batch = activeJobs.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async (job) => {
                    try {
                        const jobBefore = await this.prisma.job.findUnique({
                            where: { id: job.id },
                            select: { isActive: true },
                        });

                        await this.verifyJob(job.id);

                        const jobAfter = await this.prisma.job.findUnique({
                            where: { id: job.id },
                            select: { isActive: true },
                        });

                        if (jobBefore?.isActive && !jobAfter?.isActive) {
                            markedInactive++;
                        } else {
                            verified++;
                        }
                    } catch (error) {
                        this.logger.error(`Error verifying job ${job.id}`, error);
                        errors++;
                    }
                }),
            );

            // Small delay between batches
            if (i + batchSize < activeJobs.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        this.logger.log(
            `Verification complete: ${verified} verified, ${markedInactive} marked inactive, ${errors} errors`,
        );

        return { verified, markedInactive, errors };
    }
}
