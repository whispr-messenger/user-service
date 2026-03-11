export class UserCreatedEvent {
	constructor(
		public readonly userId: string,
		public readonly phoneNumber: string,
		public readonly username: string,
		public readonly firstName: string,
		public readonly lastName?: string
	) {}
}
