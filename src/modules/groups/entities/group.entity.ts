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

@Entity({ name: 'groups', schema: 'users' })
export class Group {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 100 })
	name: string;

	@Column({ type: 'text', nullable: true })
	description: string | null;

	@Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
	photoUrl: string | null;

	@ManyToOne(() => User, { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'created_by' })
	createdByUser: User;

	@Column({ name: 'created_by', type: 'uuid' })
	createdBy: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
