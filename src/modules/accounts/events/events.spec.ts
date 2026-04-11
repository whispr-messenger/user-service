import { UserUpdatedEvent } from './user-updated.event';
import { UserDeactivatedEvent } from './user-deactivated.event';

describe('UserUpdatedEvent', () => {
	it('exposes all constructor fields as readonly properties', () => {
		const event = new UserUpdatedEvent(
			'user-1',
			'alice',
			'Alice',
			'Smith',
			'https://cdn.example.com/a.png',
			true
		);

		expect(event.userId).toBe('user-1');
		expect(event.username).toBe('alice');
		expect(event.firstName).toBe('Alice');
		expect(event.lastName).toBe('Smith');
		expect(event.profilePictureUrl).toBe('https://cdn.example.com/a.png');
		expect(event.isActive).toBe(true);
	});

	it('leaves optional fields undefined when not provided', () => {
		const event = new UserUpdatedEvent('user-1');

		expect(event.userId).toBe('user-1');
		expect(event.username).toBeUndefined();
		expect(event.firstName).toBeUndefined();
		expect(event.lastName).toBeUndefined();
		expect(event.profilePictureUrl).toBeUndefined();
		expect(event.isActive).toBeUndefined();
	});
});

describe('UserDeactivatedEvent', () => {
	it('exposes userId and deactivatedAt as readonly properties', () => {
		const deactivatedAt = new Date('2026-01-01T00:00:00Z');
		const event = new UserDeactivatedEvent('user-1', deactivatedAt);

		expect(event.userId).toBe('user-1');
		expect(event.deactivatedAt).toBe(deactivatedAt);
	});
});
