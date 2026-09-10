import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureHttpApp } from './config/configure-http-app';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { abortOnError: false });

    try {
        configureHttpApp(app);

        // Swagger API documentation
        const config = new DocumentBuilder()
            .setTitle('NextGoal API')
            .setDescription('Job Aggregation Platform API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);

        const port = Number(process.env.PORT || 3001);
        await app.listen(port, '0.0.0.0');
        console.log(`NextGoal API listening on port ${port}`);
    } catch (error) {
        await app.close();
        throw error;
    }
}

void bootstrap().catch(() => {
    console.error('NextGoal API could not start. Check the required environment variables and database availability.');
    process.exitCode = 1;
});
