import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { GreenhouseScraper } from './providers/greenhouse.scraper';
import { LeverScraper } from './providers/lever.scraper';
import { WorkdayScraper } from './providers/workday.scraper';
import { AshbyScraper } from './providers/ashby.scraper';
import { SmartRecruitersScraper } from './providers/smartrecruiters.scraper';
import { JobsService } from '../jobs/jobs.service';
import { ScrapedJob } from './interfaces/scraped-job.interface';
import * as crypto from 'crypto';
import { normalizeApplicationUrl } from '../common/application-url';
import { CONFIGURED_BOARDS } from './configured-boards';
import { JobEnglishService } from '../translation/job-english.service';

const SCRAPE_LOCK = 'nextgoal:scraper:lock';
const LAST_COMPLETED = 'nextgoal:scraper:last-completed';
const LEASE_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ScrapeRunResult {
    total: number;
    added: number;
    updated: number;
    successful: number;
    failed: number;
    errors: number;
    englishReady: number;
    translationPending: number;
    skipped?: 'already-running' | 'not-due';
    companies: Array<{ source: string; companyId: string; jobsFound: number; errors: number; error?: string }>;
}

@Injectable()
export class ScrapersService {
    private readonly logger = new Logger(ScrapersService.name);
    private activeRun?: Promise<ScrapeRunResult>;

    constructor(
        @InjectQueue('scraper') private scraperQueue: Queue,
        private jobsService: JobsService,
        private greenhouseScraper: GreenhouseScraper,
        private leverScraper: LeverScraper,
        private workdayScraper: WorkdayScraper,
        private ashbyScraper: AshbyScraper,
        private smartRecruitersScraper: SmartRecruitersScraper,
        private englishService: JobEnglishService,
    ) { }

    async queueScrapeJob(source: string, companyId: string) {
        return this.scraperQueue.add('scrape', { source, companyId });
    }

    async scrapeCompany(source: string, companyId: string): Promise<ScrapedJob[]> {
        if (!companyId || !/^[a-zA-Z0-9_-]{1,100}$/.test(companyId)) throw new Error('Invalid company board identifier');
        switch (source) {
            case 'greenhouse':
                return this.greenhouseScraper.scrape(companyId);
            case 'lever':
                return this.leverScraper.scrape(companyId);
            case 'workday':
                return this.workdayScraper.scrape(companyId);
            case 'ashby':
                return this.ashbyScraper.scrape(companyId);
            case 'smartrecruiters':
                return this.smartRecruitersScraper.scrape(companyId);
            default:
                throw new Error(`Unknown source: ${source}`);
        }
    }

