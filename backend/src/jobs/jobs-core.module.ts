import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobVerificationService } from './job-verification.service';

@Module({
    providers: [JobsService, JobVerificationService],
    exports: [JobsService, JobVerificationService],
})
export class JobsCoreModule { }
