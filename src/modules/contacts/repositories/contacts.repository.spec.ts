import { ContactsRepository } from './contacts.repository';
import { Contact } from '../entities/contact.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('ContactsRepository', () => {
	let repo: ContactsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new ContactsRepository(mockTypeormRepo as any);
	});

	describe('findAllByOwner', () => {
		it('returns contacts for the owner with the contact relation loaded', async () => {
			const contacts = [{ id: 'c1' }] as Contact[];
			mockTypeormRepo.find.mockResolvedValue(contacts);

			const result = await repo.findAllByOwner('owner-1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1' },
				relations: ['contact'],
			});
			expect(result).toBe(contacts);
		});
	});

	describe('findOne', () => {
		it('returns a contact when found', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.findOne.mockResolvedValue(contact);

			const result = await repo.findOne('owner-1', 'contact-1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1', contactId: 'contact-1' },
				relations: ['contact'],
			});
			expect(result).toBe(contact);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findOne('owner-1', 'missing');

			expect(result).toBeNull();
		});
	});

	describe('create', () => {
		it('creates and saves a contact with a nickname, then reloads relations', async () => {
			const draft = { ownerId: 'owner-1', contactId: 'contact-1', nickname: 'Bob' } as Contact;
			const saved = { id: 'c1', ...draft } as Contact;
			const reloaded = { ...saved, contact: { id: 'contact-1' } } as Contact;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);
			mockTypeormRepo.findOne.mockResolvedValue(reloaded);

			const result = await repo.create('owner-1', 'contact-1', 'Bob');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				contactId: 'contact-1',
				nickname: 'Bob',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'c1' },
				relations: ['contact'],
			});
			expect(result).toBe(reloaded);
		});

		it('defaults nickname to null when not provided', async () => {
			const draft = { ownerId: 'owner-1', contactId: 'contact-1', nickname: null } as Contact;
			const saved = { id: 'c1', ...draft } as Contact;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.create('owner-1', 'contact-1');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				contactId: 'contact-1',
				nickname: null,
			});
			expect(result).toBe(saved);
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.save.mockResolvedValue(contact);

			const result = await repo.save(contact);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(contact);
			expect(result).toBe(contact);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.remove.mockResolvedValue(contact);

			await repo.remove(contact);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(contact);
		});
	});
});
