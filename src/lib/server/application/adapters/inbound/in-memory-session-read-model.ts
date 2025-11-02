import type { Session, SessionId, UserId, User } from '$lib/server/domain/value-objects';
import type { SessionReadModel } from '../../ports/inbound/session-read-model';
import type { UserReadModel } from '../../ports/inbound/user-read-model';
import type {
	SessionCreatedEvent,
	SessionExpiredEvent
} from '$lib/server/domain/events/session.events';

export class InMemorySessionReadModel implements SessionReadModel {
	private sessions = new Map<SessionId, Session>();

	constructor(private userReadModel: UserReadModel) {}

	async getSessionById(sessionId: SessionId): Promise<Session | null> {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		// Check if expired
		if (session.expiresAt < new Date()) {
			return null;
		}

		return session;
	}

	async getUserBySessionId(sessionId: SessionId): Promise<User | null> {
		const session = await this.getSessionById(sessionId);
		if (!session) return null;

		return this.userReadModel.getUserById(session.userId);
	}

	async getActiveSessionsByUserId(userId: UserId): Promise<Session[]> {
		const now = new Date();
		return Array.from(this.sessions.values()).filter(
			(session) => session.userId === userId && session.expiresAt > now
		);
	}

	// Methods called by projector
	handleSessionCreated(event: SessionCreatedEvent): void {
		const session: Session = {
			id: event.payload.sessionId,
			userId: event.payload.userId,
			createdAt: new Date(event.payload.createdAt),
			expiresAt: new Date(event.payload.expiresAt),
			lastAccessedAt: new Date(event.payload.createdAt)
		};

		this.sessions.set(session.id, session);
	}

	handleSessionExpired(event: SessionExpiredEvent): void {
		this.sessions.delete(event.payload.sessionId);
	}
}
