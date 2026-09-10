import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MaintenanceGuard } from './maintenance.guard';

const secret = 'a-private-operator-secret-at-least-32-characters';
function guard(config: Record<string, string>) { return new MaintenanceGuard(new ConfigService(config)); }
function request(value?: unknown): any { return { switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-maintenance-secret': value } }) }) }; }

describe('operator maintenance access', () => {
    it('always rejects hosted API maintenance before authentication, even with the correct operator secret', () => {
        expect(() => guard({ APP_MODE: 'api', MAINTENANCE_SECRET: secret }).canActivate(request(secret))).toThrow(NotFoundException);
    });
    it.each(['', 'short'])('disables maintenance if the operator secret is absent or too short', (MAINTENANCE_SECRET) => {
        expect(() => guard({ APP_MODE: 'combined', MAINTENANCE_SECRET }).canActivate(request(secret))).toThrow(NotFoundException);
    });
    it.each([undefined, 'wrong', [secret], 'a-private-operator-secret-at-least-32-characterz'])('rejects a missing or invalid operator header', (header) => {
        expect(() => guard({ MAINTENANCE_SECRET: secret }).canActivate(request(header))).toThrow(UnauthorizedException);
    });
    it('accepts the exact operator secret in combined mode', () => {
        expect(guard({ APP_MODE: 'combined', MAINTENANCE_SECRET: secret }).canActivate(request(secret))).toBe(true);
    });
});
