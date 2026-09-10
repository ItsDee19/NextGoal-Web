import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsCoreModule } from './jobs-core.module';
import { MaintenanceGuard } from '../common/maintenance.guard';

@Module({
    imports: [JobsCoreModule],
    controllers: [JobsController],
    providers: [MaintenanceGuard],
    exports: [JobsCoreModule],
})
export class JobsModule { }
