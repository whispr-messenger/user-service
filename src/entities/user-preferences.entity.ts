import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: 'dark' })
  theme: string; // 'dark' | 'light'

  @Column({ type: 'varchar', length: 20, default: 'black' })
  backgroundType: string; // 'black' | 'color' | 'gradient'

  @Column({ type: 'varchar', length: 20, default: '#000000' })
  backgroundColor: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUri: string | null;

  @Column({ name: 'background_image_id', type: 'varchar', length: 100, nullable: true })
  backgroundImageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}