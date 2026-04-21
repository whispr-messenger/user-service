import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from '../services/profile.service';
import { User } from '../../common/entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const makeReq = (
	sub: string,
	authorization?: string,
	host: string = 'api.test.local',
	proto: string = 'https'
): ExpressRequest & { user: JwtPayload } =>
	({
		user: { sub } as JwtPayload,
		headers: {
			...(authorization ? { authorization } : {}),
			host,
			'x-forwarded-proto': proto,
		},
	}) as unknown as ExpressRequest & { user: JwtPayload };

describe('ProfileController', () => {
	let controller: ProfileController;
	let service: jest.Mocked<ProfileService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ProfileController],
			providers: [
				{
					provide: ProfileService,
					useValue: {
						getProfileWithPrivacy: jest.fn(),
						updateProfile: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ProfileController>(ProfileController);
		service = module.get(ProfileService);
	});

	describe('getProfile', () => {
		it('delegates to the service with requesterId and returns a UserResponseDto', async () => {
			const user = {
				id: 'user-1',
				username: 'alice',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as User;
			(service as any).getProfileWithPrivacy.mockResolvedValue(user);

			const result = await controller.getProfile('user-1', makeReq('requester-1'));

			expect(result.id).toBe('user-1');
			expect(result.username).toBe('alice');
			expect((result as any).phoneNumber).toBeUndefined();
			expect((service as any).getProfileWithPrivacy).toHaveBeenCalledWith('user-1', 'requester-1');
		});
	});

	describe('updateProfile', () => {
		it('updates the profile when the caller is the owner and forwards the authorization header', async () => {
			const dto: UpdateProfileDto = { username: 'alice' } as UpdateProfileDto;
			const updated = {
				id: 'user-1',
				username: 'alice',
				createdAt: new Date(),
				updatedAt: new Date(),
			} as User;
			service.updateProfile.mockResolvedValue(updated);

			const result = await controller.updateProfile('user-1', dto, makeReq('user-1', 'Bearer token'));

			expect(result.id).toBe('user-1');
			expect((result as any).phoneNumber).toBeUndefined();
			expect(service.updateProfile).toHaveBeenCalledWith(
				'user-1',
				dto,
				'Bearer token',
				'https://api.test.local'
			);
		});

		it('passes undefined authorization when the header is missing', async () => {
			const dto: UpdateProfileDto = {} as UpdateProfileDto;
			const updated = { id: 'user-1' } as User;
			service.updateProfile.mockResolvedValue(updated);

			await controller.updateProfile('user-1', dto, makeReq('user-1'));

			expect(service.updateProfile).toHaveBeenCalledWith(
				'user-1',
				dto,
				undefined,
				'https://api.test.local'
			);
		});

		it('throws Forbidden when the caller targets another user', async () => {
			await expect(
				controller.updateProfile('user-1', {} as UpdateProfileDto, makeReq('other'))
			).rejects.toThrow(ForbiddenException);
			expect(service.updateProfile).not.toHaveBeenCalled();
		});
	});
});
