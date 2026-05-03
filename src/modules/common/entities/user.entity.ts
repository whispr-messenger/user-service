import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	OneToOne,
} from 'typeorm';
import { PrivacySettings } from '../../privacy/entities/privacy-settings.entity';

export type UserThemePreference = 'light' | 'dark' | 'auto';
export type UserLanguagePreference = 'fr' | 'en';
export type UserFontSizePreference = 'small' | 'medium' | 'large';
export type UserBackgroundPresetPreference =
	| 'whispr'
	| 'midnight'
	| 'sunset'
	| 'aurora'
	| 'custom';

export interface UserVisualPreferences {
	theme?: UserThemePreference;
	language?: UserLanguagePreference;
	fontSize?: UserFontSizePreference;
	backgroundPreset?: UserBackgroundPresetPreference;
	backgroundMediaId?: string | null;
	backgroundMediaUrl?: string | null;
	updatedAt?: string | null;
}

@Entity({ name: 'users', schema: 'users' })
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 20, unique: true })
	phoneNumber: string;

	@Column({ type: 'varchar', length: 50, unique: true, nullable: true })
	username: string | null;

	@Column({ type: 'varchar', length: 100, nullable: true })
	firstName: string | null;

	@Column({ type: 'varchar', length: 100, nullable: true })
	lastName: string | null;

	@Column({ type: 'text', nullable: true })
	biography: string | null;

	@Column({ type: 'varchar', length: 500, nullable: true })
	profilePictureUrl: string | null;

	@Column({ type: 'jsonb', nullable: true })
	visualPreferences: UserVisualPreferences | null;

	@Column({ type: 'timestamp', nullable: true })
	lastSeen: Date | null;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@DeleteDateColumn({ name: 'deletedAt' })
	deletedAt: Date | null;

	@OneToOne(() => PrivacySettings, (ps) => ps.user)
	privacySettings?: PrivacySettings | null;
}
