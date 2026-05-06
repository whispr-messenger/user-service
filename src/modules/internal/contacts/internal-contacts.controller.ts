import { Controller, Get, HttpStatus, Query, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../../jwt-auth/public.decorator';
import { InternalAuthGuard } from '../internal-auth.guard';
import { InternalContactsService } from './internal-contacts.service';
import { CheckContactQueryDto } from './dto/check-contact-query.dto';
import { CheckContactResponseDto } from './dto/check-contact-response.dto';

@ApiTags('Internal')
@ApiSecurity('internal-token')
@Public()
@UseGuards(InternalAuthGuard)
@Controller({ path: 'internal/v1/contacts', version: VERSION_NEUTRAL })
export class InternalContactsController {
	constructor(private readonly internalContactsService: InternalContactsService) {}

	@Get('check')
	@ApiOperation({
		summary: 'Check whether two users are contacts and not blocked (machine-to-machine)',
		description:
			'Internal endpoint consumed by other Whispr services (e.g. messaging-service) to authorise direct conversations. Not exposed by the public API gateway.',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Relationship resolved (always 200, even when no contact row exists)',
		type: CheckContactResponseDto,
	})
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'ownerId or contactId is not a UUID' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid internal token' })
	async check(@Query() query: CheckContactQueryDto): Promise<CheckContactResponseDto> {
		return this.internalContactsService.checkContactRelation(query.ownerId, query.contactId);
	}
}
