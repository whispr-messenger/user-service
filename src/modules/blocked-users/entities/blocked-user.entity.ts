import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
	Index,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'blocked_users', schema: 'users' })
@Unique(['blockerId', 'blockedId'])
@Index('IDX_blocked_users_blocker_id', ['blockerId'])
@Index('IDX_blocked_users_blocked_id', ['blockedId'])
export class BlockedUser {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'blocker_id' })
	blocker: User;

	@Column({ name: 'blocker_id', type: 'uuid' })
	blockerId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'blocked_id' })
	blocked: User;

	@Column({ name: 'blocked_id', type: 'uuid' })
	blockedId: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;
}
