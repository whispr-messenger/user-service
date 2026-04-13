import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import { ContactsController } from './contacts.controller';
import { ContactsService } from '../services/contacts.service';
import { Contact } from '../entities/contact.entity';
import { AddContactDto } from '../dto/add-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('ContactsController', () => {
	let controller: ContactsController;
	let service: jest.Mocked<ContactsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ContactsController],
			providers: [
				{
					provide: ContactsService,
					useValue: {
						getContacts: jest.fn(),
						addContact: jest.fn(),
						updateContact: jest.fn(),
						removeContact: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ContactsController>(ContactsController);
		service = module.get(ContactsService);
	});

	describe('getContacts', () => {
		it('returns the contacts for the authenticated user', async () => {
			const contacts = [{ id: 'c1' }] as Contact[];
			service.getContacts.mockResolvedValue(contacts);

			const result = await controller.getContacts(makeReq('owner-1'));

			expect(result).toBe(contacts);
			expect(service.getContacts).toHaveBeenCalledWith('owner-1');
		});
	});

	describe('addContact', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			const dto: AddContactDto = { contactId: 'contact-1' } as AddContactDto;
			const created = { id: 'c1' } as Contact;
			service.addContact.mockResolvedValue(created);

			const result = await controller.addContact(dto, makeReq('owner-1'));

			expect(result).toBe(created);
			expect(service.addContact).toHaveBeenCalledWith('owner-1', dto);
		});
	});

	describe('updateContact', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			const dto: UpdateContactDto = { nickname: 'Bob' } as UpdateContactDto;
			const updated = { id: 'c1', nickname: 'Bob' } as Contact;
			service.updateContact.mockResolvedValue(updated);

			const result = await controller.updateContact('contact-1', dto, makeReq('owner-1'));

			expect(result).toBe(updated);
			expect(service.updateContact).toHaveBeenCalledWith('owner-1', 'contact-1', dto);
		});
	});

	describe('removeContact', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			service.removeContact.mockResolvedValue(undefined);

			await controller.removeContact('contact-1', makeReq('owner-1'));

			expect(service.removeContact).toHaveBeenCalledWith('owner-1', 'contact-1');
		});
	});
});
