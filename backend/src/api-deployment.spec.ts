import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { PrismaService } from './prisma/prisma.service';
import { ScraperScheduler } from './scrapers/scraper.scheduler';
import { ScrapersService } from './scrapers/scrapers.service';
import { configureHttpApp } from './config/configure-http-app';

describe('hosted HTTP API deployment', () => {
    let app: INestApplication;
    let baseUrl: string;
    const previous = { ...process.env };
    const database = { $connect: jest.fn(), $disconnect: jest.fn(), $queryRaw: jest.fn(), job: { findMany: jest.fn() } };

    beforeAll(async () => {
        process.env.APP_MODE = 'api';
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'a-valid-test-secret-with-at-least-32-characters';
        process.env.FRONTEND_URL = 'https://nextgoal.vercel.app,https://preview.vercel.app';
        process.env.DATABASE_URL = 'postgresql://test:test@unused.example/nextgoal';
        process.env.DIRECT_URL = 'postgresql://test:test@unused.example/nextgoal';
        delete process.env.REDIS_URL;
        delete process.env.PORT;
        const { AppModule } = await import('./app.module');
        const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(database).compile();
        app = module.createNestApplication({ logger: false });
        configureHttpApp(app);
        await app.listen(0, '127.0.0.1');
        baseUrl = await app.getUrl();
    }, 30000);

    afterAll(async () => {
        if (app) await app.close();
        for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
        Object.assign(process.env, previous);
    });

    it('boots the real application module without Redis, scraper services or scheduler providers', () => {
        expect(() => app.get(getQueueToken('scraper'))).toThrow();
        expect(() => app.get(ScrapersService)).toThrow();
        expect(() => app.get(ScraperScheduler)).toThrow();
    });

    it('answers repeated health probes without querying or reconnecting the database', async () => {
        for (let probe = 0; probe < 2; probe++) {
            const response = await fetch(`${baseUrl}/health`);
            expect(response.status).toBe(200);
            expect(response.headers.get('cache-control')).toBe('no-store');
            expect(await response.json()).toEqual({ status: 'ok', service: 'nextgoal-api' });
        }
        expect(database.$connect).not.toHaveBeenCalled();
        expect(database.$queryRaw).not.toHaveBeenCalled();
        expect(database.job.findMany).not.toHaveBeenCalled();
    });

    it.each(['/scrapers/run', '/scrapers/company?source=greenhouse&companyId=stripe', '/scrapers/verify', '/jobs/verify-all'])(
        'does not expose costly maintenance work at %s', async (route) => {
            const response = await fetch(`${baseUrl}${route}`, { method: 'POST', headers: { Authorization: 'Bearer ordinary-user-token' } });
            expect(response.status).toBe(404);
            expect(database.job.findMany).not.toHaveBeenCalled();
        },
    );

    it.each(['https://nextgoal.vercel.app', 'https://preview.vercel.app'])('allows the exact configured browser origin %s', async (origin) => {
        const response = await fetch(`${baseUrl}/health`, { headers: { Origin: origin } });
        expect(response.headers.get('access-control-allow-origin')).toBe(origin);
        expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('does not grant CORS access to unconfigured or lookalike deployments', async () => {
        const response = await fetch(`${baseUrl}/health`, { headers: { Origin: 'https://nextgoal.vercel.app.attacker.example' } });
        expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });
});
