import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
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
		it('returns the contacts when the caller owns them', async () => {
			const paginated = { data: [{ id: 'c1' }] as Contact[], nextCursor: null, hasMore: false };
			service.getContacts.mockResolvedValue(paginated);

			const result = await controller.getContacts('owner-1', {}, makeReq('owner-1'));

			expect(result).toEqual(paginated);
			expect(service.getContacts).toHaveBeenCalledWith('owner-1', undefined, undefined);
		});

		it('throws Forbidden when the caller targets another user', async () => {
			await expect(controller.getContacts('owner-1', {}, makeReq('other'))).rejects.toThrow(
				ForbiddenException
			);
			expect(service.getContacts).not.toHaveBeenCalled();
		});
	});

	describe('addContact', () => {
		it('delegates to the service for the caller', async () => {
			const dto: AddContactDto = { contactId: 'contact-1' } as AddContactDto;
			const created = { id: 'c1' } as Contact;
			service.addContact.mockResolvedValue(created);

			const result = await controller.addContact('owner-1', dto, makeReq('owner-1'));

			expect(result).toBe(created);
			expect(service.addContact).toHaveBeenCalledWith('owner-1', dto);
		});

		it('throws Forbidden when the caller targets another user', async () => {
			const dto: AddContactDto = { contactId: 'contact-1' } as AddContactDto;

			await expect(controller.addContact('owner-1', dto, makeReq('other'))).rejects.toThrow(
				ForbiddenException
			);
			expect(service.addContact).not.toHaveBeenCalled();
		});
	});

	describe('updateContact', () => {
		it('delegates to the service for the caller', async () => {
			const dto: UpdateContactDto = { nickname: 'Bob' } as UpdateContactDto;
			const updated = { id: 'c1', nickname: 'Bob' } as Contact;
			service.updateContact.mockResolvedValue(updated);

			const result = await controller.updateContact('owner-1', 'contact-1', dto, makeReq('owner-1'));

			expect(result).toBe(updated);
			expect(service.updateContact).toHaveBeenCalledWith('owner-1', 'contact-1', dto);
		});

		it('throws Forbidden when the caller targets another user', async () => {
			await expect(
				controller.updateContact('owner-1', 'contact-1', {} as UpdateContactDto, makeReq('other'))
			).rejects.toThrow(ForbiddenException);
			expect(service.updateContact).not.toHaveBeenCalled();
		});
	});

	describe('removeContact', () => {
		it('delegates to the service for the caller', async () => {
			service.removeContact.mockResolvedValue(undefined);

			await controller.removeContact('owner-1', 'contact-1', makeReq('owner-1'));

			expect(service.removeContact).toHaveBeenCalledWith('owner-1', 'contact-1');
		});

		it('throws Forbidden when the caller targets another user', async () => {
			await expect(controller.removeContact('owner-1', 'contact-1', makeReq('other'))).rejects.toThrow(
				ForbiddenException
			);
			expect(service.removeContact).not.toHaveBeenCalled();
		});
	});
});
