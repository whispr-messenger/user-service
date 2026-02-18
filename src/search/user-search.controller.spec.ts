import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchController } from './user-search.controller';
import { UserSearchService, UserSearchResult } from './user-search.service';

describe('UserSearchController', () => {
	let controller: UserSearchController;

	const mockUserSearchResult: UserSearchResult = {
		id: 'user-id',
		username: 'testuser',
		firstName: 'Test',
		lastName: 'User',
		phoneNumber: '+1234567890',
		profilePictureUrl: 'http://example.com/pic.jpg',
		isActive: true,
		canViewProfile: true,
		canViewPhoneNumber: true,
		canViewFirstName: true,
		canViewLastName: true,
	};

	const mockUserSearchService = {
		searchByPhoneNumber: jest.fn(),
		searchByUsername: jest.fn(),
		searchByName: jest.fn(),
		advancedSearch: jest.fn(),
		getSearchSuggestions: jest.fn(),
		rebuildSearchIndexes: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UserSearchController],
			providers: [
				{
					provide: UserSearchService,
					useValue: mockUserSearchService,
				},
			],
		}).compile();

		controller = module.get<UserSearchController>(UserSearchController);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('searchByPhoneNumber', () => {
		it('should search by phone number', async () => {
			mockUserSearchService.searchByPhoneNumber.mockResolvedValue(mockUserSearchResult);
			const result = await controller.searchByPhoneNumber('+1234567890', 'viewer-id', true);
			expect(result).toEqual(mockUserSearchResult);
			expect(mockUserSearchService.searchByPhoneNumber).toHaveBeenCalledWith('+1234567890', {
				viewerId: 'viewer-id',
				includeInactive: true,
			});
		});

		it('should search by phone number with default options', async () => {
			mockUserSearchService.searchByPhoneNumber.mockResolvedValue(mockUserSearchResult);
			const result = await controller.searchByPhoneNumber('+1234567890');
			expect(result).toEqual(mockUserSearchResult);
			expect(mockUserSearchService.searchByPhoneNumber).toHaveBeenCalledWith('+1234567890', {
				viewerId: undefined,
				includeInactive: undefined,
			});
		});
	});

	describe('searchByUsername', () => {
		it('should search by username', async () => {
			mockUserSearchService.searchByUsername.mockResolvedValue(mockUserSearchResult);
			const result = await controller.searchByUsername('testuser', 'viewer-id', true);
			expect(result).toEqual(mockUserSearchResult);
			expect(mockUserSearchService.searchByUsername).toHaveBeenCalledWith('testuser', {
				viewerId: 'viewer-id',
				includeInactive: true,
			});
		});

		it('should search by username with default options', async () => {
			mockUserSearchService.searchByUsername.mockResolvedValue(mockUserSearchResult);
			const result = await controller.searchByUsername('testuser');
			expect(result).toEqual(mockUserSearchResult);
			expect(mockUserSearchService.searchByUsername).toHaveBeenCalledWith('testuser', {
				viewerId: undefined,
				includeInactive: undefined,
			});
		});
	});

	describe('searchByName', () => {
		it('should search by name', async () => {
			mockUserSearchService.searchByName.mockResolvedValue([mockUserSearchResult]);
			const result = await controller.searchByName('Test', 'viewer-id', 10, 5, true);
			expect(result).toEqual([mockUserSearchResult]);
			expect(mockUserSearchService.searchByName).toHaveBeenCalledWith('Test', {
				viewerId: 'viewer-id',
				limit: 10,
				offset: 5,
				includeInactive: true,
			});
		});

		it('should search by name with default options', async () => {
			mockUserSearchService.searchByName.mockResolvedValue([mockUserSearchResult]);
			const result = await controller.searchByName('Test');
			expect(result).toEqual([mockUserSearchResult]);
			expect(mockUserSearchService.searchByName).toHaveBeenCalledWith('Test', {
				viewerId: undefined,
				limit: undefined,
				offset: undefined,
				includeInactive: undefined,
			});
		});
	});

	describe('advancedSearch', () => {
		it('should perform advanced search', async () => {
			mockUserSearchService.advancedSearch.mockResolvedValue([mockUserSearchResult]);
			const result = await controller.advancedSearch(
				'+1234567890',
				'testuser',
				'Test',
				'User',
				'Test User',
				'viewer-id',
				10,
				5,
				true
			);
			expect(result).toEqual([mockUserSearchResult]);
			expect(mockUserSearchService.advancedSearch).toHaveBeenCalledWith(
				{
					phoneNumber: '+1234567890',
					username: 'testuser',
					firstName: 'Test',
					lastName: 'User',
					fullName: 'Test User',
				},
				{ viewerId: 'viewer-id', limit: 10, offset: 5, includeInactive: true }
			);
		});

		it('should perform advanced search with default options', async () => {
			mockUserSearchService.advancedSearch.mockResolvedValue([mockUserSearchResult]);
			const result = await controller.advancedSearch();
			expect(result).toEqual([mockUserSearchResult]);
			expect(mockUserSearchService.advancedSearch).toHaveBeenCalledWith(
				{
					phoneNumber: undefined,
					username: undefined,
					firstName: undefined,
					lastName: undefined,
					fullName: undefined,
				},
				{ viewerId: undefined, limit: undefined, offset: undefined, includeInactive: undefined }
			);
		});
	});

	describe('getSearchSuggestions', () => {
		it('should return search suggestions', async () => {
			const suggestions = ['suggestion1', 'suggestion2'];
			mockUserSearchService.getSearchSuggestions.mockResolvedValue(suggestions);
			const result = await controller.getSearchSuggestions('sugg', 5, true);
			expect(result).toEqual(suggestions);
			expect(mockUserSearchService.getSearchSuggestions).toHaveBeenCalledWith('sugg', {
				limit: 5,
				includeInactive: true,
			});
		});

		it('should return search suggestions with default options', async () => {
			const suggestions = ['suggestion1', 'suggestion2'];
			mockUserSearchService.getSearchSuggestions.mockResolvedValue(suggestions);
			const result = await controller.getSearchSuggestions('sugg');
			expect(result).toEqual(suggestions);
			expect(mockUserSearchService.getSearchSuggestions).toHaveBeenCalledWith('sugg', {
				limit: undefined,
				includeInactive: undefined,
			});
		});
	});

	describe('rebuildSearchIndexes', () => {
		it('should rebuild search indexes', async () => {
			mockUserSearchService.rebuildSearchIndexes.mockResolvedValue(undefined);
			const result = await controller.rebuildSearchIndexes();
			expect(result).toEqual({ message: 'Search indexes rebuilt successfully' });
			expect(mockUserSearchService.rebuildSearchIndexes).toHaveBeenCalled();
		});
	});
});
