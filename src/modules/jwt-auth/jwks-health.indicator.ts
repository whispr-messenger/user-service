import { Injectable } from '@nestjs/common';
import { JwksService } from './jwks.service';

export interface HealthIndicatorResult {
	jwks: {
		status: 'up' | 'down';
	};
}

@Injectable()
export class JwksHealthIndicator {
	constructor(private readonly jwksService: JwksService) {}

	check(): HealthIndicatorResult {
		return {
			jwks: {
				status: this.jwksService.isReady ? 'up' : 'down',
			},
		};
	}
}
