import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwksService } from './jwks.service';

export interface JwtPayload {
	sub: string;
	iat?: number;
	exp?: number;
	[key: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly jwksService: JwksService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKeyProvider: jwksService.getSecretProvider(),
			algorithms: ['ES256'],
		});
	}

	validate(payload: JwtPayload): JwtPayload {
		return payload;
	}
}
