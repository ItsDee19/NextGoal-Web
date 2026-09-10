import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';
import { providerRequestOptions, validPostedDate } from './provider-utils';

@Injectable()
export class LeverScraper {
    private baseUrl = 'https://api.lever.co/v0/postings';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Lever provides a public JSON endpoint
            const response = await axios.get(`${this.baseUrl}/${encodeURIComponent(companyId)}?mode=json`, providerRequestOptions);

            const jobs = response.data;
            if (!Array.isArray(jobs)) throw new Error('Unexpected Lever response');

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Lever scrape failed for ${companyId}:`, error.message);
            throw error;
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.text,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.categories?.location || undefined,
            jobType: this.inferJobType(job.text, job.categories?.commitment),
            experienceLevel: this.inferExperienceLevel(job.text),
            degreeRequired: 'any',
            description: job.descriptionPlain || '',
            applyUrl: job.applyUrl || job.hostedUrl,
            source: 'lever',
            sourceId: job.id,
            postedDate: validPostedDate(job.createdAt),
        };
    }

    private inferJobType(title: string, commitment?: string): string {
        if (commitment?.toLowerCase().includes('intern')) return 'internship';
        if (title.toLowerCase().includes('intern')) return 'internship';
        if (commitment?.toLowerCase().includes('part')) return 'part-time';
        if (commitment?.toLowerCase().includes('contract')) return 'contract';
        return 'full-time';
    }

    private inferExperienceLevel(title: string): string {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('senior') || lowerTitle.includes('staff') || lowerTitle.includes('lead')) {
            return '5+';
        }
        if (lowerTitle.includes('junior') || lowerTitle.includes('associate')) {
            return '1-3';
        }
        if (lowerTitle.includes('intern') || lowerTitle.includes('entry')) {
            return 'fresher';
        }
        return '3-5';
    }
}
