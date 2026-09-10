import { Controller, Get, Header } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    @Header('Cache-Control', 'no-store')
    health() {
        // Liveness only: repeated platform probes must not keep a sleeping database awake.
        return { status: 'ok', service: 'nextgoal-api' };
    }
}
