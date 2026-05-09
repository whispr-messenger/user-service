import 'reflect-metadata';
import { validate } from 'class-validator';
import { BatchProfilesRequestDto } from './batch-profiles-request.dto';

function makeDto(ids: string[]): BatchProfilesRequestDto {
	const dto = new BatchProfilesRequestDto();
	dto.ids = ids;
	return dto;
}

describe('BatchProfilesRequestDto', () => {
	describe('ids validation', () => {
		it('accepte un UUID v4 standard', async () => {
			const errors = await validate(makeDto(['dd536f14-71c9-45c8-8b4f-1c912b8e3d43']));
			expect(errors).toHaveLength(0);
		});

		it('accepte un UUID v4 standard en majuscules', async () => {
			const errors = await validate(makeDto(['DD536F14-71C9-45C8-8B4F-1C912B8E3D43']));
			expect(errors).toHaveLength(0);
		});

		// IDs seed du messaging-service : nibble de version = 0 (non-RFC)
		// Ces IDs sont en production et doivent passer la validation.
		it('accepte les IDs seed messaging-service (nibble version 0)', async () => {
			const errors = await validate(
				makeDto([
					'a0000002-0000-0000-0000-000000000002',
					'a0000005-0000-0000-0000-000000000005',
					'a0000008-0000-0000-0000-000000000008',
					'a0000001-0000-0000-0000-000000000001',
				])
			);
			expect(errors).toHaveLength(0);
		});

		it('accepte un mix UUID RFC et UUID seed', async () => {
			const errors = await validate(
				makeDto(['dd536f14-71c9-45c8-8b4f-1c912b8e3d43', 'a0000002-0000-0000-0000-000000000002'])
			);
			expect(errors).toHaveLength(0);
		});

		it('rejette une chaine non-UUID', async () => {
			const errors = await validate(makeDto(['not-a-uuid']));
			expect(errors.length).toBeGreaterThan(0);
		});

		it('rejette un UUID avec un segment manquant', async () => {
			const errors = await validate(makeDto(['dd536f14-71c9-45c8-8b4f']));
			expect(errors.length).toBeGreaterThan(0);
		});

		it('rejette un tableau vide (ArrayMinSize)', async () => {
			const errors = await validate(makeDto([]));
			expect(errors.length).toBeGreaterThan(0);
		});

		it('rejette plus de 100 ids (ArrayMaxSize)', async () => {
			const ids = Array.from(
				{ length: 101 },
				(_, i) => `a${String(i).padStart(7, '0')}-0000-0000-0000-${String(i).padStart(12, '0')}`
			);
			const errors = await validate(makeDto(ids));
			expect(errors.length).toBeGreaterThan(0);
		});

		it('accepte exactement 100 ids (limite haute)', async () => {
			const ids = Array.from(
				{ length: 100 },
				(_, i) => `a${String(i).padStart(7, '0')}-0000-0000-0000-${String(i).padStart(12, '0')}`
			);
			const errors = await validate(makeDto(ids));
			expect(errors).toHaveLength(0);
		});
	});
});
