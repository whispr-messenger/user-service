import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';

function buildSwaggerDocument(port: number) {
    return new DocumentBuilder()
        .setTitle('User Service')
        .setDescription('API documentation for the User Service')
        .setVersion('1.0')
        .addServer(`http://localhost:${port}`, 'Development')
        .addServer('https://whispr.epitech-msc2026.me', 'Production')
        .build();
}

function createSwaggerCustomOptions(): SwaggerCustomOptions {
    return {
        useGlobalPrefix: true,
    };
}

export function createSwaggerDocumentation(
    app: NestExpressApplication,
    port: number,
    configService: ConfigService,
    globalPrefix?: string
) {
    const logger = new Logger('Swagger');
    const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', true);

    if (!swaggerEnabled) {
        logger.log('Swagger documentation is disabled');
        return;
    }

    const swaggerRoute = [globalPrefix, 'swagger'].filter(Boolean).join('/');

    const config = buildSwaggerDocument(port);
    const documentFactory = () =>
        SwaggerModule.createDocument(app, config, {
            ignoreGlobalPrefix: false,
        });

    const swaggerCustomOptions = createSwaggerCustomOptions();

    SwaggerModule.setup('swagger', app, documentFactory, swaggerCustomOptions);

    logger.log(`Swagger documentation available at: http://0.0.0.0:${port}/${swaggerRoute}`);
}
