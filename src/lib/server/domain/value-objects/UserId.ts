export type UserId = string; // Format: "user-{timestamp}-{random}"

export function generateUserId(): UserId {
	return `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
