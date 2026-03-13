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
import { Group } from './group.entity';

export enum GroupRole {
	ADMIN = 'admin',
	MEMBER = 'member',
}

@Entity({ name: 'group_members', schema: 'users' })
@Unique(['groupId', 'userId'])
export class GroupMember {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => Group, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@Column({ name: 'group_id', type: 'uuid' })
	groupId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ type: 'enum', enum: GroupRole, default: GroupRole.MEMBER })
	role: GroupRole;

	@CreateDateColumn({ name: 'joined_at' })
	joinedAt: Date;
}
