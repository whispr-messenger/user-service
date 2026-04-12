import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

export enum ContactRequestStatus {
	PENDING = 'pending',
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
}

@Entity({ name: 'contact_requests', schema: 'users' })
@Index('IDX_contact_requests_recipient_status', ['recipientId', 'status'])
@Index('IDX_contact_requests_requester_status', ['requesterId', 'status'])
@Index('UQ_contact_requests_pending', ['requesterId', 'recipientId'], {
	unique: true,
	where: `"status" = 'pending'`,
})
export class ContactRequest {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'requester_id', type: 'uuid' })
	requesterId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'requester_id' })
	requester: User;

	@Column({ name: 'recipient_id', type: 'uuid' })
	recipientId: string;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'recipient_id' })
	recipient: User;

	@Column({
		name: 'status',
		type: 'enum',
		enum: ContactRequestStatus,
		enumName: 'contact_requests_status_enum',
		default: ContactRequestStatus.PENDING,
	})
	status: ContactRequestStatus;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
