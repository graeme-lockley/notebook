export type SessionId = string; // Format: "session-{timestamp}-{random}"

export function generateSessionId(): SessionId {
	const randomPart = Math.random().toString(36).substring(2, 16).padEnd(14, '0').substring(0, 14);
	return `session-${Date.now()}-${randomPart}`;
}
