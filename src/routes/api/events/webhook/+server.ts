import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/server/infrastructure/logging/logger.service';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();

		logger.info('Received webhook callback:', body);

		// Validate webhook payload
		if (!body.consumerId || !body.events || !Array.isArray(body.events)) {
			logger.error('Invalid webhook payload:', body);
			return json({ error: 'Invalid payload' }, { status: 400 });
		}

		const { consumerId, events } = body;

		// Access the injected libraryService if needed
		const { libraryService } = locals;
		logger.info(`LibraryService available: ${!!libraryService}`);

		// TODO: Implement event processing in Phase 3 (Event Projectors)
		// For now, just log the events
		logger.info(`Received ${events.length} events for processing`);

		logger.info(`Processed ${events.length} events for consumer ${consumerId}`);

		// Return success to acknowledge receipt
		return json({ success: true, processedEvents: events.length });
	} catch (error) {
		logger.error('Error processing webhook:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async () => {
	return json('Hello World');
};
