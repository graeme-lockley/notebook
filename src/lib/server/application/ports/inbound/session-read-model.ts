import type { Session, SessionId, UserId } from '$lib/server/domain/value-objects';

export interface SessionReadModel {
	getSessionById(sessionId: SessionId): Promise<Session | null>;
	getUserBySessionId(
		sessionId: SessionId
	): Promise<import('$lib/server/domain/value-objects').User | null>;
	getActiveSessionsByUserId(userId: UserId): Promise<Session[]>;
}