    generateContentHash(job: ScrapedJob): string {
        const content = `${job.title}|${job.company}|${job.location || ''}`.toLowerCase();
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64);
    }

    async processScrapedJobs(jobs: ScrapedJob[], assertRunActive: () => void = () => {}) {
        const results = {
            added: 0,
            updated: 0,
            errors: 0,
            englishReady: 0,
            translationPending: 0,
        };

        for (const job of jobs) {
            assertRunActive();
            try {
                const applyUrl = normalizeApplicationUrl(job.applyUrl);
                if (!applyUrl || !job.title?.trim() || !job.company?.trim()) {
                    throw new Error('Missing job details or unsafe application URL');
                }
                const contentHash = this.generateContentHash(job);

                // Check if this job already exists so we can count add vs update
                const existing = await this.jobsService.findByHash(contentHash);
                const english = await this.englishService.prepare(job, existing);

                assertRunActive();
                await this.jobsService.upsertByHash(contentHash, {
                    company: job.company,
                    jobType: job.jobType,
                    experienceLevel: job.experienceLevel,
                    degreeRequired: job.degreeRequired,
                    applyUrl,
                    source: job.source,
                    sourceId: job.sourceId,
                    postedDate: job.postedDate,
                    contentHash,
                    ...english,
                });

                if (english.translationStatus === 'ready') results.englishReady++;
                else results.translationPending++;

                if (existing) {
                    results.updated++;
                } else {
                    results.added++;
                }
            } catch (error) {
                this.logger.error(`Error processing job: ${job.title}`, error);
                results.errors++;
            }
        }

        this.logger.log(
            `processScrapedJobs: ${results.added} added, ${results.updated} updated, ${results.errors} errors`,
        );
        return results;
    }

    // Companies to scrape — Workday excluded (requires Playwright browser automation)
    getSampleCompanies(): Array<{ source: string; companyId: string }> {
        return CONFIGURED_BOARDS.map((board) => ({ ...board }));
    }

    runFullScrape(options: { onlyIfDue?: boolean } = {}): Promise<ScrapeRunResult> {
        if (this.activeRun) return this.activeRun;
        this.activeRun = this.runWithLease(options).finally(() => { this.activeRun = undefined; });
        return this.activeRun;
    }

    private async runWithLease(options: { onlyIfDue?: boolean }): Promise<ScrapeRunResult> {
        const results: ScrapeRunResult = {
            total: 0, added: 0, updated: 0, successful: 0, failed: 0, errors: 0, englishReady: 0, translationPending: 0, companies: [],
        };
        const redis = this.scraperQueue.client;
        const token = crypto.randomUUID();
        // Fail closed when Redis is unavailable: do not run uncoordinated duplicate collectors.
        const acquired = await redis.set(SCRAPE_LOCK, token, 'PX', LEASE_MS, 'NX');
        if (acquired !== 'OK') return { ...results, skipped: 'already-running' };
        let leaseLost = false;
        const refreshLease = async () => {
            try {
                const refreshed = await redis.eval(
                    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end',
                    1, SCRAPE_LOCK, token, LEASE_MS,
                );
                if (refreshed !== 1) leaseLost = true;
            } catch (error) {
                leaseLost = true;
                this.logger.error('Scrape lock renewal failed', error);
            }
        };
        const heartbeat = setInterval(() => { void refreshLease(); }, 60000);
        heartbeat.unref();
        try {
            if (options.onlyIfDue) {
                const lastCompleted = Number(await redis.get(LAST_COMPLETED));
                if (lastCompleted > 0 && Date.now() - lastCompleted < DAY_MS) {
                    return { ...results, skipped: 'not-due' };
                }
            }
            for (const company of this.getSampleCompanies()) {
                if (leaseLost) throw new Error('Scrape lock lost; stopping this run');
                try {
                    const jobs = await this.scrapeCompany(company.source, company.companyId);
                    if (leaseLost) throw new Error('Scrape lock lost before saving jobs');
                    const processed = await this.processScrapedJobs(jobs, () => {
                        if (leaseLost) throw new Error('Scrape lock lost while saving jobs');
                    });
                    results.total += jobs.length;
                    results.added += processed.added;
                    results.updated += processed.updated;
                    results.errors += processed.errors;
                    results.englishReady += processed.englishReady;
                    results.translationPending += processed.translationPending;
                    if (processed.errors) results.failed++;
                    else results.successful++;
                    results.companies.push({ ...company, jobsFound: jobs.length, errors: processed.errors });
                } catch (error: any) {
                    this.logger.error(`Failed to scrape ${company.companyId}:`, error);
                    results.failed++;
                    results.errors++;
                    results.companies.push({ ...company, jobsFound: 0, errors: 1, error: error.message || 'Source request failed' });
                }
            }
            if (leaseLost) throw new Error('Scrape lock lost before completion');
            // Record completed attempts, including partial results, without claiming all boards succeeded.
            const recorded = await redis.eval(
                'if redis.call("get", KEYS[1]) == ARGV[1] then redis.call("set", KEYS[2], ARGV[2]); return 1 else return 0 end',
                2, SCRAPE_LOCK, LAST_COMPLETED, token, String(Date.now()),
            );
            if (recorded !== 1) throw new Error('Scrape lock lost before recording completion');
            this.logger.log(`Scrape completed: ${JSON.stringify(results)}`);
            return results;
        } finally {
            clearInterval(heartbeat);
            await redis.eval(
                'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
                1, SCRAPE_LOCK, token,
            );
        }
    }
}
