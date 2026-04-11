import { GroupsRepository } from './groups.repository';
import { Group } from '../entities/group.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('GroupsRepository', () => {
	let repo: GroupsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new GroupsRepository(mockTypeormRepo as any);
	});

	describe('findAllByOwner', () => {
		it('returns groups owned by the user', async () => {
			const groups = [{ id: 'g1' }] as Group[];
			mockTypeormRepo.find.mockResolvedValue(groups);

			const result = await repo.findAllByOwner('owner-1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({ where: { ownerId: 'owner-1' } });
			expect(result).toBe(groups);
		});
	});

	describe('findOneById', () => {
		it('returns a group by its id', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.findOne.mockResolvedValue(group);

			const result = await repo.findOneById('g1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'g1' } });
			expect(result).toBe(group);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findOneById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findOneByOwnerAndId', () => {
		it('scopes the lookup to the owner and id', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.findOne.mockResolvedValue(group);

			const result = await repo.findOneByOwnerAndId('owner-1', 'g1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1', id: 'g1' },
			});
			expect(result).toBe(group);
		});
	});

	describe('create', () => {
		it('creates and saves a group with a description', async () => {
			const draft = { ownerId: 'owner-1', name: 'Friends', description: 'IRL' } as Group;
			const saved = { id: 'g1', ...draft } as Group;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create('owner-1', 'Friends', 'IRL');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				name: 'Friends',
				description: 'IRL',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});

		it('defaults description to null when not provided', async () => {
			const draft = { ownerId: 'owner-1', name: 'Friends', description: null } as Group;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(draft);

			await repo.create('owner-1', 'Friends');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				name: 'Friends',
				description: null,
			});
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.save.mockResolvedValue(group);

			const result = await repo.save(group);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(group);
			expect(result).toBe(group);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.remove.mockResolvedValue(group);

			await repo.remove(group);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(group);
		});
	});
});
