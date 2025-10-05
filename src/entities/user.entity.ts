import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { PrivacySettings } from './privacy-settings.entity';
import { Contact } from './contact.entity';
import { BlockedUser } from './blocked-user.entity';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { UserSearchIndex } from './user-search-index.entity';

@Entity('users')
@Index(['phoneNumber'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  phoneNumber: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'text', nullable: true })
  biography: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => PrivacySettings, (privacySettings) => privacySettings.user, {
    cascade: true,
  })
  privacySettings: PrivacySettings;

  @OneToMany(() => Contact, (contact) => contact.user)
  contacts: Contact[];

  @OneToMany(() => Contact, (contact) => contact.contactUser)
  contactedBy: Contact[];

  @OneToMany(() => BlockedUser, (blockedUser) => blockedUser.user)
  blockedUsers: BlockedUser[];

  @OneToMany(() => BlockedUser, (blockedUser) => blockedUser.blockedUser)
  blockedBy: BlockedUser[];

  @OneToMany(() => Group, (group) => group.createdBy)
  createdGroups: Group[];

  @OneToMany(() => GroupMember, (groupMember) => groupMember.user)
  groupMemberships: GroupMember[];

  @OneToOne(() => UserSearchIndex, (searchIndex) => searchIndex.user, {
    cascade: true,
  })
  searchIndex: UserSearchIndex;
}
