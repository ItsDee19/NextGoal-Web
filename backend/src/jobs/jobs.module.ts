import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobVerificationService } from './job-verification.service';

@Module({
    controllers: [JobsController],
    providers: [JobsService, JobVerificationService],
    exports: [JobsService, JobVerificationService],
})
export class JobsModule { }
