import { UserResponseDto } from './user-response.dto';
import { User } from '../entities/user.entity';

describe('UserResponseDto', () => {
	describe('fromEntity', () => {
		it('maps all exposed fields from a User entity', () => {
			const now = new Date();
			const user = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				phoneNumber: '+33612345678',
				username: 'alice',
				firstName: 'Alice',
				lastName: 'Smith',
				biography: 'Hello world',
				profilePictureUrl: 'https://example.com/pic.jpg',
				lastSeen: now,
				isActive: true,
				createdAt: now,
				updatedAt: now,
			} as User;

			const dto = UserResponseDto.fromEntity(user);

			expect(dto).toBeInstanceOf(UserResponseDto);
			expect(dto.id).toBe(user.id);
			expect(dto.username).toBe('alice');
			expect(dto.firstName).toBe('Alice');
			expect(dto.lastName).toBe('Smith');
			expect(dto.biography).toBe('Hello world');
			expect(dto.profilePictureUrl).toBe('https://example.com/pic.jpg');
			expect(dto.lastSeen).toBe(now);
			expect(dto.createdAt).toBe(now);
			expect(dto.updatedAt).toBe(now);
		});

		it('excludes internal fields (phoneNumber, isActive)', () => {
			const user = {
				id: 'user-1',
				phoneNumber: '+33612345678',
				username: 'bob',
				firstName: null,
				lastName: null,
				biography: null,
				profilePictureUrl: null,
				lastSeen: null,
				isActive: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as User;

			const dto = UserResponseDto.fromEntity(user);

			expect((dto as any).phoneNumber).toBeUndefined();
			expect((dto as any).isActive).toBeUndefined();
		});

		it('coerces undefined nullable fields to null', () => {
			const user = {
				id: 'user-2',
				phoneNumber: '+33600000000',
				username: 'charlie',
				firstName: 'Charlie',
				lastName: 'Brown',
				biography: undefined,
				profilePictureUrl: undefined,
				lastSeen: undefined,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as User;

			const dto = UserResponseDto.fromEntity(user);

			expect(dto.biography).toBeNull();
			expect(dto.profilePictureUrl).toBeNull();
			expect(dto.lastSeen).toBeNull();
		});

		it('preserves null values for nullable string fields', () => {
			const user = {
				id: 'user-3',
				phoneNumber: '+33600000001',
				username: null,
				firstName: null,
				lastName: null,
				biography: null,
				profilePictureUrl: null,
				lastSeen: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as User;

			const dto = UserResponseDto.fromEntity(user);

			expect(dto.username).toBeNull();
			expect(dto.firstName).toBeNull();
			expect(dto.lastName).toBeNull();
			expect(dto.biography).toBeNull();
			expect(dto.profilePictureUrl).toBeNull();
			expect(dto.lastSeen).toBeNull();
		});
	});
});
