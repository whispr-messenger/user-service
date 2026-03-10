import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
} from 'typeorm';
import { PrivacySettings } from '../../privacy/privacy-settings.entity';
import { Contact } from '../../contacts/contact.entity';
import { BlockedUser } from '../../blocked-users/blocked-user.entity';
import { Group } from '../../groups/group.entity';
import { GroupMember } from '../../groups/group-member.entity';
import { UserSearchIndex } from '../../search/entities/user-search-index.entity';

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
	biography: string;

	@Column({ type: 'varchar', length: 500, nullable: true })
	profilePictureUrl: string;

	@Column({ type: 'timestamp', nullable: true })
	lastSeen: Date;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@OneToOne(() => PrivacySettings, (privacySettings: PrivacySettings) => privacySettings.user, {
		cascade: true,
	})
	privacySettings: PrivacySettings;

	@OneToMany(() => Contact, (contact: Contact) => contact.user)
	contacts: Contact[];

	@OneToMany(() => Contact, (contact: Contact) => contact.contactUser)
	contactedBy: Contact[];

	@OneToMany(() => BlockedUser, (blockedUser: BlockedUser) => blockedUser.user)
	blockedUsers: BlockedUser[];

	@OneToMany(() => BlockedUser, (blockedUser: BlockedUser) => blockedUser.blockedUser)
	blockedBy: BlockedUser[];

	@OneToMany(() => Group, (group: Group) => group.createdBy)
	createdGroups: Group[];

	@OneToMany(() => GroupMember, (groupMember: GroupMember) => groupMember.user)
	groupMemberships: GroupMember[];

	@OneToOne(() => UserSearchIndex, (searchIndex: UserSearchIndex) => searchIndex.user, { cascade: true })
	searchIndex: UserSearchIndex;
}
