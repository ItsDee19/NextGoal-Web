import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';
import { providerRequestOptions, validPostedDate } from './provider-utils';

@Injectable()
export class SmartRecruitersScraper {
    private baseUrl = 'https://api.smartrecruiters.com/v1/companies';

    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // SmartRecruiters has a public API
            const jobs: ScrapedJob[] = [];
            const seen = new Set<string>();
            let offset = 0;
            // Bound the scan so a broken upstream cannot create an infinite loop.
            for (let page = 0; page < 100; page++) {
                const response = await axios.get(`${this.baseUrl}/${encodeURIComponent(companyId)}/postings`, {
                    ...providerRequestOptions,
                    params: { limit: 100, offset },
                });
                const postings = response.data?.content;
                if (!Array.isArray(postings)) throw new Error('Unexpected SmartRecruiters response');
                if (!postings.length) return jobs;
                let added = 0;
                for (const posting of postings) {
                    if (!seen.has(String(posting.id))) {
                        jobs.push(this.parseJob(posting, companyId));
                        seen.add(String(posting.id));
                        added++;
                    }
                }
                if (!added) throw new Error('SmartRecruiters pagination made no progress');
                offset += postings.length;
                const total = Number(response.data.totalFound);
                if ((Number.isFinite(total) && offset >= total) || (!Number.isFinite(total) && postings.length < 100)) return jobs;
            }
            throw new Error('SmartRecruiters pagination exceeded 100 pages');
        } catch (error) {
            console.error(`SmartRecruiters scrape failed for ${companyId}:`, error.message);
            throw error;
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        const location = job.location?.city
            ? `${job.location.city}, ${job.location.country}`
            : undefined;

        return {
            title: job.name,
            company: job.company?.name || companyId,
            location,
            jobType: this.mapTypeOfEmployment(job.typeOfEmployment),
            experienceLevel: this.inferExperienceLevel(job.name, job.experienceLevel),
            degreeRequired: 'any',
            description: job.jobAd?.sections?.jobDescription?.text || '',
            applyUrl: job.applyUrl || job.jobAdUrl || (job.id ? `https://jobs.smartrecruiters.com/${encodeURIComponent(companyId)}/${encodeURIComponent(job.id)}` : ''),
            source: 'smartrecruiters',
            sourceId: job.id,
            postedDate: validPostedDate(job.releasedDate),
        };
    }

    private mapTypeOfEmployment(type: any): string {
        const label = type?.label?.toLowerCase() || '';
        if (label.includes('intern')) return 'internship';
        if (label.includes('part')) return 'part-time';
        if (label.includes('contract')) return 'contract';
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
