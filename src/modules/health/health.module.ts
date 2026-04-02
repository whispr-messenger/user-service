import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';
import { JwtAuthModule } from '../jwt-auth/jwt-auth.module';

@Module({
	imports: [TerminusModule, JwtAuthModule],
	controllers: [HealthController],
	providers: [RedisHealthIndicator],
})
export class HealthModule {}
