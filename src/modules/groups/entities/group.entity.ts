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

@Entity({ name: 'groups' })
export class Group {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'owner_id' })
	owner: User;

	@Column({ name: 'owner_id', type: 'uuid' })
	ownerId: string;

	@Column({ name: 'name', type: 'varchar', length: 100 })
	name: string;

	@Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
	description: string | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
