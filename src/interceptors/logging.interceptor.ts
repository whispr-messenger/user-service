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
        const startTime = Date.now();

        // Log request
        this.logger.log(`Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    const outgoingMsg = `Outgoing Response: ${method} ${url}`;
                    const statusMsg = `Status: ${response.statusCode}`;
                    const durationMsg = `Duration: ${duration}ms`;
                    this.logger.log(`${outgoingMsg} - ${statusMsg} - ${durationMsg}`);
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const requestMsg = `Request Error: ${method} ${url}`;
                    const statusMsg = `Status: ${error.status || 500}`;
                    const durationMsg = `Duration: ${duration}ms - Error: ${error.message}`;
                    this.logger.error(`${requestMsg} - ${statusMsg}  - ${durationMsg}`);
                },
            })
        );
    }
}