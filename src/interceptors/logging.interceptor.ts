import { randomUUID } from 'crypto';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// WHISPR-1068 : propage le request_id via header, format JSON cohérent avec
// JsonLogger. Les lignes de log ne sont plus des chaînes libres mais une
// string + objet structuré — JsonLogger les sérialise en JSON.
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

		this.logger.log({
			event: 'http_request',
			request_id: requestId,
			method,
			url,
			ip,
			user_agent: userAgent,
		});

		return next.handle().pipe(
			tap({
				next: () => {
					const duration = Date.now() - startTime;
					this.logger.log({
						event: 'http_response',
						request_id: requestId,
						method,
						url,
						status: response.statusCode,
						duration_ms: duration,
					});
				},
				error: (error) => {
					const duration = Date.now() - startTime;
					this.logger.error({
						event: 'http_error',
						request_id: requestId,
						method,
						url,
						status: error.status || 500,
						duration_ms: duration,
						error_message: error.message,
					});
				},
			})
		);
	}
}
