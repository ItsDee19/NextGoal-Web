import { INestApplication, ValidationPipe } from '@nestjs/common';
import { frontendOrigins } from './runtime.config';

export function configureHttpApp(app: INestApplication, env: NodeJS.ProcessEnv = process.env) {
    app.enableCors({ origin: frontendOrigins(env.FRONTEND_URL, env.NODE_ENV === 'production'), credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.enableShutdownHooks();
}
