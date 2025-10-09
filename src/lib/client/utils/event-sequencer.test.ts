import { describe, it, expect, beforeEach } from 'vitest';
import { EventSequencer } from './event-sequencer';

describe('EventSequencer', () => {
	let sequencer: EventSequencer;

	beforeEach(() => {
		sequencer = new EventSequencer();
	});

	describe('extractSequenceNumber', () => {
		it('should extract sequence number from valid event ID', () => {
			expect(EventSequencer.extractSequenceNumber('notebook-123')).toBe(123);
			expect(EventSequencer.extractSequenceNumber('cell-456')).toBe(456);
			expect(EventSequencer.extractSequenceNumber('topic-with-dashes-789')).toBe(789);
		});

		it('should return null for invalid event IDs', () => {
			expect(EventSequencer.extractSequenceNumber('invalid')).toBeNull();
			expect(EventSequencer.extractSequenceNumber('no-number-abc')).toBeNull();
			expect(EventSequencer.extractSequenceNumber('')).toBeNull();
		});
	});

	describe('isEventNewer', () => {
		it('should return true for first event', () => {
			expect(sequencer.isEventNewer('notebook-1')).toBe(true);
		});

		it('should return true for newer events', () => {
			sequencer.markEventProcessed('notebook-1');
			expect(sequencer.isEventNewer('notebook-2')).toBe(true);
			expect(sequencer.isEventNewer('notebook-10')).toBe(true);
		});

		it('should return false for older events', () => {
			sequencer.markEventProcessed('notebook-5');
			expect(sequencer.isEventNewer('notebook-4')).toBe(false);
			expect(sequencer.isEventNewer('notebook-1')).toBe(false);
		});

		it('should return false for same event', () => {
			sequencer.markEventProcessed('notebook-5');
			expect(sequencer.isEventNewer('notebook-5')).toBe(false);
		});

		it('should return true if event IDs cannot be parsed', () => {
			sequencer.markEventProcessed('notebook-5');
			expect(sequencer.isEventNewer('invalid-id')).toBe(true);
			expect(sequencer.isEventNewer('no-number')).toBe(true);
		});
	});

	describe('markEventProcessed', () => {
		it('should update last processed event ID', () => {
			sequencer.markEventProcessed('notebook-1');
			expect(sequencer.getLastProcessedEventId()).toBe('notebook-1');

			sequencer.markEventProcessed('notebook-2');
			expect(sequencer.getLastProcessedEventId()).toBe('notebook-2');
		});
	});

	describe('reset', () => {
		it('should clear last processed event ID', () => {
			sequencer.markEventProcessed('notebook-5');
			expect(sequencer.getLastProcessedEventId()).toBe('notebook-5');

			sequencer.reset();
			expect(sequencer.getLastProcessedEventId()).toBeNull();
		});

		it('should make next event be treated as first event', () => {
			sequencer.markEventProcessed('notebook-10');
			sequencer.reset();
			expect(sequencer.isEventNewer('notebook-1')).toBe(true);
		});
	});

	describe('getLastProcessedEventId', () => {
		it('should return null initially', () => {
			expect(sequencer.getLastProcessedEventId()).toBeNull();
		});

		it('should return last processed event ID', () => {
			sequencer.markEventProcessed('notebook-42');
			expect(sequencer.getLastProcessedEventId()).toBe('notebook-42');
		});
	});
});
