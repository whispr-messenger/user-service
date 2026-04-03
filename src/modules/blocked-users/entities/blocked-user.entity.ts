import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'blocked_users' })
@Unique(['blockerId', 'blockedId'])
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
