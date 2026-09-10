const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function verifyMigrations() {
    const database = new PGlite();
    const checks = [];
    const migrations = resolve(__dirname, '../../prisma/migrations');
    const legacyJobs = [
        { id: 'english', title: 'Software Engineer', description: 'Build useful products.', location: 'Remote', company: 'OpenAI', active: true },
        { id: 'french', title: 'Ingénieur logiciel', description: 'Nous créons des outils.', location: 'Paris, France', company: 'Société Exemple', active: true },
        { id: 'chinese', title: '软件工程师', description: null, location: null, company: '示例公司', active: false },
    ];

    try {
        // Execute the committed PostgreSQL SQL, without a server or credentials.
        for (const directory of ['20260209121531_init', '20260210093624_add_job_verification_fields']) {
            await database.exec(readFileSync(resolve(migrations, directory, 'migration.sql'), 'utf8'));
        }
        await database.query('INSERT INTO users (id, email, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)', ['user-1', 'test@example.com']);
        for (const job of legacyJobs) {
            await database.query(`INSERT INTO jobs (id, title, description, location, company, is_active, apply_url, source, content_hash, verification_attempts)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'test', $1, 2)`,
                [job.id, job.title, job.description, job.location, job.company, job.active, `https://example.com/apply/${job.id}?tracking=kept`]);
        }
        await database.query('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)', ['user-1', 'french']);
        await database.exec(readFileSync(resolve(migrations, '20260910000000_english_job_publication/migration.sql'), 'utf8'));

        for (const job of legacyJobs) {
            const { rows: [stored] } = await database.query('SELECT * FROM jobs WHERE id = $1', [job.id]);
            const expected = {
                title: job.title, original_title: job.title,
                description: job.description, original_description: job.description,
                location: job.location, original_location: job.location,
                company: job.company, apply_url: `https://example.com/apply/${job.id}?tracking=kept`,
                is_active: job.active, verification_attempts: 2,
                translation_status: 'pending', translation_attempts: 0,
                translation_fingerprint: null, translated_at: null, translation_next_retry_at: null,
            };
            for (const [field, value] of Object.entries(expected)) assert.deepEqual(stored[field], value, `${job.id}.${field}`);
        }
        assert.deepEqual((await database.query('SELECT user_id, job_id FROM saved_jobs')).rows, [{ user_id: 'user-1', job_id: 'french' }]);
        checks.push('legacy-preservation');

        await database.query(`INSERT INTO jobs (id, title, company, apply_url, source, content_hash)
            VALUES ('new', 'New job', 'Example', 'https://example.com/new', 'test', 'new')`);
        assert.deepEqual((await database.query('SELECT translation_status, translation_attempts FROM jobs WHERE id = $1', ['new'])).rows,
            [{ translation_status: 'pending', translation_attempts: 0 }]);
        assert.deepEqual((await database.query("SELECT id FROM jobs WHERE is_active = true AND translation_status = 'ready'")).rows, []);
        await database.query("UPDATE jobs SET translation_status = 'ready' WHERE id IN ('english', 'chinese')");
        assert.deepEqual((await database.query("SELECT id FROM jobs WHERE is_active = true AND translation_status = 'ready'")).rows, [{ id: 'english' }]);
        checks.push('publication-readiness');

        await database.query(`INSERT INTO job_translation_cache (fingerprint, title, description, location, source_language, provider)
            VALUES ('same-source', 'Software Engineer', 'Build useful products.', 'Paris, France', 'fr', 'libretranslate')`);
        const { rows: [translation] } = await database.query('SELECT * FROM job_translation_cache WHERE fingerprint = $1', ['same-source']);
        assert.equal(translation.title, 'Software Engineer');
        assert.equal(translation.source_language, 'fr');
        assert.equal(translation.provider, 'libretranslate');
        assert.ok(translation.created_at);
        await assert.rejects(database.query(`INSERT INTO job_translation_cache (fingerprint, title, provider)
            VALUES ('same-source', 'Duplicate', 'google')`), { code: '23505' });
        checks.push('translation-cache-uniqueness');
    } finally {
        await database.close();
    }
    process.stdout.write(JSON.stringify({ checks }));
}

verifyMigrations().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
