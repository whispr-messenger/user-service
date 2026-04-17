import {
	IsUUID,
	IsString,
	IsOptional,
	IsObject,
	IsEnum,
	ValidateIf,
	registerDecorator,
	ValidationOptions,
	ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppealTypeEnum {
	SANCTION = 'sanction',
	BLOCKED_IMAGE = 'blocked_image',
}

// Max size for base64-encoded thumbnail: ~100KB (base64 overhead ~33% → ~75KB raw)
const MAX_THUMBNAIL_BASE64_LENGTH = 100 * 1024;

function IsBlockedImageEvidence(validationOptions?: ValidationOptions) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			name: 'isBlockedImageEvidence',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown, args: ValidationArguments) {
					const obj = args.object as CreateAppealDto;
					if (obj.type !== AppealTypeEnum.BLOCKED_IMAGE) {
						return true;
					}
					if (!value || typeof value !== 'object') return false;
					const ev = value as Record<string, unknown>;
					if (typeof ev.thumbnailBase64 !== 'string' || ev.thumbnailBase64.length === 0) {
						return false;
					}
					if (ev.thumbnailBase64.length > MAX_THUMBNAIL_BASE64_LENGTH) {
						return false;
					}
					if (typeof ev.conversationId !== 'string' || ev.conversationId.length === 0) {
						return false;
					}
					if (typeof ev.messageTempId !== 'string' || ev.messageTempId.length === 0) {
						return false;
					}
					return true;
				},
				defaultMessage(): string {
					return `evidence for blocked_image appeals must include thumbnailBase64 (<=${MAX_THUMBNAIL_BASE64_LENGTH} chars), conversationId and messageTempId`;
				},
			},
		});
	};
}

export class CreateAppealDto {
	@ApiPropertyOptional({ description: 'Sanction to appeal (required when type=sanction)' })
	@ValidateIf((o: CreateAppealDto) => o.type !== AppealTypeEnum.BLOCKED_IMAGE)
	@IsUUID()
	sanctionId?: string;

	@ApiPropertyOptional({
		enum: AppealTypeEnum,
		description: 'Appeal type',
		default: AppealTypeEnum.SANCTION,
	})
	@IsOptional()
	@IsEnum(AppealTypeEnum)
	type?: AppealTypeEnum = AppealTypeEnum.SANCTION;

	@ApiProperty({ description: 'Reason for the appeal' })
	@IsString()
	reason: string;

	@ApiPropertyOptional({ description: 'Supporting evidence' })
	@ValidateIf((o: CreateAppealDto) => o.type === AppealTypeEnum.BLOCKED_IMAGE || o.evidence !== undefined)
	@IsObject()
	@IsBlockedImageEvidence()
	evidence?: Record<string, any>;
}
