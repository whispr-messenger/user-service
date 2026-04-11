export const USER_REGISTERED_PATTERN = 'user.registered';

export class UserRegisteredEvent {
	constructor(
		public readonly userId: string,
		public readonly phoneNumber: string,
		public readonly timestamp: Date = new Date()
	) {}
}
