import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'webhooks', schema: 'users' })
export class Webhook {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 2048 })
	url: string;

	@Column({ type: 'jsonb', default: [] })
	events: string[];

	// secret: select false par defaut, addSelect explicite seulement quand on signe (WHISPR-1408)
	@Column({ type: 'varchar', length: 255, nullable: true, select: false })
	secret: string | null;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	@Column({ name: 'created_by', type: 'uuid' })
	createdBy: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
