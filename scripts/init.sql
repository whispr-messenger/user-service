CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "user" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "username" varchar(50) UNIQUE NOT NULL,
    "email" varchar(255) UNIQUE NOT NULL,
    "phoneNumber" varchar(20) UNIQUE,
    "firstName" varchar(100),
    "lastName" varchar(100),
    "bio" text,
    "profilePicture" varchar(500),
    "isActive" boolean DEFAULT true,
    "lastSeen" timestamp,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "privacy_settings" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid UNIQUE NOT NULL,
    "profileVisibility" varchar(20) DEFAULT 'public',
    "phoneVisibility" varchar(20) DEFAULT 'contacts',
    "lastSeenVisibility" varchar(20) DEFAULT 'everyone',
    "readReceiptsEnabled" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "contact" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "contactUserId" uuid NOT NULL,
    "displayName" varchar(100),
    "isFavorite" boolean DEFAULT false,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("contactUserId") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("userId", "contactUserId")
);

CREATE TABLE IF NOT EXISTS "blocked_user" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL,
    "blockedUserId" uuid NOT NULL,
    "reason" varchar(255),
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("blockedUserId") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("userId", "blockedUserId")
);

CREATE TABLE IF NOT EXISTS "group" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "description" text,
    "avatar" varchar(500),
    "isPrivate" boolean DEFAULT false,
    "maxMembers" integer DEFAULT 256,
    "createdById" uuid NOT NULL,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "group_member" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "groupId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "role" varchar(20) DEFAULT 'member',
    "joinedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" uuid,
    FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
    FOREIGN KEY ("invitedBy") REFERENCES "user"("id") ON DELETE SET NULL,
    UNIQUE("groupId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_user_username" ON "user"("username");
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
CREATE INDEX IF NOT EXISTS "idx_user_phone" ON "user"("phoneNumber");
CREATE INDEX IF NOT EXISTS "idx_contact_user" ON "contact"("userId");
CREATE INDEX IF NOT EXISTS "idx_contact_contact_user" ON "contact"("contactUserId");
CREATE INDEX IF NOT EXISTS "idx_blocked_user" ON "blocked_user"("userId");
CREATE INDEX IF NOT EXISTS "idx_group_created_by" ON "group"("createdById");
CREATE INDEX IF NOT EXISTS "idx_group_member_group" ON "group_member"("groupId");
CREATE INDEX IF NOT EXISTS "idx_group_member_user" ON "group_member"("userId");

INSERT INTO "user" ("username", "email", "firstName", "lastName") 
VALUES ('admin', 'admin@whisper.com', 'Admin', 'User')
ON CONFLICT ("username") DO NOTHING;