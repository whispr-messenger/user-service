import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import { ProfilesController } from './profiles.controller';
import { ProfileService } from '../services/profile.service';
import { User } from '../../common/entities/user.entity';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { BatchProfilesRequestDto } from '../dto/batch-profiles-request.dto';

const makeReq = (sub: string, authorization?: string): ExpressRequest & { user: JwtPayload } =>
	({
		user: { sub } as JwtPayload,
		headers: {
			...(authorization ? { authorization } : {}),
		},
	}) as unknown as ExpressRequest & { user: JwtPayload };

const makeUser = (id: string, overrides: Partial<User> = {}): User =>
	({
		id,
		username: `user-${id}`,
		firstName: null,
		lastName: null,
		biography: null,
		profilePictureUrl: null,
		visualPreferences: null,
		lastSeen: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as User;

describe('ProfilesController', () => {
	let controller: ProfilesController;
	let service: jest.Mocked<ProfileService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ProfilesController],
			providers: [
				{
					provide: ProfileService,
					useValue: {
						getProfilesBatch: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ProfilesController>(ProfilesController);
		service = module.get(ProfileService);
	});

	describe('batch', () => {
		it('returns profiles and missing ids from the service', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({
				profiles: [makeUser('uuid-1'), makeUser('uuid-2')],
				missing: ['uuid-3'],
			});

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1', 'uuid-2', 'uuid-3'] };
			const result = await controller.batch(dto, makeReq('requester-1'));

			expect(result.profiles).toHaveLength(2);
			expect(result.profiles[0].id).toBe('uuid-1');
			expect(result.profiles[1].id).toBe('uuid-2');
			expect(result.missing).toEqual(['uuid-3']);
		});

		it('does not leak phoneNumber in the mapped UserResponseDto output', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({
				profiles: [makeUser('uuid-1', { phoneNumber: '+33600000001' } as Partial<User>)],
				missing: [],
			});

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1'] };
			const result = await controller.batch(dto, makeReq('requester-1'));

			expect((result.profiles[0] as any).phoneNumber).toBeUndefined();
		});

		it('dedupes duplicate ids before delegating to the service', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({
				profiles: [makeUser('uuid-1')],
				missing: [],
			});

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1', 'uuid-1', 'uuid-1'] };
			await controller.batch(dto, makeReq('requester-1'));

			expect(service.getProfilesBatch).toHaveBeenCalledWith(['uuid-1'], 'requester-1', undefined);
		});

		it('forwards the Authorization header so avatar URLs can be presigned', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({ profiles: [], missing: [] });

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1'] };
			await controller.batch(dto, makeReq('requester-1', 'Bearer token-xyz'));

			expect(service.getProfilesBatch).toHaveBeenCalledWith(
				['uuid-1'],
				'requester-1',
				'Bearer token-xyz'
			);
		});

		it('forwards the requester id from req.user.sub to the service', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({ profiles: [], missing: [] });

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1'] };
			await controller.batch(dto, makeReq('alice-sub'));

			expect(service.getProfilesBatch).toHaveBeenCalledWith(['uuid-1'], 'alice-sub', undefined);
		});

		it('returns empty arrays when the service yields no profiles', async () => {
			(service as any).getProfilesBatch.mockResolvedValue({ profiles: [], missing: [] });

			const dto: BatchProfilesRequestDto = { ids: ['uuid-1'] };
			const result = await controller.batch(dto, makeReq('requester-1'));

			expect(result.profiles).toEqual([]);
			expect(result.missing).toEqual([]);
		});
	});
});
