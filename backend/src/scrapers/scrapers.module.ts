import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScrapersService } from './scrapers.service';
import { ScrapersController } from './scrapers.controller';
import { GreenhouseScraper } from './providers/greenhouse.scraper';
import { LeverScraper } from './providers/lever.scraper';
import { WorkdayScraper } from './providers/workday.scraper';
import { AshbyScraper } from './providers/ashby.scraper';
import { SmartRecruitersScraper } from './providers/smartrecruiters.scraper';
import { ScraperProcessor } from './scraper.processor';
import { JobsModule } from '../jobs/jobs.module';

@Module({
    imports: [
        JobsModule,
        BullModule.registerQueue({
            name: 'scraper',
        }),
    ],
    controllers: [ScrapersController],
    providers: [
        ScrapersService,
        ScraperProcessor,
        GreenhouseScraper,
        LeverScraper,
        WorkdayScraper,
        AshbyScraper,
        SmartRecruitersScraper,
    ],
    exports: [ScrapersService],
})
export class ScrapersModule { }
