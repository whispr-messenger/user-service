export class UserUpdatedEvent {
	constructor(
		public readonly userId: string,
		public readonly username?: string,
		public readonly firstName?: string,
		public readonly lastName?: string,
		public readonly profilePictureUrl?: string,
		public readonly isActive?: boolean
	) {}
}
