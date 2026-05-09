import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhooksRepository } from '../repositories/webhooks.repository';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { Webhook } from '../entities/webhook.entity';

// timestamp pose cote serveur dans dispatch(): un caller ne peut pas le forcer (anti-replay) (WHISPR-1408)
export interface WebhookEvent {
	type: string;
	data: Record<string, any>;
}

// payload signe envoye au receiver: timestamp server-side, les receivers DOIVENT rejeter > 5 min
export interface SignedWebhookPayload extends WebhookEvent {
	timestamp: string;
}

const DISPATCH_TIMEOUT_MS = 5000;

@Injectable()
export class WebhooksService {
	private readonly logger = new Logger(WebhooksService.name);

	constructor(private readonly webhooksRepository: WebhooksRepository) {}

	async register(dto: CreateWebhookDto, createdBy: string): Promise<Webhook> {
		return this.webhooksRepository.create({
			url: dto.url,
			events: dto.events,
			secret: dto.secret || null,
			active: true,
			createdBy,
		});
	}

	async list(opts: { take?: number; skip?: number } = {}): Promise<Webhook[]> {
		return this.webhooksRepository.findAll(opts);
	}

	async remove(id: string): Promise<void> {
		const deleted = await this.webhooksRepository.delete(id);
		if (!deleted) {
			throw new NotFoundException('Webhook not found');
		}
	}

	async dispatch(event: WebhookEvent): Promise<void> {
		const webhooks = await this.webhooksRepository.findActiveByEvent(event.type);
		// timestamp force cote serveur: ignore tout champ caller-supplied pour bloquer le replay (WHISPR-1408)
		const signedPayload: SignedWebhookPayload = {
			type: event.type,
			data: event.data,
			timestamp: new Date().toISOString(),
		};
		const payload = JSON.stringify(signedPayload);

		const dispatches = webhooks.map(async (webhook) => {
			try {
				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
					'X-Webhook-Event': event.type,
				};

				if (webhook.secret) {
					const signature = createHmac('sha256', webhook.secret).update(payload).digest('hex');
					headers['X-Webhook-Signature'] = `sha256=${signature}`;
				}

				// timeout dur sur fetch: pas de pile-up de Promises sur URL hung (WHISPR-1408)
				await fetch(webhook.url, {
					method: 'POST',
					headers,
					body: payload,
					signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
				});
			} catch (error) {
				this.logger.warn(
					`Failed to dispatch webhook ${webhook.id} to ${webhook.url}: ${(error as Error).message}`
				);
			}
		});

		await Promise.allSettled(dispatches);
	}
}
