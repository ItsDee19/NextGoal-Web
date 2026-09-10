/** Read-only public source probe. Never starts Nest, connects to a database, or submits applications. */
import 'reflect-metadata';
import axios from 'axios';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { CONFIGURED_BOARDS } from '../src/scrapers/configured-boards';
import { GreenhouseScraper } from '../src/scrapers/providers/greenhouse.scraper';
import { LeverScraper } from '../src/scrapers/providers/lever.scraper';
import { AshbyScraper } from '../src/scrapers/providers/ashby.scraper';
import { SmartRecruitersScraper } from '../src/scrapers/providers/smartrecruiters.scraper';
import { normalizeApplicationUrl } from '../src/common/application-url';

const adapters = {
    greenhouse: new GreenhouseScraper(),
    lever: new LeverScraper(),
    ashby: new AshbyScraper(),
    smartrecruiters: new SmartRecruitersScraper(),
};

async function main() {
    const startedAt = new Date().toISOString();
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 120000);
    const requests = new Map<string, number>();
    // Even a unexpectedly huge board cannot turn this inspection into a large crawl.
    axios.interceptors.request.use((request) => {
        const key = new URL(request.url!).pathname;
        const count = (requests.get(key) || 0) + 1;
        requests.set(key, count);
        if (count > 10) throw new Error('Read-only probe page limit reached (10 requests per board)');
        request.signal = deadline.signal;
        return request;
    });

    const jobs: any[] = [];
    const boards: any[] = [];
    const sampled = new Map<string, number>();
    const selectedBoards = process.argv[2]
        ? CONFIGURED_BOARDS.filter((board) => process.argv.slice(2).includes(board.companyId))
        : CONFIGURED_BOARDS;
    try {
        // Small batches bound traffic to three public boards at once.
        for (let i = 0; i < selectedBoards.length; i += 3) {
            await Promise.all(selectedBoards.slice(i, i + 3).map(async (board) => {
                try {
                    const found = await adapters[board.source].scrape(board.companyId);
                    const fetchedAt = new Date().toISOString();
                    const valid = found.filter((job) => normalizeApplicationUrl(job.applyUrl) && job.title?.trim());
                    const summary = { ...board, fetchedAt, jobsFound: found.length, usableJobs: valid.length, status: 'ok' };
                    boards.push(summary);
                    const remaining = 3 - (sampled.get(board.source) || 0);
                    for (const job of valid.slice(0, Math.max(0, remaining))) {
                        jobs.push({ ...job,
                            id: `probe-${createHash('sha256').update(`${job.source}|${job.applyUrl}`).digest('hex').slice(0, 16)}`,
                            sourceFetchedAt: fetchedAt,
                        });
                    }
                    sampled.set(board.source, Math.min(3, (sampled.get(board.source) || 0) + valid.length));
                    process.stdout.write(`${JSON.stringify(summary)}\n`);
                } catch (error: any) {
                    const summary = { ...board, fetchedAt: new Date().toISOString(), status: 'failed', httpStatus: error.response?.status, error: error.message };
                    boards.push(summary);
                    process.stdout.write(`${JSON.stringify(summary)}\n`);
                }
            }));
        }
    } finally {
        clearTimeout(timer);
    }
    const output = resolve(__dirname, '../../artifacts/live-jobs.json');
    await mkdir(resolve(__dirname, '../../artifacts'), { recursive: true });
    await writeFile(output, JSON.stringify({
        mode: 'read-only-public-source-probe', startedAt, fetchedAt: new Date().toISOString(),
        notice: 'Small inspection snapshot from public employer feeds. Application pages were not independently verified. Never use as a production fallback.',
        boards, jobs,
    }, null, 2));
    process.stdout.write(`Saved ${jobs.length} sampled jobs to ${output}\n`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
