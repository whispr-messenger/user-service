import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
	protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
		if (context.getType() !== 'http') {
			return true;
		}

		return super.shouldSkip(context);
	}
}
