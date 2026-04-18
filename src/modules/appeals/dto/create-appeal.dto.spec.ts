import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAppealDto, AppealTypeEnum } from './create-appeal.dto';

describe('CreateAppealDto', () => {
	const validUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

	async function validateDto(payload: Record<string, unknown>) {
		const dto = plainToInstance(CreateAppealDto, payload);
		return validate(dto);
	}

	describe('sanction appeals', () => {
		it('passes validation with a valid sanctionId and no evidence', async () => {
			const errors = await validateDto({
				sanctionId: validUuid,
				reason: 'I disagree',
			});
			expect(errors).toHaveLength(0);
		});

		it('fails when sanctionId is missing for sanction type', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.SANCTION,
				reason: 'no id',
			});
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.property === 'sanctionId')).toBe(true);
		});

		it('fails when sanctionId is not a UUID for sanction type', async () => {
			const errors = await validateDto({
				sanctionId: 'not-a-uuid',
				reason: 'bad id',
			});
			expect(errors.some((e) => e.property === 'sanctionId')).toBe(true);
		});
	});

	describe('blocked_image appeals — custom evidence validator', () => {
		const validEvidence = {
			thumbnailBase64: 'abc',
			conversationId: 'conv-1',
			messageTempId: 'tmp-1',
		};

		it('passes with complete evidence', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'false positive',
				evidence: validEvidence,
			});
			expect(errors).toHaveLength(0);
		});

		it('does not require sanctionId when type is blocked_image', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'ok',
				evidence: validEvidence,
			});
			expect(errors.some((e) => e.property === 'sanctionId')).toBe(false);
		});

		it('fails when evidence is missing', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'missing',
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when evidence is not an object', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'bad',
				evidence: 'not-an-object',
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when thumbnailBase64 is missing', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { conversationId: 'c', messageTempId: 'm' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when thumbnailBase64 is empty', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { ...validEvidence, thumbnailBase64: '' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when thumbnailBase64 exceeds 200KB', async () => {
			const huge = 'a'.repeat(200 * 1024 + 1);
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { ...validEvidence, thumbnailBase64: huge },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when conversationId is missing', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { thumbnailBase64: 'd', messageTempId: 'm' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when conversationId is empty', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { ...validEvidence, conversationId: '' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when messageTempId is missing', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { thumbnailBase64: 'd', conversationId: 'c' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});

		it('fails when messageTempId is empty', async () => {
			const errors = await validateDto({
				type: AppealTypeEnum.BLOCKED_IMAGE,
				reason: 'x',
				evidence: { ...validEvidence, messageTempId: '' },
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});
	});

	describe('custom validator — non blocked_image', () => {
		it('accepts any object evidence when type is sanction', async () => {
			const errors = await validateDto({
				sanctionId: validUuid,
				reason: 'ok',
				evidence: { anything: 'goes' },
			});
			expect(errors).toHaveLength(0);
		});

		it('rejects non-object evidence on sanction appeals via @IsObject', async () => {
			const errors = await validateDto({
				sanctionId: validUuid,
				reason: 'ok',
				evidence: 'string-value',
			});
			expect(errors.some((e) => e.property === 'evidence')).toBe(true);
		});
	});
});
