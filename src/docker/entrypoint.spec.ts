import runEnvChecks from './check-env';
import { runEntrypoint } from './entrypoint';

// Mock the dependencies
jest.mock('./check-env');
jest.mock('../main.js', () => ({}), { virtual: true });

describe('Entrypoint', () => {
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	let processExitSpy: jest.SpyInstance;
	let mockRunEnvChecks: jest.MockedFunction<typeof runEnvChecks>;

	beforeEach(() => {
		// Setup spies
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
		processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
			throw new Error(`process.exit(${code})`);
		});

		mockRunEnvChecks = runEnvChecks as jest.MockedFunction<typeof runEnvChecks>;

		// Clear all mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore all spies
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		processExitSpy.mockRestore();
	});

	describe('Successful startup', () => {
		it('should run environment checks and start the application', async () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				// Do nothing - successful check
			});

			// Act
			runEntrypoint();

			// Allow async import to complete
			await new Promise((resolve) => process.nextTick(resolve));

			// Assert
			expect(mockRunEnvChecks).toHaveBeenCalledTimes(1);
			expect(consoleLogSpy).toHaveBeenCalledWith('Starting Auth Service...\n');
			expect(processExitSpy).not.toHaveBeenCalled();
		});

		it('should not call process.exit when environment checks pass', async () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				// Successful check
			});

			// Act
			runEntrypoint();

			// Allow async import to complete
			await new Promise((resolve) => process.nextTick(resolve));

			// Assert
			expect(processExitSpy).not.toHaveBeenCalled();
			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});
	});

	describe('Failed startup', () => {
		it('should exit with code 1 when environment checks fail with Error', () => {
			// Arrange
			const errorMessage = 'Missing required environment variables';
			mockRunEnvChecks.mockImplementation(() => {
				throw new Error(errorMessage);
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(mockRunEnvChecks).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', errorMessage);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it('should exit with code 1 when environment checks fail with non-Error', () => {
			// Arrange
			const errorValue = 'Some string error';
			mockRunEnvChecks.mockImplementation(() => {
				throw errorValue;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(mockRunEnvChecks).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', errorValue);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it('should handle null error values', () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				throw null;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', null);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it('should handle undefined error values', () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				throw undefined;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', undefined);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it('should not log "Starting Auth Service..." when checks fail', () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				throw new Error('Check failed');
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleLogSpy).not.toHaveBeenCalledWith('Starting Auth Service...\n');
		});
	});

	describe('Error handling edge cases', () => {
		it('should handle Error objects with custom properties', () => {
			// Arrange
			class CustomError extends Error {
				code: string;

				constructor(message: string, code: string) {
					super(message);
					this.code = code;
					this.name = 'CustomError';
				}
			}

			const customError = new CustomError('Custom error message', 'ERR_CUSTOM');
			mockRunEnvChecks.mockImplementation(() => {
				throw customError;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', 'Custom error message');
		});

		it('should handle numeric error values', () => {
			// Arrange
			mockRunEnvChecks.mockImplementation(() => {
				throw 42;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', 42);
		});

		it('should handle object error values', () => {
			// Arrange
			const errorObj = {
				code: 'ERR_001',
				details: 'Something went wrong',
			};
			mockRunEnvChecks.mockImplementation(() => {
				throw errorObj;
			});

			// Act & Assert
			expect(() => runEntrypoint()).toThrow('process.exit(1)');

			expect(consoleErrorSpy).toHaveBeenCalledWith('Entrypoint failed:', errorObj);
		});
	});
});
