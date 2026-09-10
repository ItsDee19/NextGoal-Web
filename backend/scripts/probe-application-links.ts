/** Four read-only requests. No database access, application submission, or path guessing. */
import 'reflect-metadata';
import axios from 'axios';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JobVerificationService } from '../src/jobs/job-verification.service';

async function main() {
    const snapshot = JSON.parse(await readFile(resolve(__dirname, '../../artifacts/live-jobs.json'), 'utf8'));
    const selected = new Map<string, string>();
    for (const job of snapshot.jobs) {
        if (!selected.has(job.source)) selected.set(job.source, job.applyUrl);
    }
    const forbiddenDatabase = new Proxy({}, { get: () => { throw new Error('Database access is forbidden in this probe'); } });
    const verifier = new JobVerificationService(forbiddenDatabase as any);
    let requests = 0;
    let httpStatus: number | undefined;
    let challengeDetected = false;
    axios.interceptors.request.use((request) => {
        if (requests >= 1) throw new Error('Probe request limit: redirect was not followed');
        requests++;
        return request;
    });
    axios.interceptors.response.use((response) => {
        httpStatus = response.status;
        const title = typeof response.data === 'string' ? response.data.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '' : '';
        challengeDetected = /just a moment|access denied|attention required|verify (you are|that you are) human/i.test(title);
        return response;
    });
    const results = [];
    for (const [source, url] of [...selected.entries()].slice(0, 4)) {
        requests = 0;
        httpStatus = undefined;
        challengeDetected = false;
        const outcome = await verifier.verifyJobUrl(url);
        const result = {
            source, url, checkedAt: new Date().toISOString(), httpStatus, requestsMade: requests,
            ...(challengeDetected ? { status: 'unknown', isValid: false, error: 'A bot challenge prevented confirming availability' } : outcome),
        };
        results.push(result);
        process.stdout.write(`${JSON.stringify(result)}\n`);
    }
    await writeFile(resolve(__dirname, '../../artifacts/application-link-probe.json'), JSON.stringify({
        checkedAt: new Date().toISOString(), mode: 'read-only-public-application-link-probe',
        notice: 'One GET per source, four requests maximum. Redirects are reported as inconclusive to preserve this bound. HTTP reachability does not guarantee an employer accepts applications.',
        totalRequests: results.reduce((total, result) => total + result.requestsMade, 0), results,
    }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
