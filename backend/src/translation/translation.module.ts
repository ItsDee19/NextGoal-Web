import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JobEnglishService } from './job-english.service';
import { TranslationClient } from './translation-client.service';

@Module({
    imports: [ConfigModule],
    providers: [TranslationClient, JobEnglishService],
    exports: [JobEnglishService],
})
export class TranslationModule { }
