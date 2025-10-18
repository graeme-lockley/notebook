import type { SessionId } from './SessionId';
import type { UserId } from './UserId';

export interface Session {
	id: SessionId;
	userId: UserId;
	createdAt: Date;
	expiresAt: Date;
	lastAccessedAt: Date;
}
