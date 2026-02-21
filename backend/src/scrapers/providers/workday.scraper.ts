import { Injectable, Logger } from '@nestjs/common';
import { ScrapedJob } from '../interfaces/scraped-job.interface';

@Injectable()
export class WorkdayScraper {
    private readonly logger = new Logger(WorkdayScraper.name);

    // Workday sites are highly dynamic and require full browser automation (Playwright).
    // This scraper is a placeholder. To implement it:
    //   1. Install @playwright/test
    //   2. Launch a headless browser, navigate to the Workday job page
    //   3. Wait for [data-automation-id="jobResults"] and extract listings
    async scrape(companyId: string): Promise<ScrapedJob[]> {
        this.logger.warn(
            `WorkdayScraper: scraping for "${companyId}" is not yet implemented — Playwright browser automation required. Returning empty list.`,
        );
        return [];
    }
}
