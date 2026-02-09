export interface ScrapedJob {
    title: string;
    company: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    degreeRequired?: string;
    description?: string;
    applyUrl: string;
    source: string;
    sourceId?: string;
    postedDate?: Date;
}
