import { describe, it, expect } from 'vitest';
import { generateSessionId } from './SessionId';

describe('SessionId', () => {
	it('should generate unique session IDs', () => {
		const id1 = generateSessionId();
		const id2 = generateSessionId();

		expect(id1).not.toBe(id2);
		expect(id1).toMatch(/^session-\d+-[a-z0-9]{14}$/);
		expect(id2).toMatch(/^session-\d+-[a-z0-9]{14}$/);
	});

	it('should generate IDs with correct format', () => {
		const id = generateSessionId();
		const parts = id.split('-');

		expect(parts[0]).toBe('session');
		expect(parts[1]).toMatch(/^\d+$/); // timestamp
		expect(parts[2]).toMatch(/^[a-z0-9]{14}$/); // random string (14 chars)
	});

	it('should generate different IDs when called multiple times', () => {
		const ids = new Set();
		for (let i = 0; i < 100; i++) {
			ids.add(generateSessionId());
		}

		expect(ids.size).toBe(100);
	});
});
