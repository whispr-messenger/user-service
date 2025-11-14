import { Controller, Get, Put, Param, Body, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from '../dto';
import { UserPreferences } from '../entities';

@ApiTags('preferences')
@ApiBearerAuth()
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Obtenir les préférences UI de l’utilisateur' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'ID utilisateur' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Préférences récupérées', type: UserPreferences })
  async get(@Param('userId', ParseUUIDPipe) userId: string): Promise<UserPreferences> {
    return this.service.get(userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Mettre à jour les préférences UI de l’utilisateur' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'ID utilisateur' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Préférences mises à jour', type: UserPreferences })
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    return this.service.update(userId, dto);
  }
}