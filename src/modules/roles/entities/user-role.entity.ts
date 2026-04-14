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

@Entity({ name: 'user_roles', schema: 'users' })
@Unique(['userId'])
export class UserRole {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ type: 'varchar', length: 20, default: 'user' })
	role: 'user' | 'moderator' | 'admin';

	@Column({ name: 'granted_by', type: 'uuid' })
	grantedBy: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;
}
