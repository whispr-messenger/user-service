import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	JoinColumn,
	OneToOne,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

export enum PrivacyLevel {
	EVERYONE = 'everyone',
	CONTACTS = 'contacts',
	NOBODY = 'nobody',
}

export enum MediaAutoDownload {
	ALWAYS = 'always',
	WIFI_ONLY = 'wifi_only',
	NEVER = 'never',
}

@Entity({ name: 'privacy_settings' })
export class PrivacySettings {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@OneToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'profile_picture_privacy', type: 'varchar', default: PrivacyLevel.EVERYONE })
	profilePicturePrivacy: PrivacyLevel;

	@Column({ name: 'first_name_privacy', type: 'varchar', default: PrivacyLevel.EVERYONE })
	firstNamePrivacy: PrivacyLevel;

	@Column({ name: 'last_name_privacy', type: 'varchar', default: PrivacyLevel.CONTACTS })
	lastNamePrivacy: PrivacyLevel;

	@Column({ name: 'biography_privacy', type: 'varchar', default: PrivacyLevel.EVERYONE })
	biographyPrivacy: PrivacyLevel;

	@Column({ name: 'last_seen_privacy', type: 'varchar', default: PrivacyLevel.CONTACTS })
	lastSeenPrivacy: PrivacyLevel;

	@Column({ name: 'search_by_phone', type: 'boolean', default: true })
	searchByPhone: boolean;

	@Column({ name: 'search_by_username', type: 'boolean', default: true })
	searchByUsername: boolean;

	@Column({ name: 'read_receipts', type: 'boolean', default: true })
	readReceipts: boolean;

	@Column({ name: 'online_status', type: 'varchar', default: PrivacyLevel.CONTACTS })
	onlineStatus: PrivacyLevel;

	@Column({ name: 'group_add_permission', type: 'varchar', default: PrivacyLevel.CONTACTS })
	groupAddPermission: PrivacyLevel;

	@Column({
		name: 'media_auto_download',
		type: 'varchar',
		length: 10,
		default: MediaAutoDownload.WIFI_ONLY,
	})
	mediaAutoDownload: MediaAutoDownload;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
