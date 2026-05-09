import {
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	UseGuards,
	VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../../jwt-auth/public.decorator';
import { InternalAuthGuard } from '../internal-auth.guard';
import { InternalPrivacyService } from './internal-privacy.service';
import { InternalPrivacyResponseDto } from './dto/internal-privacy-response.dto';

@ApiTags('Internal')
@ApiSecurity('internal-token')
@Public()
@UseGuards(InternalAuthGuard)
@Controller({ path: 'internal/v1/users', version: VERSION_NEUTRAL })
export class InternalPrivacyController {
	constructor(private readonly internalPrivacyService: InternalPrivacyService) {}

	@Get(':id/privacy')
	@ApiOperation({
		summary: 'Get privacy settings of a user (machine-to-machine)',
		description:
			'Internal endpoint consumed by other Whispr services (e.g. messaging-service) to gate broadcasts depending on the user privacy preferences (read_receipts, last_seen_privacy, online_status). Not exposed by the public API gateway.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Privacy settings retrieved successfully',
		type: InternalPrivacyResponseDto,
	})
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'id is not a UUID' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid internal token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getPrivacy(@Param('id', ParseUUIDPipe) id: string): Promise<InternalPrivacyResponseDto> {
		return this.internalPrivacyService.getPrivacyForInternal(id);
	}
}
