import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { JwtAuthModule } from '../jwt-auth/jwt-auth.module';

@Module({
	imports: [JwtAuthModule],
	controllers: [HealthController],
})
export class HealthModule {}
