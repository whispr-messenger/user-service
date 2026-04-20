import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './modules/app.module';
import { createSwaggerDocumentation } from './swagger';
import { LoggingInterceptor } from './interceptors';

const logger = new Logger('UnhandledErrors');

process.on('unhandledRejection', (reason: Error | any) => {
	logger.error('Unhandled Promise Rejection:', reason?.stack || reason);
});

process.on('uncaughtException', (error: Error) => {
	logger.error('Uncaught Exception:', error.stack);
});

export async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const configService = app.get(ConfigService);
	const bootstrapLogger = new Logger('Bootstrap');
	const port = configService.get<number>('HTTP_PORT', 3002);
	const globalPrefix = 'user';

	const swaggerEnabled = configService.get<string>('SWAGGER_ENABLED', 'true') !== 'false';

	app.use(
		helmet({
			contentSecurityPolicy: swaggerEnabled
				? {
						directives: {
							defaultSrc: ["'self'"],
							scriptSrc: ["'self'", "'unsafe-inline'"],
							styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
							imgSrc: ["'self'", 'data:'],
						},
					}
				: undefined,
			crossOriginEmbedderPolicy: swaggerEnabled ? false : undefined,
		})
	);
	app.use(compression());

	// Raise body size limit to accept base64 thumbnails carried on
	// blocked-image appeal submissions (evidence.thumbnailBase64). NestJS /
	// express defaults to 100kb which is rejected as 413 for ~200KB payloads.
	app.use(json({ limit: '2mb' }));
	app.use(urlencoded({ limit: '2mb', extended: true }));

	app.setGlobalPrefix(globalPrefix);

	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
		prefix: 'v',
	});

	createSwaggerDocumentation(app, port, configService, globalPrefix);

	app.connectMicroservice<MicroserviceOptions>({
		transport: Transport.REDIS,
		options: {
			host: configService.get<string>('REDIS_HOST', 'localhost'),
			port: configService.get<number>('REDIS_PORT', 6379),
			username: configService.get<string>('REDIS_USERNAME'),
			password: configService.get<string>('REDIS_PASSWORD'),
		},
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		})
	);

	app.useGlobalInterceptors(new LoggingInterceptor());

	const corsEnabled = configService.get<string>('ENABLE_CORS') === 'true';
	if (corsEnabled) {
		const rawOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', '');
		const allowedOrigins = rawOrigins
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean);
		app.enableCors({
			origin: allowedOrigins.length > 0 ? allowedOrigins : false,
			credentials: true,
		});
	}

	app.enableShutdownHooks();

	await app.startAllMicroservices();
	await app.listen(port);

	bootstrapLogger.log(`Application is running on: http://0.0.0.0:${port}`);
}
