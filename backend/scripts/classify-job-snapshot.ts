import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessEnglish, englishLocationText, plainJobText } from '../src/translation/english-language';

// Offline evidence only: assess the original bounded source snapshot without contacting a provider or database.
const artifactDirectory = resolve(__dirname, '../../artifacts');
const snapshot = JSON.parse(readFileSync(resolve(artifactDirectory, 'live-jobs.json'), 'utf8'));
const jobs = snapshot.jobs.map((job: { source: string; title: string; description?: string; location?: string }) => {
    const fields = {
        title: assessEnglish(plainJobText(job.title), 'title'),
        description: assessEnglish(plainJobText(job.description), 'description'),
        location: assessEnglish(englishLocationText(job.location), 'location'),
    };
    const outcome = Object.values(fields).every((verdict) => verdict === 'english') ? 'ready'
        : Object.values(fields).includes('foreign') ? 'translation-required' : 'uncertain';
    return { source: job.source, title: job.title, fields, outcome };
});
const results = {
    mode: 'offline-original-source-language-assessment',
    assessedAt: new Date().toISOString(),
    sourceFetchedAt: snapshot.fetchedAt,
    notice: 'Conservative local assessment of 12 original source samples. No translation provider or database was used. An uncertain or translation-required outcome is retained for translation, not published as English. This is not a complete source census or a proof of language accuracy.',
    counts: {
        total: jobs.length,
        ready: jobs.filter((job: { outcome: string }) => job.outcome === 'ready').length,
        uncertain: jobs.filter((job: { outcome: string }) => job.outcome === 'uncertain').length,
        translationRequired: jobs.filter((job: { outcome: string }) => job.outcome === 'translation-required').length,
    },
    jobs,
};
writeFileSync(resolve(artifactDirectory, 'english-language-probe.json'), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
