import type { Session, SessionId, UserId, User } from '$lib/server/domain/value-objects';

export interface SessionReadModel {
	getSessionById(sessionId: SessionId): Promise<Session | null>;
	getUserBySessionId(sessionId: SessionId): Promise<User | null>;
	getActiveSessionsByUserId(userId: UserId): Promise<Session[]>;
}
