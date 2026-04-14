import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'audit_logs', schema: 'users' })
export class AuditLog {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'actor_id', type: 'uuid' })
	actorId: string;

	@Column({ type: 'varchar' })
	action: string;

	@Column({ name: 'target_type', type: 'varchar' })
	targetType: string;

	@Column({ name: 'target_id', type: 'uuid' })
	targetId: string;

	@Column({ type: 'jsonb', default: {} })
	metadata: Record<string, any>;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;
}
