import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsController } from './jobs.controller';

describe('JobsController verification access', () => {
    it('requires authentication before starting a manual verification run', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, JobsController.prototype.verifyAllJobs)).toContain(JwtAuthGuard);
    });
});
