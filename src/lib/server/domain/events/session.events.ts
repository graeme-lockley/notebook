export interface SessionCreatedEvent {
	type: 'session.created';
	payload: {
		sessionId: string;
		userId: string;
		createdAt: string; // ISO timestamp
		expiresAt: string; // ISO timestamp (7 days from creation)
	};
}

export interface SessionExpiredEvent {
	type: 'session.expired';
	payload: {
		sessionId: string;
		expiredAt: string; // ISO timestamp
	};
}

export type SessionEvent = SessionCreatedEvent | SessionExpiredEvent;
