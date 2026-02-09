import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ScrapersService } from './scrapers.service';

@Processor('scraper')
export class ScraperProcessor {
    constructor(private scrapersService: ScrapersService) { }

    @Process('scrape')
    async handleScrape(job: Job<{ source: string; companyId: string }>) {
        const { source, companyId } = job.data;
        console.log(`Processing scrape job: ${source}/${companyId}`);

        try {
            const jobs = await this.scrapersService.scrapeCompany(source, companyId);
            const results = await this.scrapersService.processScrapedJobs(jobs);
            console.log(`Completed scrape for ${companyId}: ${results.added} jobs`);
            return results;
        } catch (error) {
            console.error(`Scrape failed for ${companyId}:`, error);
            throw error;
        }
    }
}
