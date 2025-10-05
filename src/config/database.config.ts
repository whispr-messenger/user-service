import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const ssl =
      this.configService.get<string>('DATABASE_SSL', 'false') === 'true';

    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get<string>('DATABASE_USERNAME', 'postgres'),
      password: this.configService.get<string>('DATABASE_PASSWORD', 'password'),
      database: this.configService.get<string>('DATABASE_NAME', 'user_service'),
      entities: [__dirname + '/../**/*.entity.js'],
      migrations: [__dirname + '/../migrations/*.js'],
      synchronize:
        this.configService.get<string>('DATABASE_SYNCHRONIZE', 'false') ===
        'true',
      logging:
        this.configService.get<string>('DATABASE_LOGGING', 'false') === 'true',
      ssl: ssl ? { rejectUnauthorized: false } : false,
    };
  }
}

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'user_service',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  ssl: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
