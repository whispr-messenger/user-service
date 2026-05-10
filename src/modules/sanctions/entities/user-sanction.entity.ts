import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'user_sanctions', schema: 'users' })
@Index('IDX_user_sanctions_user_id', ['userId'])
@Index('IDX_user_sanctions_user_active', ['userId', 'active'])
export class UserSanction {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 20 })
	type: 'warning' | 'temp_ban' | 'perm_ban';

	@Column({ type: 'text' })
	reason: string;

	@Column({ name: 'evidence_ref', type: 'jsonb', default: {} })
	evidenceRef: Record<string, any>;

	@Column({ name: 'issued_by', type: 'uuid' })
	issuedBy: string;

	@Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
	expiresAt: Date | null;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
