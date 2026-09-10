import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';
import { providerRequestOptions, validPostedDate } from './provider-utils';

@Injectable()
export class AshbyScraper {
    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Documented public API: https://developers.ashbyhq.com/docs/public-job-posting-api
            const response = await axios.get(
                `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companyId)}`,
                providerRequestOptions,
            );
            const jobs = response.data?.jobs;
            if (!Array.isArray(jobs)) throw new Error('Unexpected Ashby response');
            return jobs.filter((job: any) => job.isListed !== false).map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Ashby scrape failed for ${companyId}:`, error.message);
            throw error;
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.title,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.isRemote ? (job.location ? `${job.location} · Remote` : 'Remote') : job.location || undefined,
            jobType: this.mapEmploymentType(job.employmentType),
            experienceLevel: this.inferExperienceLevel(job.title),
            degreeRequired: 'any',
            description: job.descriptionPlain || '',
            applyUrl: job.applyUrl || job.jobUrl,
            source: 'ashby',
            sourceId: job.id || job.jobUrl,
            postedDate: validPostedDate(job.publishedAt),
        };
    }

    private mapEmploymentType(type: string): string {
        if (type?.toLowerCase().includes('intern')) return 'internship';
        if (type?.toLowerCase().includes('contract')) return 'contract';
        if (type?.toLowerCase().includes('part')) return 'part-time';
        if (type?.toLowerCase().includes('temporary')) return 'temporary';
        return 'full-time';
    }

    private inferExperienceLevel(title: string): string {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('senior') || lowerTitle.includes('staff')) return '5+';
        if (lowerTitle.includes('junior')) return '1-3';
        if (lowerTitle.includes('intern')) return 'fresher';
        return '3-5';
    }
}
