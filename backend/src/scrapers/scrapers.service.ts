import { Injectable } from '@nestjs/common';
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
                results.added++;
            } catch (error) {
                console.error(`Error processing job: ${job.title}`, error);
                results.errors++;
            }
        }

        return results;
    }

    // Sample company data for scraping
    getSampleCompanies() {
        return [
            { source: 'greenhouse', companyId: 'stripe' },
            { source: 'greenhouse', companyId: 'airbnb' },
            { source: 'greenhouse', companyId: 'coinbase' },
            { source: 'lever', companyId: 'netlify' },
            { source: 'lever', companyId: 'notion' },
            { source: 'ashby', companyId: 'ramp' },
            { source: 'smartrecruiters', companyId: 'visa' },
        ];
    }

    async runFullScrape() {
        const companies = this.getSampleCompanies();
        const results = {
            total: 0,
            successful: 0,
            failed: 0,
        };

        for (const company of companies) {
            try {
                const jobs = await this.scrapeCompany(company.source, company.companyId);
                await this.processScrapedJobs(jobs);
                results.successful++;
                results.total += jobs.length;
            } catch (error) {
                console.error(`Failed to scrape ${company.companyId}:`, error);
                results.failed++;
            }
        }

        // Expire jobs that haven't been verified recently
        await this.jobsService.expireStaleJobs(7);

        return results;
    }
}
