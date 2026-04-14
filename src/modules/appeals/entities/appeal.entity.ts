import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';
import { UserSanction } from '../../sanctions/entities/user-sanction.entity';

@Entity({ name: 'appeals', schema: 'users' })
export class Appeal {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@ManyToOne(() => UserSanction, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'sanction_id' })
	sanction: UserSanction;

	@Column({ name: 'sanction_id', type: 'uuid' })
	sanctionId: string;

	@Column({ type: 'text' })
	reason: string;

	@Column({ type: 'jsonb', default: {} })
	evidence: Record<string, any>;

	@Column({ type: 'varchar', length: 20, default: 'pending' })
	status: 'pending' | 'under_review' | 'accepted' | 'rejected';

	@Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
	reviewerId: string | null;

	@Column({ name: 'reviewer_notes', type: 'text', nullable: true })
	reviewerNotes: string | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
	resolvedAt: Date | null;
}
