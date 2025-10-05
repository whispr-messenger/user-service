import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PrivacyService } from './privacy.service';
import { UpdatePrivacySettingsDto } from '../dto';
import { PrivacySettings } from '../entities';

@ApiTags('privacy')
@ApiBearerAuth()
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user privacy settings' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Privacy settings retrieved successfully',
    type: PrivacySettings,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Privacy settings not found',
  })
  async getPrivacySettings(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PrivacySettings> {
    return this.privacyService.getPrivacySettings(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user privacy settings' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Privacy settings updated successfully',
    type: PrivacySettings,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Privacy settings not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async updatePrivacySettings(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updatePrivacySettingsDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettings> {
    return this.privacyService.updatePrivacySettings(
      userId,
      updatePrivacySettingsDto,
    );
  }

  @Get(':userId/can-view-profile-picture/:viewerId')
  @ApiOperation({ summary: 'Check if viewer can see profile picture' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID',
  })
  @ApiParam({
    name: 'viewerId',
    type: 'string',
    format: 'uuid',
    description: 'Viewer user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    schema: { type: 'boolean' },
  })
  async canViewProfilePicture(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('viewerId', ParseUUIDPipe) viewerId: string,
  ): Promise<boolean> {
    return this.privacyService.canViewProfilePicture(viewerId, userId);
  }

  @Get(':userId/can-view-first-name/:viewerId')
  @ApiOperation({ summary: 'Check if viewer can see first name' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID',
  })
  @ApiParam({
    name: 'viewerId',
    type: 'string',
    format: 'uuid',
    description: 'Viewer user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    schema: { type: 'boolean' },
  })
  async canViewFirstName(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('viewerId', ParseUUIDPipe) viewerId: string,
  ): Promise<boolean> {
    return this.privacyService.canViewFirstName(viewerId, userId);
  }

  @Get(':userId/can-view-last-name/:viewerId')
  @ApiOperation({ summary: 'Check if viewer can see last name' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID',
  })
  @ApiParam({
    name: 'viewerId',
    type: 'string',
    format: 'uuid',
    description: 'Viewer user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    schema: { type: 'boolean' },
  })
  async canViewLastName(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('viewerId', ParseUUIDPipe) viewerId: string,
  ): Promise<boolean> {
    return this.privacyService.canViewLastName(viewerId, userId);
  }

  @Get(':userId/can-view-biography/:viewerId')
  @ApiOperation({ summary: 'Check if viewer can see biography' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID',
  })
  @ApiParam({
    name: 'viewerId',
    type: 'string',
    format: 'uuid',
    description: 'Viewer user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    schema: { type: 'boolean' },
  })
  async canViewBiography(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('viewerId', ParseUUIDPipe) viewerId: string,
  ): Promise<boolean> {
    return this.privacyService.canViewBiography(viewerId, userId);
  }

  @Get(':userId/can-view-last-seen/:viewerId')
  @ApiOperation({ summary: 'Check if viewer can see last seen' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID',
  })
  @ApiParam({
    name: 'viewerId',
    type: 'string',
    format: 'uuid',
    description: 'Viewer user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    schema: { type: 'boolean' },
  })
  async canViewLastSeen(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('viewerId', ParseUUIDPipe) viewerId: string,
  ): Promise<boolean> {
    return this.privacyService.canViewLastSeen(viewerId, userId);
  }
}
