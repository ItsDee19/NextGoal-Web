import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapersService } from './scrapers.service';
import { JobVerificationService } from '../jobs/job-verification.service';

@Injectable()
export class ScraperScheduler {
    private readonly logger = new Logger(ScraperScheduler.name);

    constructor(
        private scrapersService: ScrapersService,
        private jobVerificationService: JobVerificationService,
    ) {
        this.logger.log('Scraper scheduler initialized');
    }

    /**
     * Daily scraping job - runs at 2:00 AM every day
     */
    @Cron('0 2 * * *', {
        name: 'daily-scrape',
        timeZone: 'Asia/Kolkata',
    })
    async handleDailyScrape() {
        this.logger.log('Starting scheduled daily scrape...');
        const startTime = new Date();

        try {
            const results = await this.scrapersService.runFullScrape();
            const endTime = new Date();
            const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);

            this.logger.log(
                `Daily scrape completed in ${duration}s: ${results.total} jobs, ${results.successful} successful, ${results.failed} failed`,
            );
        } catch (error) {
            this.logger.error('Daily scrape failed', error);
        }
    }

    /**
     * Daily verification job - runs at 3:00 AM every day
     */
    @Cron('0 3 * * *', {
        name: 'daily-verification',
        timeZone: 'Asia/Kolkata',
    })
    async handleDailyVerification() {
        this.logger.log('Starting scheduled job verification...');
        const startTime = new Date();

        try {
            const results = await this.jobVerificationService.verifyAllActiveJobs();
            const endTime = new Date();
            const duration = ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2);

            this.logger.log(
                `Job verification completed in ${duration}s: ${results.verified} verified, ${results.markedInactive} marked inactive, ${results.errors} errors`,
            );
        } catch (error) {
            this.logger.error('Job verification failed', error);
        }
    }
}
