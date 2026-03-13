import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwksService } from './jwks.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
	providers: [JwksService, JwtStrategy],
	exports: [JwksService, PassportModule],
})
export class JwtAuthModule {}
