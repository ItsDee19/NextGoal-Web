import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsController } from './jobs.controller';
import { MaintenanceGuard } from '../common/maintenance.guard';

describe('JobsController verification access', () => {
    it('requires the operator guard before user authentication for manual verification', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, JobsController.prototype.verifyAllJobs)).toEqual([MaintenanceGuard, JwtAuthGuard]);
    });
});
