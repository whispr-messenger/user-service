import { randomUUID } from 'crypto';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LoggingInterceptor.name);

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const { method, url, ip } = request;
		const userAgent = request.get('User-Agent') || '';
		const raw = request.get('X-Request-Id') || '';
		const requestId = /^[a-zA-Z0-9-]{1,64}$/.test(raw) ? raw : randomUUID();
		const startTime = Date.now();

		response.setHeader('X-Request-Id', requestId);

		this.logger.log(
			`[${requestId}] Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`
		);

		return next.handle().pipe(
			tap({
				next: () => {
					const duration = Date.now() - startTime;
					this.logger.log(
						`[${requestId}] Outgoing Response: ${method} ${url} - Status: ${response.statusCode} - Duration: ${duration}ms`
					);
				},
				error: (error) => {
					const duration = Date.now() - startTime;
					this.logger.error(
						`[${requestId}] Request Error: ${method} ${url} - Status: ${error.status || 500} - Duration: ${duration}ms - Error: ${error.message}`
					);
				},
			})
		);
	}
}
