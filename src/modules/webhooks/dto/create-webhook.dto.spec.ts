import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWebhookDto } from './create-webhook.dto';

describe('CreateWebhookDto', () => {
	const validate_ = async (input: Partial<CreateWebhookDto>) => {
		const dto = plainToInstance(CreateWebhookDto, input);
		return validate(dto);
	};

	it('accepts a valid https URL with TLD', async () => {
		const errors = await validate_({
			url: 'https://example.com/hook',
			events: ['sanction.created'],
		});
		expect(errors).toHaveLength(0);
	});

	it('rejects URL without protocol', async () => {
		const errors = await validate_({
			url: 'example.com/hook',
			events: ['sanction.created'],
		});
		expect(errors).not.toHaveLength(0);
		expect(errors[0].property).toBe('url');
	});

	it('rejects URL without TLD (e.g. localhost)', async () => {
		const errors = await validate_({
			url: 'http://localhost/hook',
			events: ['sanction.created'],
		});
		expect(errors).not.toHaveLength(0);
		expect(errors[0].property).toBe('url');
	});

	it('rejects URL longer than 2048 chars (DoS protection)', async () => {
		const huge = 'https://example.com/' + 'a'.repeat(2100);
		const errors = await validate_({
			url: huge,
			events: ['sanction.created'],
		});
		expect(errors).not.toHaveLength(0);
		expect(errors[0].property).toBe('url');
	});

	it('rejects non-string url', async () => {
		const errors = await validate_({
			url: 12345 as any,
			events: ['sanction.created'],
		});
		expect(errors).not.toHaveLength(0);
		expect(errors[0].property).toBe('url');
	});
});
