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
