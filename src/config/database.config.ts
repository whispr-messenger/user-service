import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { 
  User,
  PrivacySettings,
  UserSearchIndex,
  Group,
  GroupMember,
  Contact,
  BlockedUser,
  Message,
} from '../entities';
import { DataSource, DataSourceOptions } from 'typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const sync = String(this.configService.get<string>('DB_SYNCHRONIZE', 'false')).toLowerCase() === 'true';
    const logging = String(this.configService.get<string>('DB_LOGGING', 'false')).toLowerCase() === 'true';
    const ssl = String(this.configService.get<string>('DB_SSL', 'false')).toLowerCase() === 'true';
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'password'),
      database: this.configService.get<string>('DB_NAME', 'user_service'),
      entities: [
        User,
        PrivacySettings,
        UserSearchIndex,
        Group,
        GroupMember,
        Contact,
        BlockedUser,
        Message,
        // Preferences
        (require('../entities/user-preferences.entity').UserPreferences),
      ],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: sync,
      logging: logging,
      ssl: ssl,
    };
  }
}

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'user_service',
  entities: [
    User,
    PrivacySettings,
    UserSearchIndex,
    Group,
    GroupMember,
    Contact,
    BlockedUser,
    Message,
    (require('../entities/user-preferences.entity').UserPreferences),
  ],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);