import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PrivacyLevel {
  EVERYONE = 'everyone',
  CONTACTS = 'contacts',
  NOBODY = 'nobody',
}

@Entity('privacy_settings')
export class PrivacySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.EVERYONE,
  })
  profilePicturePrivacy: PrivacyLevel;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.EVERYONE,
  })
  firstNamePrivacy: PrivacyLevel;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.CONTACTS,
  })
  lastNamePrivacy: PrivacyLevel;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.EVERYONE,
  })
  biographyPrivacy: PrivacyLevel;

  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.CONTACTS,
  })
  lastSeenPrivacy: PrivacyLevel;

  @Column({ type: 'boolean', default: true })
  searchByPhone: boolean;

  @Column({ type: 'boolean', default: true })
  searchByUsername: boolean;

  @Column({ type: 'boolean', default: true })
  readReceipts: boolean;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.privacySettings)
  @JoinColumn({ name: 'userId' })
  user: User;
}
