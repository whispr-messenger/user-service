import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'contacts', schema: 'users' })
@Unique(['ownerId', 'contactId'])
export class Contact {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'owner_id' })
	owner: User;

	@Column({ name: 'owner_id', type: 'uuid' })
	ownerId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'contact_id' })
	contact: User;

	@Column({ name: 'contact_id', type: 'uuid' })
	contactId: string;

	@Column({ name: 'nickname', type: 'varchar', length: 100, nullable: true })
	nickname: string | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
