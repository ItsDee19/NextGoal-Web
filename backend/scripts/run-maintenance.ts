import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ScrapersService } from '../src/scrapers/scrapers.service';
import { JobEnglishService } from '../src/translation/job-english.service';
import { JobVerificationService } from '../src/jobs/job-verification.service';
import { parseMaintenanceOptions, runMaintenance } from '../src/maintenance/run-maintenance';

async function main() {
    const options = parseMaintenanceOptions(process.argv.slice(2));
    // ConfigModule validates at import time; reject bad CLI input before loading its async configuration.
    const { MaintenanceModule } = await import('../src/maintenance/maintenance.module');
    // This process has no HTTP listener, authentication, queue processor or in-process scheduler.
    // Avoid emitting raw connection errors or provider request objects into public Actions logs.
    // Explicit init keeps an application handle for cleanup even if the initial database connection fails.
    // Never call listen(): the HTTP adapter remains unused.
    const application = await NestFactory.create(MaintenanceModule, { logger: false, abortOnError: false });
    const result = await runMaintenance({
        initialize: async () => { await application.init(); },
        refresh: () => application.get(ScrapersService).runFullScrape(),
        translate: (translationOptions) => application.get(JobEnglishService).retryPending(translationOptions),
        verify: () => application.get(JobVerificationService).verifyAllActiveJobs(),
        close: () => application.close(),
    }, options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.success) process.exitCode = 1;
}

main().catch(() => {
    console.error('Maintenance could not start. Check CLI arguments, database migrations and connection configuration.');
    process.exitCode = 1;
});
