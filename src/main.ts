import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
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

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const configService = app.get(ConfigService);
	const bootstrapLogger = new Logger('Bootstrap');
	const port = configService.get<number>('HTTP_PORT', 3002);
	const globalPrefix = 'user';

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

	const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS');
	app.enableCors({
		origin: allowedOrigins ? allowedOrigins.split(',') : false,
		credentials: true,
	});

	app.enableShutdownHooks();

	await app.startAllMicroservices();
	await app.listen(port);

	bootstrapLogger.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();
