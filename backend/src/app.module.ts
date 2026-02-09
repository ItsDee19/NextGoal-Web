import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { ScrapersModule } from './scrapers/scrapers.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        BullModule.forRoot({
            redis: {
                host: 'localhost',
                port: 6379,
            },
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        JobsModule,
        ScrapersModule,
    ],
})
export class AppModule { }
