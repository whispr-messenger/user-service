import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories';

/**
 * CommonModule - Shared user entities and repositories
 *
 * This module provides common user-related infrastructure that can be shared
 * across multiple user sub-modules (accounts, profiles, contacts, etc.).
 *
 * Exports:
 * - UserRepository: For user data access operations
 */
@Module({
	imports: [TypeOrmModule.forFeature([User])],
	providers: [UserRepository],
	exports: [UserRepository],
})
export class CommonModule {}
