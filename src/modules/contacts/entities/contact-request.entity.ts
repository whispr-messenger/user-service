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

export enum ContactRequestStatus {
	PENDING = 'pending',
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
}

@Entity({ name: 'contact_requests', schema: 'users' })
@Unique(['requesterId', 'recipientId'])
export class ContactRequest {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'requester_id' })
	requester: User;

	@Column({ name: 'requester_id', type: 'uuid' })
	requesterId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'recipient_id' })
	recipient: User;

	@Column({ name: 'recipient_id', type: 'uuid' })
	recipientId: string;

	@Column({
		name: 'status',
		type: 'enum',
		enum: ContactRequestStatus,
		default: ContactRequestStatus.PENDING,
	})
	status: ContactRequestStatus;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
