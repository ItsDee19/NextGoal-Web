import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedJob } from '../interfaces/scraped-job.interface';
import { providerRequestOptions, validPostedDate } from './provider-utils';

@Injectable()
export class GreenhouseScraper {
    private baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Greenhouse provides a public API
            const response = await axios.get(`${this.baseUrl}/${encodeURIComponent(companyId)}/jobs`, {
                ...providerRequestOptions,
                params: { content: true },
            });

            const jobs = response.data?.jobs;
            if (!Array.isArray(jobs)) throw new Error('Unexpected Greenhouse response');

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Greenhouse scrape failed for ${companyId}:`, error.message);
            throw error;
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.title,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.location?.name || undefined,
            jobType: this.inferJobType(job.title),
            experienceLevel: this.inferExperienceLevel(job.title),
            degreeRequired: 'any',
            description: this.cleanHtml(job.content || ''),
            applyUrl: job.absolute_url,
            source: 'greenhouse',
            sourceId: String(job.id),
            postedDate: validPostedDate(job.updated_at),
        };
    }

    private inferJobType(title: string): string {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('intern')) return 'internship';
        return 'full-time';
    }

    private inferExperienceLevel(title: string): string {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('senior') || lowerTitle.includes('staff') || lowerTitle.includes('principal')) {
            return '5+';
        }
        if (lowerTitle.includes('junior') || lowerTitle.includes('associate')) {
            return '1-3';
        }
        if (lowerTitle.includes('intern') || lowerTitle.includes('graduate') || lowerTitle.includes('entry')) {
            return 'fresher';
        }
        return '3-5';
    }

    private cleanHtml(html: string): string {
        const $ = cheerio.load(html);
        return $.text().trim().substring(0, 5000);
    }
}
