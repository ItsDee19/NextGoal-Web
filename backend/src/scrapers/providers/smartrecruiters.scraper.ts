import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';

@Injectable()
export class SmartRecruitersScraper {
    private baseUrl = 'https://api.smartrecruiters.com/v1/companies';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // SmartRecruiters has a public API
            const response = await axios.get(
                `${this.baseUrl}/${companyId}/postings`,
                {
                    params: {
                        limit: 100,
                    },
                    headers: {
                        'User-Agent': 'NextGoal Job Aggregator',
                    },
                },
            );

            const jobs = response.data?.content || [];

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`SmartRecruiters scrape failed for ${companyId}:`, error.message);
            return [];
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        const location = job.location?.city
            ? `${job.location.city}, ${job.location.country}`
            : 'Remote';

        return {
            title: job.name,
            company: job.company?.name || companyId,
            location,
            jobType: this.mapTypeOfEmployment(job.typeOfEmployment),
            experienceLevel: this.inferExperienceLevel(job.name, job.experienceLevel),
            degreeRequired: 'any',
            description: job.jobAd?.sections?.jobDescription?.text || '',
            applyUrl: job.applyUrl || `https://jobs.smartrecruiters.com/${companyId}/${job.id}`,
            source: 'smartrecruiters',
            sourceId: job.id,
            postedDate: job.releasedDate ? new Date(job.releasedDate) : new Date(),
        };
    }

    private mapTypeOfEmployment(type: any): string {
        const label = type?.label?.toLowerCase() || '';
        if (label.includes('intern')) return 'internship';
        if (label.includes('part')) return 'part-time';
        return 'full-time';
    }

    private inferExperienceLevel(title: string, level: any): string {
        const levelLabel = level?.label?.toLowerCase() || '';
        const lowerTitle = title.toLowerCase();

        if (levelLabel.includes('senior') || lowerTitle.includes('senior')) return '5+';
        if (levelLabel.includes('mid') || lowerTitle.includes('mid-level')) return '3-5';
        if (levelLabel.includes('junior') || lowerTitle.includes('junior')) return '1-3';
        if (levelLabel.includes('entry') || lowerTitle.includes('intern')) return 'fresher';

        return '3-5';
    }
}
