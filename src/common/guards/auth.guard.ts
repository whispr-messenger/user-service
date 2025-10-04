import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // SECURITY WARNING: This is a placeholder implementation
    // TODO: Implement actual JWT validation with proper token verification
    // This currently allows all requests with any token - NOT SECURE
    console.warn('⚠️  AuthGuard: Using placeholder implementation - implement JWT validation before production');
    return true;
  }
}