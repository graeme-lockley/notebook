/**
 * EventSequencer - Utility for managing event ordering and deduplication
 *
 * Handles event sequence tracking to prevent processing duplicate or out-of-order events
 * from the server.
 */
export class EventSequencer {
	private lastProcessedEventId: string | null = null;

	/**
	 * Checks if the given event ID is newer than the last processed event
	 * @param eventId - Event ID in format: <topic>-<sequence-number>
	 * @returns true if the event is newer or if it's the first event
	 */
	isEventNewer(eventId: string): boolean {
		if (!this.lastProcessedEventId) {
			return true; // First event is always newer
		}

		const currentSeq = EventSequencer.extractSequenceNumber(eventId);
		const lastSeq = EventSequencer.extractSequenceNumber(this.lastProcessedEventId);

		if (currentSeq === null || lastSeq === null) {
			return true; // If we can't parse, assume it's newer
		}

		return currentSeq > lastSeq;
	}

	/**
	 * Marks an event as processed and updates the last processed event ID
	 * @param eventId - Event ID to mark as processed
	 */
	markEventProcessed(eventId: string): void {
		this.lastProcessedEventId = eventId;
	}

	/**
	 * Resets the sequencer state, clearing the last processed event ID
	 */
	reset(): void {
		this.lastProcessedEventId = null;
	}

	/**
	 * Gets the last processed event ID
	 */
	getLastProcessedEventId(): string | null {
		return this.lastProcessedEventId;
	}

	/**
	 * Extracts the sequence number from an event ID
	 * Event ID format: <topic>-<sequence-number>
	 * @param eventId - Event ID to parse
	 * @returns sequence number or null if parsing fails
	 */
	static extractSequenceNumber(eventId: string): number | null {
		const parts = eventId.split('-');
		if (parts.length < 2) {
			return null;
		}
		const sequenceStr = parts[parts.length - 1];
		const sequence = parseInt(sequenceStr, 10);
		return isNaN(sequence) ? null : sequence;
	}
}
