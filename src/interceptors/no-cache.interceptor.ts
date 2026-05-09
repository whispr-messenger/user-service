import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';

// no-store global pour eviter cache PII via proxy/CDN/browser shared cache (WHISPR-1413).
// NestJS et helmet n'emettent pas de Cache-Control par defaut, donc tout intermediaire
// peut servir une reponse d'un user a un autre.
@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const res = context.switchToHttp().getResponse<Response>();
		res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
		res.setHeader('Pragma', 'no-cache');
		res.setHeader('Expires', '0');
		return next.handle();
	}
}
