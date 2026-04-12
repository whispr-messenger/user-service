import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, SecretOrKeyProvider, Strategy } from 'passport-jwt';
import { JwksService } from './jwks.service';
import { UserRepository } from '../common/repositories/user.repository';

export interface JwtPayload {
	sub: string;
	iat?: number;
	exp?: number;
	[key: string]: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly jwksService: JwksService,
		private readonly configService: ConfigService,
		private readonly userRepository: UserRepository
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKeyProvider: jwksService.getSecretProvider() as unknown as SecretOrKeyProvider,
			algorithms: ['ES256'],
			issuer: configService.getOrThrow<string>('JWT_ISSUER'),
			audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
		});
	}

	async validate(payload: JwtPayload): Promise<JwtPayload> {
		const user = await this.userRepository.findById(payload.sub);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		if (!user.isActive) {
			throw new UnauthorizedException('User account is inactive');
		}

		return payload;
	}
}
