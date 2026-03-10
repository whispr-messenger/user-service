import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	OneToMany,
} from 'typeorm';

// These modules are integrated in future tickets (WHISPR-319 to WHISPR-324).
// Relations use lazy require() so TypeORM resolves them at runtime without
// requiring the files to exist at compile time.

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

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToOne(() => require('../../privacy/privacy-settings.entity').PrivacySettings, (ps: any) => ps.user, {
		cascade: true,
	})
	privacySettings: any;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(() => require('../../contacts/contact.entity').Contact, (c: any) => c.user)
	contacts: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(() => require('../../contacts/contact.entity').Contact, (c: any) => c.contactUser)
	contactedBy: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(() => require('../../blocked-users/blocked-user.entity').BlockedUser, (b: any) => b.user)
	blockedUsers: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(
		() => require('../../blocked-users/blocked-user.entity').BlockedUser,
		(b: any) => b.blockedUser
	)
	blockedBy: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(() => require('../../groups/group.entity').Group, (g: any) => g.createdBy)
	createdGroups: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToMany(() => require('../../groups/group-member.entity').GroupMember, (gm: any) => gm.user)
	groupMemberships: any[];

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	@OneToOne(
		() => require('../../search/entities/user-search-index.entity').UserSearchIndex,
		(si: any) => si.user,
		{ cascade: true }
	)
	searchIndex: any;
}
