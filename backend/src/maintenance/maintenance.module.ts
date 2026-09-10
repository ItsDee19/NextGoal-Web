import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { ScrapersCoreModule } from '../scrapers/scrapers-core.module';
import { validateMaintenanceEnvironment } from '../config/runtime.config';

/** Finite command-line worker. It has no HTTP server, cron timers or queue processor. */
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateMaintenanceEnvironment }),
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({ redis: config.get<string>('REDIS_URL')! }),
        }),
        PrismaModule,
        ScrapersCoreModule,
    ],
})
export class MaintenanceModule { }
