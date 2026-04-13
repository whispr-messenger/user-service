import { User } from './user.entity';

describe('User entity', () => {
	it('should allow instantiation with all fields including nullable ones', () => {
		const user = new User();
		user.id = 'test-uuid';
		user.phoneNumber = '+1234567890';
		user.username = 'testuser';
		user.firstName = 'John';
		user.lastName = 'Doe';
		user.biography = 'A test biography';
		user.profilePictureUrl = 'https://example.com/pic.jpg';
		user.lastSeen = new Date('2024-01-01');
		user.isActive = true;
		user.createdAt = new Date();
		user.updatedAt = new Date();
		user.deletedAt = null;
		user.privacySettings = null;

		expect(user.id).toBe('test-uuid');
		expect(user.phoneNumber).toBe('+1234567890');
		expect(user.biography).toBe('A test biography');
		expect(user.profilePictureUrl).toBe('https://example.com/pic.jpg');
		expect(user.lastSeen).toEqual(new Date('2024-01-01'));
		expect(user.deletedAt).toBeNull();
		expect(user.privacySettings).toBeNull();
	});

	it('should accept null for nullable string fields', () => {
		const user = new User();
		user.id = 'test-uuid';
		user.phoneNumber = '+1234567890';
		user.username = null;
		user.firstName = null;
		user.lastName = null;
		user.biography = null;
		user.profilePictureUrl = null;
		user.lastSeen = null;
		user.isActive = true;
		user.createdAt = new Date();
		user.updatedAt = new Date();
		user.deletedAt = null;

		expect(user.username).toBeNull();
		expect(user.firstName).toBeNull();
		expect(user.lastName).toBeNull();
		expect(user.biography).toBeNull();
		expect(user.profilePictureUrl).toBeNull();
		expect(user.lastSeen).toBeNull();
		expect(user.deletedAt).toBeNull();
	});

	it('should accept a Date for deletedAt when soft-deleted', () => {
		const user = new User();
		const deletedDate = new Date('2024-06-15T12:00:00Z');
		user.deletedAt = deletedDate;

		expect(user.deletedAt).toEqual(deletedDate);
	});
});
