import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_search_index')
export class UserSearchIndex {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  phoneNumberHash: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  usernameNormalized: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  firstNameNormalized: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  lastNameNormalized: string;

  @OneToOne(() => User, (user) => user.searchIndex)
  @JoinColumn({ name: 'userId' })
  user: User;
}
