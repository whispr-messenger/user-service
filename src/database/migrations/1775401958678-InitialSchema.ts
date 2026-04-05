import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1775401958678 implements MigrationInterface {
    name = 'InitialSchema1775401958678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "users"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users"."users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneNumber" character varying(20) NOT NULL, "username" character varying(50), "firstName" character varying(100), "lastName" character varying(100), "biography" text, "profilePictureUrl" character varying(500), "lastSeen" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users"."privacy_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "profile_picture_privacy" character varying NOT NULL DEFAULT 'everyone', "first_name_privacy" character varying NOT NULL DEFAULT 'everyone', "last_name_privacy" character varying NOT NULL DEFAULT 'contacts', "biography_privacy" character varying NOT NULL DEFAULT 'everyone', "last_seen_privacy" character varying NOT NULL DEFAULT 'contacts', "search_by_phone" boolean NOT NULL DEFAULT true, "search_by_username" boolean NOT NULL DEFAULT true, "read_receipts" boolean NOT NULL DEFAULT true, "online_status" character varying NOT NULL DEFAULT 'contacts', "group_add_permission" character varying NOT NULL DEFAULT 'contacts', "media_auto_download" character varying(10) NOT NULL DEFAULT 'wifi_only', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_626e170465665a6a6e9831bb15" UNIQUE ("user_id"), CONSTRAINT "PK_e31cc479f8c3267c86511223ea0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users"."contacts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "contact_id" uuid NOT NULL, "nickname" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5dac1816a0da63cc4639ddc17d8" UNIQUE ("owner_id", "contact_id"), CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users"."groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users"."blocked_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blocker_id" uuid NOT NULL, "blocked_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b67ed0acca994276b01f2688437" UNIQUE ("blocker_id", "blocked_id"), CONSTRAINT "PK_93760d788a31b7546c5424f42cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users"."privacy_settings" ADD CONSTRAINT "FK_626e170465665a6a6e9831bb153" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."contacts" ADD CONSTRAINT "FK_ac270d32a01ee22d2e98a8f8532" FOREIGN KEY ("owner_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."contacts" ADD CONSTRAINT "FK_b85c417d6af2e06ff6ba8c8234d" FOREIGN KEY ("contact_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."groups" ADD CONSTRAINT "FK_5d7af25843377def343ab0beaa8" FOREIGN KEY ("owner_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."blocked_users" ADD CONSTRAINT "FK_7e543cda1c6f5aa2034fd2c105d" FOREIGN KEY ("blocker_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users"."blocked_users" ADD CONSTRAINT "FK_f515c19546d94b927811b9b3f15" FOREIGN KEY ("blocked_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users"."blocked_users" DROP CONSTRAINT "FK_f515c19546d94b927811b9b3f15"`);
        await queryRunner.query(`ALTER TABLE "users"."blocked_users" DROP CONSTRAINT "FK_7e543cda1c6f5aa2034fd2c105d"`);
        await queryRunner.query(`ALTER TABLE "users"."groups" DROP CONSTRAINT "FK_5d7af25843377def343ab0beaa8"`);
        await queryRunner.query(`ALTER TABLE "users"."contacts" DROP CONSTRAINT "FK_b85c417d6af2e06ff6ba8c8234d"`);
        await queryRunner.query(`ALTER TABLE "users"."contacts" DROP CONSTRAINT "FK_ac270d32a01ee22d2e98a8f8532"`);
        await queryRunner.query(`ALTER TABLE "users"."privacy_settings" DROP CONSTRAINT "FK_626e170465665a6a6e9831bb153"`);
        await queryRunner.query(`DROP TABLE "users"."blocked_users"`);
        await queryRunner.query(`DROP TABLE "users"."groups"`);
        await queryRunner.query(`DROP TABLE "users"."contacts"`);
        await queryRunner.query(`DROP TABLE "users"."privacy_settings"`);
        await queryRunner.query(`DROP TABLE "users"."users"`);
        await queryRunner.query(`DROP SCHEMA IF EXISTS "users" CASCADE`);
    }

}
