import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class MaintenanceGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const expected = this.config.get<string>('MAINTENANCE_SECRET');
        // Public API deployments never execute background work, even with an operator token.
        // An unset operator secret also keeps these endpoints disabled in combined mode.
        if (this.config.get<string>('APP_MODE') === 'api' || !expected || expected.length < 32) throw new NotFoundException();
        const provided: unknown = context.switchToHttp().getRequest().headers['x-maintenance-secret'];
        if (typeof provided !== 'string' || Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
            !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
            throw new UnauthorizedException('An operator maintenance secret is required');
        }
        return true;
    }
}
