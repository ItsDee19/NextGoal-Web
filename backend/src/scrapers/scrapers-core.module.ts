import { Injectable, Logger, Module } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ScrapersService } from './scrapers.service';
import { GreenhouseScraper } from './providers/greenhouse.scraper';
import { LeverScraper } from './providers/lever.scraper';
import { WorkdayScraper } from './providers/workday.scraper';
import { AshbyScraper } from './providers/ashby.scraper';
import { SmartRecruitersScraper } from './providers/smartrecruiters.scraper';
import { JobsCoreModule } from '../jobs/jobs-core.module';
import { TranslationModule } from '../translation/translation.module';

@Injectable()
class ScraperQueueEvents {
    constructor(@InjectQueue('scraper') queue: Queue) {
        const logger = new Logger(ScraperQueueEvents.name);
        // Queue errors can otherwise surface raw connection credentials in worker logs.
        queue.on('error', () => logger.error('The scraper Redis connection failed; check REDIS_URL and service availability'));
    }
}

@Module({
    imports: [JobsCoreModule, TranslationModule, BullModule.registerQueue({ name: 'scraper' })],
    providers: [ScrapersService, ScraperQueueEvents, GreenhouseScraper, LeverScraper, WorkdayScraper, AshbyScraper, SmartRecruitersScraper],
    exports: [ScrapersService, BullModule, JobsCoreModule, TranslationModule],
})
export class ScrapersCoreModule { }
