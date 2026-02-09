import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedJob } from '../interfaces/scraped-job.interface';

@Injectable()
export class GreenhouseScraper {
    private baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Greenhouse provides a public API
            const response = await axios.get(`${this.baseUrl}/${companyId}/jobs`, {
                headers: {
                    'User-Agent': 'NextGoal Job Aggregator (contact@example.com)',
                },
            });

            const jobs = response.data.jobs || [];

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Greenhouse scrape failed for ${companyId}:`, error.message);
            return [];
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.title,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.location?.name || 'Remote',
            jobType: this.inferJobType(job.title),
            experienceLevel: this.inferExperienceLevel(job.title),
            degreeRequired: 'any',
            description: this.cleanHtml(job.content || ''),
            applyUrl: job.absolute_url,
            source: 'greenhouse',
            sourceId: String(job.id),
            postedDate: job.updated_at ? new Date(job.updated_at) : new Date(),
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
