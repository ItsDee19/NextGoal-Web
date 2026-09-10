import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

describe('English publication PostgreSQL migration', () => {
    let checks: string[];

    beforeAll(async () => {
        // PGlite loads WASM with dynamic imports. A native Node child keeps those
        // outside Jest's VM without imposing runtime flags on the test suite.
        const { stdout } = await promisify(execFile)(process.execPath, [resolve(__dirname, 'migration-check.cjs')], {
            cwd: resolve(__dirname, '../..'), timeout: 60000, windowsHide: true, maxBuffer: 2 * 1024 * 1024,
        });
        checks = JSON.parse(stdout).checks;
    }, 65000);

    it('preserves legacy text, company names, application URLs, saved jobs, and verification state', () => {
        expect(checks).toContain('legacy-preservation');
    });

    it('keeps unchecked legacy and new jobs outside the public readiness predicate', () => {
        expect(checks).toContain('publication-readiness');
    });

    it('stores reusable translations under unique fingerprints', () => {
        expect(checks).toContain('translation-cache-uniqueness');
    });
});
