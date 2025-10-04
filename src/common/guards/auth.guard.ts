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

    // SECURITY WARNING: This guard currently accepts any non-empty token
    // TODO: Implement proper JWT validation including:
    // - Signature verification
    // - Expiry validation
    // - Audience/scope validation
    // - Token format validation (Bearer prefix)
    console.warn(
      'AuthGuard: Using placeholder authentication - implement proper JWT validation before production',
    );
    return true;
  }
}
