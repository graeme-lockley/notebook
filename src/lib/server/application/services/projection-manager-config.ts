/**
 * Configuration for NotebookProjectionManager
 */
export interface ProjectionManagerConfig {
	/**
	 * Grace period in milliseconds before evicting an unused projection.
	 * Default: 60000 (60 seconds)
	 */
	gracePeriodMs: number;

	/**
	 * Maximum number of concurrent projection hydrations.
	 * Default: 5
	 */
	maxConcurrentHydrations: number;

	/**
	 * Enable event streaming to keep projections current.
	 * Default: true
	 */
	enableEventStreaming: boolean;
}

/**
 * Default configuration for projection manager
 */
export const DEFAULT_PROJECTION_CONFIG: ProjectionManagerConfig = {
	gracePeriodMs: 60000, // 60 seconds
	maxConcurrentHydrations: 5,
	enableEventStreaming: true
};
