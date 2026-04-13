import { ILike } from 'typeorm';
import { UserRepository } from './user.repository';
import { User } from '../entities/user.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	findAndCount: jest.fn(),
	update: jest.fn(),
	softDelete: jest.fn(),
};

describe('UserRepository', () => {
	let repo: UserRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new UserRepository(mockTypeormRepo as any);
	});

	describe('create', () => {
		it('should create and save a user', async () => {
			const userData = { phoneNumber: '+1234567890' };
			const entity = { id: 'uuid', ...userData } as User;
			mockTypeormRepo.create.mockReturnValue(entity);
			mockTypeormRepo.save.mockResolvedValue(entity);

			const result = await repo.create(userData);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(userData);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(entity);
			expect(result).toBe(entity);
		});
	});

	describe('save', () => {
		it('should save a user', async () => {
			const user = { id: 'uuid', phoneNumber: '+1234567890' } as User;
			mockTypeormRepo.save.mockResolvedValue(user);

			const result = await repo.save(user);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(user);
			expect(result).toBe(user);
		});
	});

	describe('findById', () => {
		it('should return a user when found', async () => {
			const user = { id: 'uuid' } as User;
			mockTypeormRepo.findOne.mockResolvedValue(user);

			const result = await repo.findById('uuid');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'uuid' },
				relations: undefined,
			});
			expect(result).toBe(user);
		});

		it('should return null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findById('missing-id');

			expect(result).toBeNull();
		});

		it('should pass relations when provided', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findById('uuid', ['privacySettings']);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'uuid' },
				relations: ['privacySettings'],
			});
		});
	});

	describe('findByPhoneNumber', () => {
		it('should find a user by phone number', async () => {
			const user = { id: 'uuid', phoneNumber: '+1234567890' } as User;
			mockTypeormRepo.findOne.mockResolvedValue(user);

			const result = await repo.findByPhoneNumber('+1234567890');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { phoneNumber: '+1234567890' } });
			expect(result).toBe(user);
		});

		it('should return null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findByPhoneNumber('+0000000000');

			expect(result).toBeNull();
		});
	});

	describe('findByPhoneNumberWithFilter', () => {
		it('should exclude inactive users by default', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findByPhoneNumberWithFilter('+1234567890');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { phoneNumber: '+1234567890', isActive: true },
				relations: undefined,
			});
		});

		it('should include inactive users when includeInactive is true', async () => {
			const inactiveUser = { id: 'uuid', isActive: false } as User;
			mockTypeormRepo.findOne.mockResolvedValue(inactiveUser);

			const result = await repo.findByPhoneNumberWithFilter('+1234567890', true);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { phoneNumber: '+1234567890' },
				relations: undefined,
			});
			expect(result).toBe(inactiveUser);
		});

		it('should pass relations when provided', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findByPhoneNumberWithFilter('+1234567890', false, ['privacySettings']);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { phoneNumber: '+1234567890', isActive: true },
				relations: ['privacySettings'],
			});
		});
	});

	describe('findByUsername', () => {
		it('should find a user by username', async () => {
			const user = { id: 'uuid', username: 'alice' } as User;
			mockTypeormRepo.findOne.mockResolvedValue(user);

			const result = await repo.findByUsername('alice');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { username: 'alice' } });
			expect(result).toBe(user);
		});

		it('should return null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findByUsername('unknown');

			expect(result).toBeNull();
		});
	});

	describe('findByUsernameInsensitive', () => {
		it('should search case-insensitively and exclude inactive by default', async () => {
			const user = { id: 'uuid', username: 'Alice' } as User;
			mockTypeormRepo.findOne.mockResolvedValue(user);

			const result = await repo.findByUsernameInsensitive('alice');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { username: ILike('alice'), isActive: true },
				relations: undefined,
			});
			expect(result).toBe(user);
		});

		it('should include inactive users when includeInactive is true', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findByUsernameInsensitive('alice', true);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { username: ILike('alice') },
				relations: undefined,
			});
		});

		it('should pass relations when provided', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findByUsernameInsensitive('alice', false, ['privacySettings']);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { username: ILike('alice'), isActive: true },
				relations: ['privacySettings'],
			});
		});
	});

	describe('findOne', () => {
		it('should find one user by criteria', async () => {
			const user = { id: 'uuid' } as User;
			mockTypeormRepo.findOne.mockResolvedValue(user);

			const result = await repo.findOne({ id: 'uuid' });

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'uuid' },
				relations: undefined,
			});
			expect(result).toBe(user);
		});

		it('should pass relations when provided', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			await repo.findOne({ id: 'uuid' }, ['privacySettings']);

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'uuid' },
				relations: ['privacySettings'],
			});
		});
	});

	describe('findAll', () => {
		it('should return paginated users with defaults', async () => {
			const users = [{ id: 'uuid1' }, { id: 'uuid2' }] as User[];
			mockTypeormRepo.findAndCount.mockResolvedValue([users, 2]);

			const result = await repo.findAll();

			expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
				relations: ['privacySettings'],
				skip: 0,
				take: 10,
				order: { createdAt: 'DESC' },
			});
			expect(result).toEqual({ users, total: 2 });
		});

		it('should apply page and limit correctly', async () => {
			mockTypeormRepo.findAndCount.mockResolvedValue([[], 0]);

			await repo.findAll(3, 5);

			expect(mockTypeormRepo.findAndCount).toHaveBeenCalledWith({
				relations: ['privacySettings'],
				skip: 10,
				take: 5,
				order: { createdAt: 'DESC' },
			});
		});
	});

	describe('findAllUsers', () => {
		it('should return all users', async () => {
			const users = [{ id: 'uuid1' }] as User[];
			mockTypeormRepo.find.mockResolvedValue(users);

			const result = await repo.findAllUsers();

			expect(mockTypeormRepo.find).toHaveBeenCalled();
			expect(result).toBe(users);
		});
	});

	describe('searchByDisplayName', () => {
		it('searches by firstName OR lastName with the default limit and deduplicates results', async () => {
			const rows = [
				{ id: 'u1', firstName: 'Alice' },
				{ id: 'u2', firstName: 'Alicia' },
				{ id: 'u1', firstName: 'Alice' },
			] as User[];
			mockTypeormRepo.find.mockResolvedValue(rows);

			const result = await repo.searchByDisplayName('ali');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: [
					{ firstName: ILike('%ali%'), isActive: true },
					{ lastName: ILike('%ali%'), isActive: true },
				],
				take: 40,
				order: { createdAt: 'DESC' },
			});
			expect(result).toHaveLength(2);
			expect(result.map((u) => u.id)).toEqual(['u1', 'u2']);
		});

		it('respects the limit parameter', async () => {
			const rows = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] as User[];
			mockTypeormRepo.find.mockResolvedValue(rows);

			const result = await repo.searchByDisplayName('ali', 2);

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: [
					{ firstName: ILike('%ali%'), isActive: true },
					{ lastName: ILike('%ali%'), isActive: true },
				],
				take: 4,
				order: { createdAt: 'DESC' },
			});
			expect(result).toHaveLength(2);
		});

		it('escapes SQL wildcard characters in the query', async () => {
			mockTypeormRepo.find.mockResolvedValue([]);

			await repo.searchByDisplayName('%_test');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: [
					{ firstName: ILike('%\\%\\_test%'), isActive: true },
					{ lastName: ILike('%\\%\\_test%'), isActive: true },
				],
				take: 40,
				order: { createdAt: 'DESC' },
			});
		});
	});

	describe('updateLastSeen', () => {
		it('should update lastSeen with provided date', async () => {
			const date = new Date('2024-01-01T00:00:00Z');
			mockTypeormRepo.update.mockResolvedValue(undefined);

			await repo.updateLastSeen('uuid', date);

			expect(mockTypeormRepo.update).toHaveBeenCalledWith('uuid', { lastSeen: date });
		});

		it('should use current date when none provided', async () => {
			const before = new Date();
			mockTypeormRepo.update.mockResolvedValue(undefined);

			await repo.updateLastSeen('uuid');

			const after = new Date();
			const [, payload] = mockTypeormRepo.update.mock.calls[0];
			expect(payload.lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(payload.lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe('softDelete', () => {
		it('should soft-delete a user by id', async () => {
			mockTypeormRepo.softDelete.mockResolvedValue(undefined);

			await repo.softDelete('uuid');

			expect(mockTypeormRepo.softDelete).toHaveBeenCalledWith('uuid');
		});
	});

	describe('updateStatus', () => {
		it('should set isActive to true', async () => {
			mockTypeormRepo.update.mockResolvedValue(undefined);

			await repo.updateStatus('uuid', true);

			expect(mockTypeormRepo.update).toHaveBeenCalledWith('uuid', { isActive: true });
		});

		it('should set isActive to false', async () => {
			mockTypeormRepo.update.mockResolvedValue(undefined);

			await repo.updateStatus('uuid', false);

			expect(mockTypeormRepo.update).toHaveBeenCalledWith('uuid', { isActive: false });
		});
	});
});
