#!/usr/bin/env ts-node

/** Docker E2E Test Runner
* 
* This script:
* 1. Checks if Docker and Docker Compose are available
* 2. Starts the development Docker stack if not running
* 3. Waits for all services to be healthy
* 4. Runs the e2e tests
* 5. Optionally stops the stack after tests(--cleanup flag)
*/

import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const COMPOSE_FILE = path.join(__dirname, '../../docker/dev/compose.yml');
const COMPOSE_DIR = path.join(__dirname, '../../docker/dev');
const MAX_WAIT_TIME = 120000; // 2 minutes
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgCyan: '\x1b[46m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function error(message: string) {
    log(`${colors.bgRed}${colors.white} ERROR ${colors.reset} ${message}`, colors.red);
}

function success(message: string) {
    log(`${colors.bgGreen}${colors.white} SUCCESS ${colors.reset} ${message}`, colors.green);
}

function info(message: string) {
    log(`${colors.bgCyan}${colors.white} INFO ${colors.reset} ${message}`, colors.cyan);
}

function warning(message: string) {
    log(`${colors.bgYellow}${colors.white} WARNING ${colors.reset} ${message}`, colors.yellow);
}

/**
 * Check if Docker is available
 */
function checkDocker(): boolean {
    try {
        execSync('docker --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if Docker Compose is available
 */
function checkDockerCompose(): boolean {
    try {
        execSync('docker compose version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if .env file exists in docker/dev
 */
function checkEnvFile(): boolean {
    const envPath = path.join(COMPOSE_DIR, '.env');
    return fs.existsSync(envPath);
}

/**
 * Check if Node.js version is >= 20
 */
function checkNodeVersion(): boolean {
    const version = process.versions.node;
    const [major] = version.split('.').map(Number);
    return major >= 20;
}

/**
 * Check if Docker Compose stack is running
 */
function isStackRunning(): boolean {
    try {
        const output = execSync(`docker compose -f ${COMPOSE_FILE} ps --format json`, {
            cwd: COMPOSE_DIR,
            encoding: 'utf-8',
        });

        if (!output.trim()) {
            return false;
        }

        const containers = output
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));

        // Check if all required services are running
        const requiredServices = ['postgres', 'redis', 'user-service'];
        const runningServices = containers
            .filter((c) => c.State === 'running')
            .map((c) => c.Service);

        return requiredServices.every((service) => runningServices.includes(service));
    } catch {
        return false;
    }
}

/**
 * Check if all services are healthy
 */
function areServicesHealthy(): boolean {
    try {
        const output = execSync(`docker compose -f ${COMPOSE_FILE} ps --format json`, {
            cwd: COMPOSE_DIR,
            encoding: 'utf-8',
        });

        if (!output.trim()) {
            return false;
        }

        const containers = output
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));

        // Check if all containers are healthy or running (some may not have health checks)
        return containers.every(
            (c) => c.State === 'running' && (c.Health === 'healthy' || c.Health === undefined)
        );
    } catch {
        return false;
    }
}

/**
 * Start Docker Compose stack
 */
function startStack(): void {
    info('Starting Docker Compose stack...');
    try {
        execSync(`docker compose -f ${COMPOSE_FILE} up -d`, {
            cwd: COMPOSE_DIR,
            stdio: 'inherit',
        });
        success('Docker Compose stack started');
    } catch (err) {
        error('Failed to start Docker Compose stack');
        throw err;
    }
}

/**
 * Stop Docker Compose stack
 */
function stopStack(): void {
    info('Stopping Docker Compose stack...');
    try {
        execSync(`docker compose -f ${COMPOSE_FILE} down`, {
            cwd: COMPOSE_DIR,
            stdio: 'inherit',
        });
        success('Docker Compose stack stopped');
    } catch (err) {
        error('Failed to stop Docker Compose stack');
        throw err;
    }
}

/**
 * Wait for services to be healthy
 */
async function waitForHealthy(): Promise<void> {
    info('Waiting for services to be healthy...');
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_TIME) {
        if (areServicesHealthy()) {
            success('All services are healthy');
            return;
        }

        // Show progress
        process.stdout.write('.');
        await sleep(HEALTH_CHECK_INTERVAL);
    }

    console.log(); // New line after dots
    throw new Error('Timeout waiting for services to be healthy');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        const timer = globalThis.setTimeout(resolve, ms);
        return timer;
    });
}

/**
 * Run e2e tests
 */
function runTests(): number {
    info('Running e2e tests...');
    try {
        const child = spawn('npm', ['run', 'test:e2e:docker:run'], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            shell: true,
        });

        return new Promise<number>((resolve) => {
            child.on('close', (code) => {
                if (code === 0) {
                    success('Tests passed!');
                } else {
                    error(`Tests failed with exit code ${code}`);
                }
                resolve(code || 0);
            });
        }) as any;
    } catch (err) {
        error('Failed to run tests');
        throw err;
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const shouldCleanup = args.includes('--cleanup') || args.includes('-c');

    log('\n🚀 Docker E2E Test Runner\n', colors.bold + colors.magenta);


    // Pre-flight checks
    if (!checkNodeVersion()) {
        error('Node.js version 20 or higher is required.');
        warning(`Current version: ${process.versions.node}`);
        process.exit(1);
    }

    if (!checkDocker()) {
        error('Docker is not available. Please install Docker first.');
        process.exit(1);
    }

    if (!checkDockerCompose()) {
        error('Docker Compose is not available. Please install Docker Compose first.');
        process.exit(1);
    }

    if (!checkEnvFile()) {
        error('.env file not found in docker/dev directory.');
        warning('Please create a .env file with the required environment variables.');
        process.exit(1);
    }

    // Check if stack is already running
    const wasRunning = isStackRunning();

    if (wasRunning) {
        info('Docker Compose stack is already running');
    } else {
        startStack();
    }

    try {
        // Wait for services to be healthy
        await waitForHealthy();

        // Run tests
        const exitCode = await runTests();

        // Cleanup if requested and we started the stack
        if (shouldCleanup && !wasRunning) {
            stopStack();
        } else if (!wasRunning) {
            info('Docker stack is still running. Use --cleanup flag to stop it after tests.');
        }

        process.exit(exitCode);
    } catch (err) {
        error(`Error: ${err instanceof Error ? err.message : String(err)}`);

        // Cleanup on error if we started the stack
        if (shouldCleanup && !wasRunning) {
            stopStack();
        }

        process.exit(1);
    }
}

// Run main function
main().catch((err) => {
    error(`Unexpected error: ${err}`);
    process.exit(1);
});