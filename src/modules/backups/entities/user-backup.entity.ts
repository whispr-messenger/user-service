import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	JoinColumn,
	ManyToOne,
	Index,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'user_backups', schema: 'users' })
@Index('idx_user_backups_user_created_at', ['userId', 'createdAt'])
export class UserBackup {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'data', type: 'jsonb' })
	data: Record<string, unknown>;

	@Column({ name: 'size_bytes', type: 'integer', default: 0 })
	sizeBytes: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;
}
