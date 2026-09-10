import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScrapersService } from './scrapers.service';
import { JobVerificationService } from '../jobs/job-verification.service';
import { JobEnglishService } from '../translation/job-english.service';

@Injectable()
export class ScraperScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(ScraperScheduler.name);

    constructor(
        private scrapersService: ScrapersService,
        private jobVerificationService: JobVerificationService,
        private englishService: JobEnglishService,
    ) {
        this.logger.log('Scraper scheduler initialized');
    }

    onApplicationBootstrap() {
        // Launch after application initialization without delaying HTTP startup on source APIs.
        void this.handleCatchUp();
        void this.handleTranslationRetry();
    }

    @Cron('0 4 * * *', { name: 'english-publication-retry', timeZone: 'Asia/Kolkata', waitForCompletion: true })
    async handleTranslationRetry() {
        try {
            await this.englishService.retryPending();
        } catch (error) {
            this.logger.error('English publication retry failed; pending originals remain stored', error);
        }
    }

    @Cron('30 * * * *', { name: 'scrape-catch-up', timeZone: 'Asia/Kolkata', waitForCompletion: true })
    async handleCatchUp() {
        try {
            const results = await this.scrapersService.runFullScrape({ onlyIfDue: true });
            if (!results.skipped) this.logger.log(`Catch-up scrape: ${results.total} jobs, ${results.failed} failed boards`);
        } catch (error) {
            this.logger.error('Catch-up scrape failed; the next hourly check will retry', error);
        }
    }

    /**
     * Daily scraping job - runs at 2:00 AM every day
     */
    @Cron('0 2 * * *', {
        name: 'daily-scrape',
        timeZone: 'Asia/Kolkata',
        waitForCompletion: true,
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
        waitForCompletion: true,
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
