---
name: services
description: "Skill for the Services area of user-service. 41 symbols across 15 files."
---

# Services

41 symbols | 15 files | Cohesion: 85%

## When to Use

- Working with code in `src/`
- Understanding how UserCreatedEvent, searchByPhone, searchByUsername work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/modules/common/repositories/user.repository.ts` | findById, findByPhoneNumber, findByPhoneNumberWithFilter, findByUsername, findByUsernameInsensitive (+3) |
| `src/modules/search/services/user-search.service.ts` | searchByPhone, searchByUsername, searchByDisplayName, searchByPhoneBatch, indexUser (+1) |
| `src/modules/accounts/services/accounts.service.ts` | createFromEvent, findOne, deactivate, activate, remove |
| `src/modules/blocked-users/services/blocked-users.service.ts` | ensureUserExists, getBlockedUsers, blockUser, unblockUser |
| `src/modules/blocked-users/repositories/blocked-users.repository.ts` | findAllByBlocker, findOne, create, remove |
| `src/modules/accounts/services/user-registered-retry.service.ts` | handleWithRetry, moveToDlq, sleep |
| `src/modules/profile/services/profile.service.ts` | findOne, getProfile, updateProfile |
| `src/modules/search/controllers/user-search.controller.ts` | searchByName |
| `src/modules/accounts/events/user-created.event.ts` | UserCreatedEvent |
| `src/config/redis.config.ts` | getClient |

## Entry Points

Start here when exploring this area:

- **`UserCreatedEvent`** (Class) — `src/modules/accounts/events/user-created.event.ts:0`
- **`searchByPhone`** (Method) — `src/modules/search/services/user-search.service.ts:23`
- **`searchByUsername`** (Method) — `src/modules/search/services/user-search.service.ts:46`
- **`searchByDisplayName`** (Method) — `src/modules/search/services/user-search.service.ts:69`
- **`searchByPhoneBatch`** (Method) — `src/modules/search/services/user-search.service.ts:103`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `UserCreatedEvent` | Class | `src/modules/accounts/events/user-created.event.ts` | 0 |
| `searchByPhone` | Method | `src/modules/search/services/user-search.service.ts` | 23 |
| `searchByUsername` | Method | `src/modules/search/services/user-search.service.ts` | 46 |
| `searchByDisplayName` | Method | `src/modules/search/services/user-search.service.ts` | 69 |
| `searchByPhoneBatch` | Method | `src/modules/search/services/user-search.service.ts` | 103 |
| `indexUser` | Method | `src/modules/search/services/user-search.service.ts` | 116 |
| `reindexUser` | Method | `src/modules/search/services/user-search.service.ts` | 124 |
| `searchByName` | Method | `src/modules/search/controllers/user-search.controller.ts` | 44 |
| `findById` | Method | `src/modules/common/repositories/user.repository.ts` | 35 |
| `findByPhoneNumber` | Method | `src/modules/common/repositories/user.repository.ts` | 45 |
| `findByPhoneNumberWithFilter` | Method | `src/modules/common/repositories/user.repository.ts` | 54 |
| `findByUsername` | Method | `src/modules/common/repositories/user.repository.ts` | 71 |
| `findByUsernameInsensitive` | Method | `src/modules/common/repositories/user.repository.ts` | 80 |
| `findOne` | Method | `src/modules/common/repositories/user.repository.ts` | 97 |
| `createFromEvent` | Method | `src/modules/accounts/services/accounts.service.ts` | 44 |
| `getClient` | Method | `src/config/redis.config.ts` | 108 |
| `check` | Method | `src/modules/jwt-auth/jwks-health.indicator.ts` | 11 |
| `check` | Method | `src/modules/health/redis-health.indicator.ts` | 13 |
| `down` | Method | `src/database/migrations/1775401958678-InitialSchema.ts` | 21 |
| `handleWithRetry` | Method | `src/modules/accounts/services/user-registered-retry.service.ts` | 18 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SearchByName → FindOne` | intra_community | 6 |
| `CreateUserAccount → FindOne` | cross_community | 6 |
| `SearchByPhoneBatch → FindOne` | intra_community | 6 |
| `SearchByPhoneBatch → Save` | cross_community | 6 |
| `SearchByUsername → FindOne` | intra_community | 5 |
| `SearchByUsername → Save` | cross_community | 5 |
| `CreateUserAccount → Save` | cross_community | 5 |
| `SearchByPhoneBatch → Save` | cross_community | 5 |
| `UpdateSettings → FindOne` | cross_community | 5 |
| `UpdateProfile → FindOne` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Repositories | 3 calls |

## How to Explore

1. `gitnexus_context({name: "UserCreatedEvent"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
