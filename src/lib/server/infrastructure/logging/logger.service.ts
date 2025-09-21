export interface LoggerConfig {
	enableInfo: boolean;
	enableWarn: boolean;
	enableError: boolean;
	enableDebug: boolean;
}

class Logger {
	private config: LoggerConfig = {
		enableInfo: true,
		enableWarn: true,
		enableError: true,
		enableDebug: process.env.NODE_ENV === 'development'
	};

	configure(config: Partial<LoggerConfig>): LoggerConfig {
		const previousConfig = { ...this.config };
		this.config = { ...this.config, ...config };
		return previousConfig;
	}

	info(message: string, ...args: unknown[]): void {
		if (this.config.enableInfo) {
			console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.config.enableWarn) {
			console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
		}
	}

	error(message: string, ...args: unknown[]): void {
		if (this.config.enableError) {
			console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
		}
	}

	debug(message: string, ...args: unknown[]): void {
		if (this.config.enableDebug) {
			console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
		}
	}
}

export const logger = new Logger();
