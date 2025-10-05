export interface LoggerConfig {
	enableInfo: boolean;
	enableWarn: boolean;
	enableError: boolean;
	enableDebug: boolean;
}

class Logger {
	private config: LoggerConfig = {
		enableInfo: false,
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
			const formattedArgs = args.map((arg) =>
				typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
			);
			console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...formattedArgs);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.config.enableWarn) {
			const formattedArgs = args.map((arg) =>
				typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
			);
			console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...formattedArgs);
		}
	}

	error(message: string, ...args: unknown[]): void {
		if (this.config.enableError) {
			const formattedArgs = args.map((arg) =>
				typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
			);
			console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...formattedArgs);
		}
	}

	debug(message: string, ...args: unknown[]): void {
		if (this.config.enableDebug) {
			const formattedArgs = args.map((arg) =>
				typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
			);
			console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...formattedArgs);
		}
	}
}

export const logger = new Logger();
