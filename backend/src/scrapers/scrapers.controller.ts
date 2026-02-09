import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScrapersService } from './scrapers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('scrapers')
@Controller('scrapers')
export class ScrapersController {
    constructor(private scrapersService: ScrapersService) { }

    @Post('run')
    @ApiOperation({ summary: 'Trigger a full scrape (admin only)' })
    async runScrape() {
        return this.scrapersService.runFullScrape();
    }

    @Post('company')
    @ApiOperation({ summary: 'Scrape a specific company' })
    @ApiQuery({ name: 'source', example: 'greenhouse' })
    @ApiQuery({ name: 'companyId', example: 'stripe' })
    async scrapeCompany(
        @Query('source') source: string,
        @Query('companyId') companyId: string,
    ) {
        const jobs = await this.scrapersService.scrapeCompany(source, companyId);
        const results = await this.scrapersService.processScrapedJobs(jobs);
        return {
            jobsFound: jobs.length,
            ...results,
        };
    }

    @Get('companies')
    @ApiOperation({ summary: 'Get list of sample companies' })
    getSampleCompanies() {
        return this.scrapersService.getSampleCompanies();
    }
}
