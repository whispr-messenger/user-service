import type { LoggerService, LogLevel } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

// WHISPR-1068: logger minimaliste qui sérialise chaque ligne en JSON pour
// permettre à Loki/ELK de parser les logs sans regex fragile. Utilise `pid`
// de process + un `logger_id` stable par instance pour corréler les pods.
export class JsonLogger implements LoggerService {
	private static readonly LEVEL_ORDER: Record<LogLevel, number> = {
		verbose: 0,
		debug: 1,
		log: 2,
		warn: 3,
		error: 4,
		fatal: 5,
	};

	private readonly loggerId = randomUUID();
	private readonly service: string;
	private readonly minLevel: LogLevel;

	constructor(opts: { service?: string; level?: LogLevel } = {}) {
		this.service = opts.service ?? process.env.SERVICE_NAME ?? 'user-service';
		this.minLevel = opts.level ?? this.parseLevel(process.env.LOG_LEVEL);
	}

	private parseLevel(value?: string): LogLevel {
		const normalized = (value ?? 'log').toLowerCase() as LogLevel;
		return normalized in JsonLogger.LEVEL_ORDER ? normalized : 'log';
	}

	private shouldEmit(level: LogLevel): boolean {
		return JsonLogger.LEVEL_ORDER[level] >= JsonLogger.LEVEL_ORDER[this.minLevel];
	}

	private emit(level: LogLevel, message: unknown, context: string | undefined, trace?: unknown): void {
		if (!this.shouldEmit(level)) return;

		const payload: Record<string, unknown> = {
			timestamp: new Date().toISOString(),
			level,
			service: this.service,
			logger_id: this.loggerId,
			pid: process.pid,
			context: context ?? this.service,
			message: this.stringifyMessage(message),
		};

		if (trace !== undefined) {
			payload.trace = typeof trace === 'string' ? trace : this.stringifyMessage(trace);
		}

		const stream =
			level === 'error' || level === 'fatal' || level === 'warn' ? process.stderr : process.stdout;
		stream.write(JSON.stringify(payload) + '\n');
	}

	private stringifyMessage(value: unknown): string {
		if (value instanceof Error) {
			return value.message;
		}
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	log(message: unknown, context?: string): void {
		this.emit('log', message, context);
	}

	error(message: unknown, trace?: unknown, context?: string): void {
		this.emit('error', message, context, trace);
	}

	warn(message: unknown, context?: string): void {
		this.emit('warn', message, context);
	}

	debug(message: unknown, context?: string): void {
		this.emit('debug', message, context);
	}

	verbose(message: unknown, context?: string): void {
		this.emit('verbose', message, context);
	}

	fatal(message: unknown, context?: string): void {
		this.emit('fatal', message, context);
	}
}
