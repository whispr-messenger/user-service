import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TerminusModule } from '@nestjs/terminus';
import { JwksService } from './jwks.service';
import { JwtStrategy } from './jwt.strategy';
import { JwksHealthIndicator } from './jwks-health.indicator';

@Module({
	imports: [PassportModule.register({ defaultStrategy: 'jwt' }), TerminusModule],
	providers: [JwksService, JwtStrategy, JwksHealthIndicator],
	exports: [JwksService, PassportModule, JwksHealthIndicator],
})
export class JwtAuthModule {}
