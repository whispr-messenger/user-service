#!/usr/bin/env node

import * as http from 'http';

interface RequestOptions {
	hostname: string;
	port: number;
	path: string;
	method: string;
	timeout: number;
}

const timestamp = () => new Date().toISOString();

const options: RequestOptions = {
	hostname: 'localhost',
	port: 3001,
	path: '/health/ready',
	method: 'GET',
	timeout: 3000,
};

console.log(`[${timestamp()}] Health check starting...`);
console.log(
	`[${timestamp()}] Target: ${options.method} http://${options.hostname}:${options.port}${options.path}`
);
console.log(`[${timestamp()}] Timeout: ${options.timeout}ms`);

const req = http.request(options, (res: http.IncomingMessage) => {
	console.log(`[${timestamp()}] Response received with status code: ${res.statusCode}`);

	let body = '';
	res.on('data', (chunk) => {
		body += chunk;
	});

	res.on('end', () => {
		console.log(`[${timestamp()}] Response body: ${body}`);

		if (res.statusCode === 200) {
			console.log(`[${timestamp()}] ✓ Health check PASSED`);
			process.exit(0);
		} else {
			console.error(`[${timestamp()}] ✗ Health check FAILED: Invalid status code ${res.statusCode}`);
			process.exit(1);
		}
	});
});

req.on('error', (err: Error) => {
	console.error(`[${timestamp()}] ✗ Health check FAILED: Request error`);
	console.error(`[${timestamp()}] Error details: ${err.message}`);
	console.error(`[${timestamp()}] Error stack: ${err.stack}`);
	process.exit(1);
});

req.on('timeout', () => {
	console.error(`[${timestamp()}] ✗ Health check FAILED: Request timeout after ${options.timeout}ms`);
	req.destroy();
	process.exit(1);
});

req.end();
