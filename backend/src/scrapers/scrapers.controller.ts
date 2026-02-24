import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScrapersService } from './scrapers.service';
import { JobVerificationService } from '../jobs/job-verification.service';
import { AiClassifierService } from './ai/ai-classifier.service';
import { JobsService } from '../jobs/jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('scrapers')
@Controller('scrapers')
export class ScrapersController {
    constructor(
        private scrapersService: ScrapersService,
        private jobVerificationService: JobVerificationService,
        private aiClassifier: AiClassifierService,
        private jobsService: JobsService,
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

    @Post('ai-classify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'AI-classify a specific job by ID' })
    @ApiQuery({ name: 'jobId', example: 'uuid-here' })
    async aiClassifyJob(@Query('jobId') jobId: string) {
        const job = await this.jobsService.findById(jobId);
        if (!job) {
            return { error: 'Job not found' };
        }

        const classification = await this.aiClassifier.classifyFromFields({
            title: job.title,
            company: job.company,
            location: job.location ?? undefined,
            description: job.description ?? undefined,
        });

        if (!classification) {
            return { error: 'AI classification failed or is disabled' };
        }

        // Update the job with AI-classified fields
        await this.jobsService.updateAiFields(jobId, classification);

        return { jobId, classification, updated: true };
    }

    @Post('reclassify-all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Re-classify all active jobs that have not been AI-classified yet' })
    async reclassifyAll() {
        const unclassified = await this.jobsService.findUnclassifiedJobs();
        const results = { total: unclassified.length, classified: 0, failed: 0 };

        for (const job of unclassified) {
            const classification = await this.aiClassifier.classifyFromFields({
                title: job.title,
                company: job.company,
                location: job.location ?? undefined,
                description: job.description ?? undefined,
            });

            if (classification) {
                await this.jobsService.updateAiFields(job.id, classification);
                results.classified++;
            } else {
                results.failed++;
            }
        }

        return results;
    }

    @Get('companies')
    @ApiOperation({ summary: 'Get list of companies configured for scraping' })
    getSampleCompanies() {
        return this.scrapersService.getSampleCompanies();
    }

    @Get('ai-status')
    @ApiOperation({ summary: 'Check if AI classification is enabled' })
    getAiStatus() {
        return {
            enabled: this.aiClassifier.isEnabled(),
            model: 'gemini-2.0-flash',
        };
    }
}
