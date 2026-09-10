import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ScrapersModule } from './scrapers/scrapers.module';
import { ApiModule } from './api.module';
import { appMode, validateHttpEnvironment } from './config/runtime.config';

// ConfigModule loads .env before mode selection, including for local development.
const configuration = ConfigModule.forRoot({ isGlobal: true, validate: validateHttpEnvironment });
const backgroundModules = appMode() === 'api' ? [] : [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({ redis: config.get<string>('REDIS_URL') || 'redis://localhost:6379' }),
    }),
    ScrapersModule,
];

@Module({
    imports: [configuration, ApiModule, ...backgroundModules],
})
export class AppModule { }
