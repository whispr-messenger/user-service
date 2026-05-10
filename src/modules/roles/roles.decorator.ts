import { SetMetadata } from '@nestjs/common';

export const ROLES_METADATA_KEY = 'roles';
export type AllowedRole = 'admin' | 'moderator';

export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
