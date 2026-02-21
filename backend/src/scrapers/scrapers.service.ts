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

@Injectable()
export class ScrapersService {
    private readonly logger = new Logger(ScrapersService.name);

    constructor(
        @InjectQueue('scraper') private scraperQueue: Queue,
        private jobsService: JobsService,
        private greenhouseScraper: GreenhouseScraper,
        private leverScraper: LeverScraper,
        private workdayScraper: WorkdayScraper,
        private ashbyScraper: AshbyScraper,
        private smartRecruitersScraper: SmartRecruitersScraper,
    ) { }

    async queueScrapeJob(source: string, companyId: string) {
        return this.scraperQueue.add('scrape', { source, companyId });
    }

    async scrapeCompany(source: string, companyId: string): Promise<ScrapedJob[]> {
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

    async processScrapedJobs(jobs: ScrapedJob[]) {
        const results = {
            added: 0,
            updated: 0,
            errors: 0,
        };

        for (const job of jobs) {
            try {
                const contentHash = this.generateContentHash(job);

                // Check if this job already exists so we can count add vs update
                const existing = await this.jobsService.findByHash(contentHash);

                await this.jobsService.upsertByHash(contentHash, {
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    jobType: job.jobType,
                    experienceLevel: job.experienceLevel,
                    degreeRequired: job.degreeRequired,
                    description: job.description,
                    applyUrl: job.applyUrl,
                    source: job.source,
                    sourceId: job.sourceId,
                    postedDate: job.postedDate,
                    contentHash,
                });

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
    getSampleCompanies() {
        return [
            { source: 'greenhouse', companyId: 'stripe' },
            { source: 'greenhouse', companyId: 'airbnb' },
            { source: 'greenhouse', companyId: 'coinbase' },
            { source: 'greenhouse', companyId: 'databricks' },
            { source: 'greenhouse', companyId: 'discord' },
            { source: 'lever', companyId: 'netlify' },
            { source: 'lever', companyId: 'notion' },
            { source: 'lever', companyId: 'vercel' },
            { source: 'ashby', companyId: 'ramp' },
            { source: 'ashby', companyId: 'retool' },
            { source: 'smartrecruiters', companyId: 'visa' },
        ];
    }

    async runFullScrape() {
        const companies = this.getSampleCompanies();
        const results = {
            total: 0,
            added: 0,
            updated: 0,
            successful: 0,
            failed: 0,
        };

        for (const company of companies) {
            try {
                const jobs = await this.scrapeCompany(company.source, company.companyId);
                const processed = await this.processScrapedJobs(jobs);
                results.successful++;
                results.total += jobs.length;
                results.added += processed.added;
                results.updated += processed.updated;
            } catch (error) {
                this.logger.error(`Failed to scrape ${company.companyId}:`, error);
                results.failed++;
            }
        }

        // Expire jobs that haven't been verified recently (7 days)
        const expired = await this.jobsService.expireStaleJobs(7);
        this.logger.log(
            `runFullScrape complete — scraped: ${results.total}, added: ${results.added}, updated: ${results.updated}, expired: ${(expired as any).count ?? 'unknown'}`,
        );

        return results;
    }
}
