import { redirect, isRedirect } from '@sveltejs/kit';

/**
 * Serializes an error for logging purposes
 */
export function serializeError(error: unknown): {
	message: string;
	stack?: string;
	details: string;
	type: string;
} {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorStack = error instanceof Error ? error.stack : undefined;
	const errorDetails =
		error instanceof Error
			? JSON.stringify({ message: error.message, name: error.name, stack: error.stack }, null, 2)
			: JSON.stringify(error, null, 2);

	return {
		message: errorMessage,
		stack: errorStack,
		details: errorDetails,
		type: error instanceof Error ? error.constructor.name : typeof error
	};
}

/**
 * Handles errors in OAuth/authentication flows
 * Re-throws redirect errors and converts other errors to redirects
 */
export function handleAuthError(
	error: unknown,
	defaultMessage: string = 'Authentication failed'
): never {
	// In SvelteKit, redirect() throws a special error that must be re-thrown
	if (isRedirect(error)) {
		throw error; // Re-throw redirect errors so SvelteKit can handle them
	}

	// Get user-friendly error message for redirect
	const errorMessage =
		error instanceof Error ? encodeURIComponent(error.message || defaultMessage) : defaultMessage;

	throw redirect(302, `/auth/error?message=${errorMessage}`);
}
