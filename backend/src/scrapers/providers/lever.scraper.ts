import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';

@Injectable()
export class LeverScraper {
    private baseUrl = 'https://api.lever.co/v0/postings';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Lever provides a public JSON endpoint
            const response = await axios.get(`${this.baseUrl}/${companyId}?mode=json`, {
                headers: {
                    'User-Agent': 'NextGoal Job Aggregator (contact@example.com)',
                },
            });

            const jobs = response.data || [];

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Lever scrape failed for ${companyId}:`, error.message);
            return [];
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.text,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.categories?.location || 'Remote',
            jobType: this.inferJobType(job.text, job.categories?.commitment),
            experienceLevel: this.inferExperienceLevel(job.text),
            degreeRequired: 'any',
            description: job.descriptionPlain || '',
            applyUrl: job.hostedUrl,
            source: 'lever',
            sourceId: job.id,
            postedDate: job.createdAt ? new Date(job.createdAt) : new Date(),
        };
    }

    private inferJobType(title: string, commitment?: string): string {
        if (commitment?.toLowerCase().includes('intern')) return 'internship';
        if (title.toLowerCase().includes('intern')) return 'internship';
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
