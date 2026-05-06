import { Logger } from '@nestjs/common';

/**
 * Contexte d'un évènement Redis (Stream ou Pub/Sub) pour la journalisation.
 *
 * - `stream` + `group` + `messageId` ciblent les Redis Streams (XADD/XACK).
 * - `channel` + `messageId` (dérivé du payload) ciblent le Pub/Sub.
 * - `correlationId` propage l'identifiant de corrélation amont s'il existe.
 */
export interface StreamLogContext {
	eventName: string;
	stream?: string;
	channel?: string;
	group?: string;
	messageId?: string;
	correlationId?: string;
}

const logger = new Logger('StreamEvent');

function formatLocator(ctx: StreamLogContext): string {
	const parts: string[] = [];
	if (ctx.stream) parts.push(`stream=${ctx.stream}`);
	if (ctx.channel) parts.push(`channel=${ctx.channel}`);
	if (ctx.group) parts.push(`group=${ctx.group}`);
	parts.push(`id=${ctx.messageId ?? '-'}`);
	parts.push(`corr=${ctx.correlationId ?? '-'}`);
	return parts.join(' ');
}

/**
 * Enveloppe un handler d'évènement Redis et émet trois lignes de log alignées
 * sur le format du `LoggingInterceptor` HTTP : `Incoming` à l'entrée,
 * `Processed` en succès (avec durée), `Failed` en erreur (durée + message).
 *
 * L'erreur éventuellement levée par `handler` est re-thrown afin de préserver
 * la sémantique du consommateur appelant (XACK conditionnel, retry, etc.).
 */
export async function withStreamLogging<T>(ctx: StreamLogContext, handler: () => Promise<T>): Promise<T> {
	const locator = formatLocator(ctx);
	const startTime = Date.now();
	logger.log(`Incoming ${ctx.eventName} ${locator}`);
	try {
		const result = await handler();
		const duration = Date.now() - startTime;
		logger.log(`Processed ${ctx.eventName} id=${ctx.messageId ?? '-'} ${duration}ms`);
		return result;
	} catch (err) {
		const duration = Date.now() - startTime;
		const message = err instanceof Error ? err.message : String(err);
		logger.error(`Failed ${ctx.eventName} id=${ctx.messageId ?? '-'} ${duration}ms message="${message}"`);
		throw err;
	}
}
