import { Body, Controller, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { UserResponseDto } from '../../common/dto/user-response.dto';
import { BatchProfilesRequestDto } from '../dto/batch-profiles-request.dto';
import { BatchProfilesResponseDto } from '../dto/batch-profiles-response.dto';
import { ProfileService } from '../services/profile.service';

// WHISPR-1349 - endpoint batch pour eviter le burst de N requetes
// /profile/:id quand la mobile-app charge ConversationsList. Permet
// 10 batch/s = 1000 profils/s en theorie sans declencher le throttler.
// Suit WHISPR-1343 (concurrency cote mobile) et WHISPR-1344 (relachement
// du throttler unitaire). Endpoint authentifie, dedup et privacy par profil.
@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
	constructor(private readonly profileService: ProfileService) {}

	@Post('batch')
	@Throttle({
		short: { ttl: 1000, limit: 10 },
		medium: { ttl: 10_000, limit: 30 },
		long: { ttl: 60_000, limit: 100 },
	})
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Fetch multiple user profiles in a single request',
		description:
			'Retourne plusieurs profils utilisateurs en une seule requete pour eviter ' +
			'le burst de N appels /profile/:id. Applique les memes privacy gates que ' +
			"l'endpoint unitaire pour chaque profil retourne.",
	})
	@ApiBody({ type: BatchProfilesRequestDto })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Profiles retrieved successfully',
		type: BatchProfilesResponseDto,
	})
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request body' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded' })
	async batch(
		@Body() dto: BatchProfilesRequestDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<BatchProfilesResponseDto> {
		const requesterId: string = req.user?.sub ?? '';
		const authorization = (req.headers['authorization'] as string | undefined) ?? undefined;

		// Dedup cote serveur : evite de presigner deux fois la meme URL
		// si le mobile envoie un id en double.
		const uniqueIds = Array.from(new Set(dto.ids));

		const { profiles, missing } = await this.profileService.getProfilesBatch(
			uniqueIds,
			requesterId,
			authorization
		);

		const response = new BatchProfilesResponseDto();
		response.profiles = profiles.map((user) => UserResponseDto.fromEntity(user));
		response.missing = missing;
		return response;
	}
}
