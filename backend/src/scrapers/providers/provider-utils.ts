import { AxiosRequestConfig } from 'axios';

export const providerRequestOptions: AxiosRequestConfig = {
    timeout: 15000,
    maxContentLength: 20 * 1024 * 1024,
    headers: { 'User-Agent': 'NextGoal Job Aggregator' },
};

export function validPostedDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}
