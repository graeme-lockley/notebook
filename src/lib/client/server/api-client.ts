import { logger } from '$lib/common/infrastructure/logging/logger.service';

/**
 * Generic API client helper for making HTTP requests.
 * Reduces boilerplate in command and query functions.
 */
export async function apiRequest<TRequest = unknown, TResponse = void>(
	endpoint: string,
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
	body?: TRequest
): Promise<TResponse | undefined> {
	try {
		const options: RequestInit = {
			method,
			headers: {
				'Content-Type': 'application/json'
			}
		};

		if (body !== undefined) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(endpoint, options);

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		// DELETE typically doesn't return a body
		if (method === 'DELETE') {
			return undefined;
		}

		return (await response.json()) as TResponse;
	} catch (error) {
		logger.error(`API Error [${method} ${endpoint}]:`, error);
		throw error;
	}
}
