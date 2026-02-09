import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ScrapedJob } from '../interfaces/scraped-job.interface';

@Injectable()
export class AshbyScraper {
    async scrape(companyId: string): Promise<ScrapedJob[]> {
        try {
            // Ashby provides a GraphQL-like API
            const response = await axios.post(
                `https://jobs.ashbyhq.com/api/non-user-graphql`,
                {
                    operationName: 'ApiJobBoardWithTeams',
                    variables: {
                        organizationHostedJobsPageName: companyId,
                    },
                    query: `
            query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
              jobBoard: jobBoardWithTeams(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
              ) {
                jobPostings {
                  id
                  title
                  locationName
                  employmentType
                  jobPostingBriefUrl: jobPostingUrl
                  publishedAt
                }
              }
            }
          `,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'NextGoal Job Aggregator',
                    },
                },
            );

            const jobs = response.data?.data?.jobBoard?.jobPostings || [];

            return jobs.map((job: any) => this.parseJob(job, companyId));
        } catch (error) {
            console.error(`Ashby scrape failed for ${companyId}:`, error.message);
            return [];
        }
    }

    private parseJob(job: any, companyId: string): ScrapedJob {
        return {
            title: job.title,
            company: companyId.charAt(0).toUpperCase() + companyId.slice(1),
            location: job.locationName || 'Remote',
            jobType: this.mapEmploymentType(job.employmentType),
            experienceLevel: this.inferExperienceLevel(job.title),
            degreeRequired: 'any',
            description: '',
            applyUrl: `https://jobs.ashbyhq.com/${companyId}/${job.id}`,
            source: 'ashby',
            sourceId: job.id,
            postedDate: job.publishedAt ? new Date(job.publishedAt) : new Date(),
        };
    }

    private mapEmploymentType(type: string): string {
        if (type?.toLowerCase().includes('intern')) return 'internship';
        if (type?.toLowerCase().includes('contract')) return 'contract';
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
