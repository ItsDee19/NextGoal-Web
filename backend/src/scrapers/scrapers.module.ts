import { Module } from '@nestjs/common';
import { ScrapersController } from './scrapers.controller';
import { ScraperProcessor } from './scraper.processor';
import { ScraperScheduler } from './scraper.scheduler';
import { ScrapersCoreModule } from './scrapers-core.module';
import { MaintenanceGuard } from '../common/maintenance.guard';

@Module({
    imports: [ScrapersCoreModule],
    controllers: [ScrapersController],
    providers: [
        ScraperProcessor,
        ScraperScheduler,
        MaintenanceGuard,
    ],
    exports: [ScrapersCoreModule],
})
export class ScrapersModule { }
