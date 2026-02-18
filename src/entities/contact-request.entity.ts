import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ContactRequestStatus {
	PENDING = 'pending',
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
}

@Entity('contact_requests')
@Index(['senderId', 'receiverId'], { unique: true })
export class ContactRequest {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	senderId: string;

	@Column({ type: 'uuid' })
	receiverId: string;

	@Column({
		type: 'enum',
		enum: ContactRequestStatus,
		default: ContactRequestStatus.PENDING,
	})
	status: ContactRequestStatus;

	@Column({ type: 'text', nullable: true })
	message: string;

	@CreateDateColumn()
	sentAt: Date;

	@Column({ type: 'timestamp', nullable: true })
	respondedAt: Date;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'senderId' })
	sender: User;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'receiverId' })
	receiver: User;
}
