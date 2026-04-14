import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToOne,
	JoinColumn,
} from 'typeorm';
import { User } from '../../common/entities/user.entity';

@Entity({ name: 'user_reputation', schema: 'users' })
export class UserReputation {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@OneToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'user_id', type: 'uuid', unique: true })
	userId: string;

	@Column({ type: 'integer', default: 100 })
	score: number;

	@Column({ name: 'total_reports_received', type: 'integer', default: 0 })
	totalReportsReceived: number;

	@Column({ name: 'total_reports_filed', type: 'integer', default: 0 })
	totalReportsFiled: number;

	@Column({ name: 'total_sanctions', type: 'integer', default: 0 })
	totalSanctions: number;

	@Column({ name: 'total_appeals', type: 'integer', default: 0 })
	totalAppeals: number;

	@Column({ name: 'appeals_accepted', type: 'integer', default: 0 })
	appealsAccepted: number;

	@Column({ name: 'last_sanction_at', type: 'timestamptz', nullable: true })
	lastSanctionAt: Date | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
