import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScrapersService } from './scrapers.service';
import { JobVerificationService } from '../jobs/job-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('scrapers')
@Controller('scrapers')
export class ScrapersController {
    constructor(
        private scrapersService: ScrapersService,
        private jobVerificationService: JobVerificationService,
    ) { }

    @Post('run')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Trigger a full scrape (authenticated users only)' })
    async runScrape() {
        return this.scrapersService.runFullScrape();
    }

    @Post('company')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Scrape a specific company (authenticated users only)' })
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

    @Post('verify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Trigger job verification run (authenticated users only)' })
    async runVerification() {
        return this.jobVerificationService.verifyAllActiveJobs();
    }

    @Get('companies')
    @ApiOperation({ summary: 'Get list of companies configured for scraping' })
    getSampleCompanies() {
        return this.scrapersService.getSampleCompanies();
    }
}
