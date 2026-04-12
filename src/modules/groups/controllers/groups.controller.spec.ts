import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
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
		it('delegates to the service', async () => {
			const groups = [{ id: 'g1' }] as Group[];
			service.getGroups.mockResolvedValue(groups);

			const result = await controller.getGroups('owner-1', makeReq('owner-1'));

			expect(result).toBe(groups);
			expect(service.getGroups).toHaveBeenCalledWith('owner-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.getGroups('owner-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('createGroup', () => {
		it('delegates to the service', async () => {
			const dto: CreateGroupDto = { name: 'Friends' } as CreateGroupDto;
			const created = { id: 'g1' } as Group;
			service.createGroup.mockResolvedValue(created);

			const result = await controller.createGroup('owner-1', dto, makeReq('owner-1'));

			expect(result).toBe(created);
			expect(service.createGroup).toHaveBeenCalledWith('owner-1', dto);
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			const dto: CreateGroupDto = { name: 'Friends' } as CreateGroupDto;
			await expect(controller.createGroup('owner-1', dto, makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('updateGroup', () => {
		it('delegates to the service', async () => {
			const dto: UpdateGroupDto = { name: 'Family' } as UpdateGroupDto;
			const updated = { id: 'g1', name: 'Family' } as Group;
			service.updateGroup.mockResolvedValue(updated);

			const result = await controller.updateGroup('owner-1', 'g1', dto, makeReq('owner-1'));

			expect(result).toBe(updated);
			expect(service.updateGroup).toHaveBeenCalledWith('owner-1', 'g1', dto);
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			const dto: UpdateGroupDto = { name: 'Family' } as UpdateGroupDto;
			await expect(controller.updateGroup('owner-1', 'g1', dto, makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('deleteGroup', () => {
		it('delegates to the service', async () => {
			service.deleteGroup.mockResolvedValue(undefined);

			await controller.deleteGroup('owner-1', 'g1', makeReq('owner-1'));

			expect(service.deleteGroup).toHaveBeenCalledWith('owner-1', 'g1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.deleteGroup('owner-1', 'g1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});
});
