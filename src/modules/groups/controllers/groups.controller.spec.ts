import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from '../services/groups.service';
import { Group } from '../entities/group.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

const makeReq = (sub: string) => ({ user: { sub } }) as any;

describe('GroupsController', () => {
	let controller: GroupsController;
	let service: jest.Mocked<GroupsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [GroupsController],
			providers: [
				{
					provide: GroupsService,
					useValue: {
						getGroups: jest.fn(),
						createGroup: jest.fn(),
						updateGroup: jest.fn(),
						deleteGroup: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<GroupsController>(GroupsController);
		service = module.get(GroupsService);
	});

	describe('getGroups', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			const paginated = { data: [{ id: 'g1' }] as Group[], nextCursor: null, hasMore: false };
			service.getGroups.mockResolvedValue(paginated);

			const result = await controller.getGroups({}, makeReq('owner-1'));

			expect(result).toEqual(paginated);
			expect(service.getGroups).toHaveBeenCalledWith('owner-1', undefined, undefined);
		});
	});

	describe('createGroup', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			const dto: CreateGroupDto = { name: 'Friends' } as CreateGroupDto;
			const created = { id: 'g1' } as Group;
			service.createGroup.mockResolvedValue(created);

			const result = await controller.createGroup(dto, makeReq('owner-1'));

			expect(result).toBe(created);
			expect(service.createGroup).toHaveBeenCalledWith('owner-1', dto);
		});
	});

	describe('updateGroup', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			const dto: UpdateGroupDto = { name: 'Family' } as UpdateGroupDto;
			const updated = { id: 'g1', name: 'Family' } as Group;
			service.updateGroup.mockResolvedValue(updated);

			const result = await controller.updateGroup('g1', dto, makeReq('owner-1'));

			expect(result).toBe(updated);
			expect(service.updateGroup).toHaveBeenCalledWith('owner-1', 'g1', dto);
		});
	});

	describe('deleteGroup', () => {
		it('delegates to the service using req.user.sub as ownerId', async () => {
			service.deleteGroup.mockResolvedValue(undefined);

			await controller.deleteGroup('g1', makeReq('owner-1'));

			expect(service.deleteGroup).toHaveBeenCalledWith('owner-1', 'g1');
		});
	});
});
