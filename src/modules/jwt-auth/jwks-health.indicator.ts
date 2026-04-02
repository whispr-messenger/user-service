import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { JwksService } from './jwks.service';

@Injectable()
export class JwksHealthIndicator {
	constructor(
		private readonly healthIndicatorService: HealthIndicatorService,
		private readonly jwksService: JwksService
	) {}

	check(key: string): HealthIndicatorResult {
		const indicator = this.healthIndicatorService.check(key);

		if (this.jwksService.isReady) {
			return indicator.up();
		}

		return indicator.down({ message: 'JWKS keys not loaded' });
	}
}
