import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { normalizeApplicationUrl, publicDnsLookup } from '../common/application-url';

export interface LinkVerification {
    status: 'valid' | 'closed' | 'unknown' | 'unsafe';
    isValid: boolean;
    error?: string;
}

type JobVerificationOutcome = 'verified' | 'markedInactive' | 'closurePending' | 'inconclusive' | 'skipped';

@Injectable()
export class JobVerificationService {
    private readonly logger = new Logger(JobVerificationService.name);
    private readonly httpAgent = new HttpAgent({ lookup: publicDnsLookup });
    private readonly httpsAgent = new HttpsAgent({ lookup: publicDnsLookup });
    private activeRun?: Promise<{ verified: number; markedInactive: number; errors: number; inconclusive: number }>;

    constructor(private prisma: PrismaService) { }

    /** Reachability is evidence, never a guarantee that an employer will accept an application. */
    async verifyJobUrl(url: string): Promise<LinkVerification> {
        let currentUrl = normalizeApplicationUrl(url);
        if (!currentUrl) return { status: 'unsafe', isValid: false, error: 'Invalid or unsafe application URL' };
        try {
            for (let redirects = 0; redirects <= 5; redirects++) {
                const response = await axios.get(currentUrl, {
                    timeout: 10000,
                    maxRedirects: 0,
                    maxContentLength: 2 * 1024 * 1024,
                    responseType: 'text',
                    validateStatus: () => true,
                    httpAgent: this.httpAgent,
                    httpsAgent: this.httpsAgent,
                    proxy: false,
                    headers: { 'User-Agent': 'NextGoal Job Aggregator' },
                });
                if ([301, 302, 303, 307, 308].includes(response.status)) {
                    const location = response.headers?.location;
                    if (!location) return { status: 'unknown', isValid: false, error: 'Redirect without destination' };
                    let destination: string | null;
                    try { destination = normalizeApplicationUrl(new URL(location, currentUrl).href); }
                    catch { destination = null; }
                    if (!destination) return { status: 'unsafe', isValid: false, error: 'Unsafe application redirect' };
                    currentUrl = destination;
                    continue;
                }
                if (response.status === 404 || response.status === 410) {
                    return { status: 'closed', isValid: false, error: `HTTP ${response.status}: posting unavailable` };
                }
                if (response.status === 200) {
                    if (this.checkJobClosed(response.data)) {
                        return { status: 'closed', isValid: false, error: 'Job page explicitly reports this posting closed' };
                    }
                    return { status: 'valid', isValid: true };
                }
                // Anti-bot, authorization, throttling and server failures do not prove closure.
                return { status: 'unknown', isValid: false, error: `HTTP ${response.status}: unable to confirm availability` };
            }
            return { status: 'unknown', isValid: false, error: 'Too many redirects' };
        } catch (error: any) {
            if (error.code === 'UNSAFE_APPLICATION_ADDRESS' || error.cause?.code === 'UNSAFE_APPLICATION_ADDRESS') {
                return { status: 'unsafe', isValid: false, error: 'Application URL resolves to a non-public address' };
            }
            return { status: 'unknown', isValid: false, error: error.message || 'Availability check failed' };
        }
    }

    private checkJobClosed(html: unknown): boolean {
        if (typeof html !== 'string') return false;
        const $ = cheerio.load(html);
        // Script templates and generic prose such as "until this position is filled" are not closure evidence.
        $('script, style, template, noscript, nav, footer').remove();
        return $('h1, h2, [role="alert"]').toArray().some((element) => {
            const text = $(element).text().replace(/\s+/g, ' ').trim().toLowerCase();
            if (text.length > 300) return false;
            return /\b(this (job|position|posting|opportunity) (is |has )?(closed|no longer available|been filled)|no longer accepting applications|applications (are|have) closed|job not found)\b/.test(text);
        });
    }

    async verifyJob(jobId: string): Promise<JobVerificationOutcome> {
        const job = await this.prisma.job.findUnique({ where: { id: jobId } });
        if (!job || !job.isActive) return 'skipped';
        const verification = await this.verifyJobUrl(job.applyUrl);
        if (verification.status === 'valid') {
            await this.prisma.job.update({
                where: { id: jobId },
                data: { lastVerified: new Date(), verificationAttempts: 0, lastVerificationError: null },
            });
            return 'verified';
        }
        if (verification.status === 'unknown') {
            await this.prisma.job.update({
                where: { id: jobId },
                data: { lastVerified: new Date(), lastVerificationError: verification.error },
            });
            return 'inconclusive';
        }
        const attempts = job.verificationAttempts + 1;
        const markInactive = verification.status === 'unsafe' || attempts >= 3;
        await this.prisma.job.update({
            where: { id: jobId },
            data: {
                lastVerified: new Date(),
                verificationAttempts: attempts,
                lastVerificationError: verification.error,
                isActive: markInactive ? false : job.isActive,
            },
        });
        return markInactive ? 'markedInactive' : 'closurePending';
    }

    verifyAllActiveJobs() {
        if (this.activeRun) return this.activeRun;
        this.activeRun = this.runVerification().finally(() => { this.activeRun = undefined; });
        return this.activeRun;
    }

    private async runVerification() {
        const activeJobs = await this.prisma.job.findMany({
            where: { isActive: true, lastVerified: { lt: new Date(Date.now() - 20 * 60 * 60 * 1000) } },
            select: { id: true },
        });
        const results = { verified: 0, markedInactive: 0, errors: 0, inconclusive: 0 };
        const batchSize = 10;
        for (let i = 0; i < activeJobs.length; i += batchSize) {
            await Promise.all(activeJobs.slice(i, i + batchSize).map(async (job) => {
                try {
                    const outcome = await this.verifyJob(job.id);
                    if (outcome === 'verified') results.verified++;
                    else if (outcome === 'markedInactive') results.markedInactive++;
                    else if (outcome !== 'skipped') results.inconclusive++;
                } catch (error) {
                    this.logger.error(`Error verifying job ${job.id}`, error);
                    results.errors++;
                }
            }));
            if (i + batchSize < activeJobs.length) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        this.logger.log(`Verification complete: ${JSON.stringify(results)}`);
        return results;
    }
}
