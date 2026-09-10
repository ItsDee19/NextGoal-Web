import { appMode, frontendOrigins, validateHttpEnvironment, validateMaintenanceEnvironment } from './runtime.config';

const production = {
    NODE_ENV: 'production', APP_MODE: 'api',
    DATABASE_URL: 'postgresql://user:password@db.example/nextgoal',
    DIRECT_URL: 'postgresql://user:password@direct.example/nextgoal',
    JWT_SECRET: 'a-valid-test-secret-with-at-least-32-characters',
    FRONTEND_URL: 'https://nextgoal.vercel.app',
};

describe('deployment configuration', () => {
    it('defaults to combined local operation and accepts HTTP-only mode', () => {
        expect(appMode({})).toBe('combined');
        expect(appMode({ APP_MODE: 'api' })).toBe('api');
        expect(() => appMode({ APP_MODE: 'worker' })).toThrow('APP_MODE');
    });
    it('accepts production API configuration without Redis or translation credentials', () => {
        expect(validateHttpEnvironment(production)).toEqual(production);
    });
    it('requires Redis for a production combined server', () => {
        expect(() => validateHttpEnvironment({ ...production, APP_MODE: 'combined' })).toThrow('REDIS_URL');
    });
    it.each(['', 'short-secret', 'your-super-secret-jwt-key-change-in-production'])(
        'rejects missing, weak or placeholder JWT secrets (%s)', (JWT_SECRET) => {
            expect(() => validateHttpEnvironment({ ...production, JWT_SECRET })).toThrow('JWT_SECRET');
        },
    );
    it.each(['DATABASE_URL', 'DIRECT_URL'])('requires a valid production %s without revealing its value', (name) => {
        const badValue = 'https://private-user:private-password@example.test';
        try { validateHttpEnvironment({ ...production, [name]: badValue }); throw new Error('Expected validation failure'); }
        catch (error: any) {
            expect(error.message).toContain(name);
            expect(error.message).not.toContain('private');
        }
    });
    it('normalizes and deduplicates explicitly configured origins', () => {
        expect(frontendOrigins(' https://nextgoal.vercel.app,https://preview.vercel.app,https://nextgoal.vercel.app ', true))
            .toEqual(['https://nextgoal.vercel.app', 'https://preview.vercel.app']);
    });
    it.each(['', 'http://nextgoal.vercel.app', 'https://*.vercel.app', 'https://nextgoal.vercel.app/',
        'https://nextgoal.vercel.app/path', 'https://user:password@nextgoal.vercel.app', 'https://nextgoal.vercel.app,']) (
        'rejects unsafe or ambiguous production origins (%s)', (origin) => {
            expect(() => frontendOrigins(origin, true)).toThrow('FRONTEND_URL');
        },
    );
    it.each(['0', '65536', 'abc', '1.5'])('rejects invalid listener PORT %s', (PORT) => {
        expect(() => validateHttpEnvironment({ ...production, PORT })).toThrow('PORT');
    });
    it('validates a standalone worker without JWT or frontend requirements', () => {
        const worker = { DATABASE_URL: production.DATABASE_URL, DIRECT_URL: production.DIRECT_URL, REDIS_URL: 'rediss://default:secret@redis.example:6379' };
        expect(validateMaintenanceEnvironment(worker)).toEqual(worker);
        expect(() => validateMaintenanceEnvironment({ ...worker, REDIS_URL: 'https://redis-rest.example' })).toThrow('REDIS_URL');
    });
});
