import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { TranslationModule } from '../src/translation/translation.module';
import { JobEnglishService } from '../src/translation/job-english.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, TranslationModule] })
class EnglishBackfillModule { }

async function main() {
    const args = process.argv.slice(2);
    const limitArgument = args.find((argument) => argument.startsWith('--limit='));
    const limit = args.includes('--all') ? Number.POSITIVE_INFINITY : Number(limitArgument?.split('=')[1] || 1000);
    if ((!Number.isSafeInteger(limit) || limit < 1) && limit !== Number.POSITIVE_INFINITY) throw new Error('--limit must be a positive integer');
    if (args.some((argument) => !['--all', '--force'].includes(argument) && !argument.startsWith('--limit='))) throw new Error('Use --all, --limit=N, or --force');
    // This context has no HTTP listener, scrape scheduler or Redis requirement.
    const application = await NestFactory.createApplicationContext(EnglishBackfillModule, { logger: ['error', 'warn'] });
    try {
        const result = await application.get(JobEnglishService).retryPending({ limit, force: args.includes('--force') });
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } finally { await application.close(); }
}

main().catch(() => { console.error('English backfill failed. Check database migration and translation configuration.'); process.exitCode = 1; });
