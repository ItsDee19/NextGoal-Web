import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScrapersService } from './scrapers.service';
import { ScrapersController } from './scrapers.controller';
import { GreenhouseScraper } from './providers/greenhouse.scraper';
import { LeverScraper } from './providers/lever.scraper';
import { WorkdayScraper } from './providers/workday.scraper';
import { AshbyScraper } from './providers/ashby.scraper';
import { SmartRecruitersScraper } from './providers/smartrecruiters.scraper';
import { AiClassifierService } from './ai/ai-classifier.service';
import { ScraperProcessor } from './scraper.processor';
import { ScraperScheduler } from './scraper.scheduler';
import { JobsModule } from '../jobs/jobs.module';

@Module({
    imports: [
        ConfigModule,
        JobsModule,
        BullModule.registerQueue({
            name: 'scraper',
        }),
    ],
    controllers: [ScrapersController],
    providers: [
        ScrapersService,
        ScraperProcessor,
        ScraperScheduler,
        GreenhouseScraper,
        LeverScraper,
        WorkdayScraper,
        AshbyScraper,
        SmartRecruitersScraper,
        AiClassifierService,
    ],
    exports: [ScrapersService],
})
export class ScrapersModule { }
