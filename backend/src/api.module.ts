import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health.controller';

/** The hosted HTTP graph deliberately has no Redis, queues, providers or schedules. */
@Module({
    imports: [PrismaModule, AuthModule, UsersModule, JobsModule],
    controllers: [HealthController],
})
export class ApiModule { }
