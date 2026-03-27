import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwksService } from './jwks.service';
import { JwtStrategy } from './jwt.strategy';
import { JwksHealthIndicator } from './jwks-health.indicator';

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
	providers: [JwksService, JwtStrategy, JwksHealthIndicator],
	exports: [JwksService, PassportModule, JwksHealthIndicator],
})
export class JwtAuthModule {}
