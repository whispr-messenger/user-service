import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhooksRepository } from '../repositories/webhooks.repository';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { Webhook } from '../entities/webhook.entity';

export interface WebhookEvent {
	type: string;
	timestamp: string;
	data: Record<string, any>;
}

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

	async list(): Promise<Webhook[]> {
		return this.webhooksRepository.findAll();
	}

	async remove(id: string): Promise<void> {
		const deleted = await this.webhooksRepository.delete(id);
		if (!deleted) {
			throw new NotFoundException('Webhook not found');
		}
	}

	async dispatch(event: WebhookEvent): Promise<void> {
		const webhooks = await this.webhooksRepository.findActiveByEvent(event.type);
		const payload = JSON.stringify(event);

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

				await fetch(webhook.url, {
					method: 'POST',
					headers,
					body: payload,
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
