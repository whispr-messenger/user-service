import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Relations to PrivacySettings, Contact, BlockedUser, Group, GroupMember and UserSearchIndex
// are restored incrementally as each module is integrated (WHISPR-319 to WHISPR-324).

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
}
