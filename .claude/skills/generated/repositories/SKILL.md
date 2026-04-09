---
name: repositories
description: "Skill for the Repositories area of user-service. 27 symbols across 7 files."
---

# Repositories

27 symbols | 7 files | Cohesion: 91%

## When to Use

- Working with code in `src/`
- Understanding how findAllByOwner, findOneById, create work
- Modifying repositories-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/modules/groups/repositories/groups.repository.ts` | findAllByOwner, findOneById, create, save, remove |
| `src/modules/groups/services/groups.service.ts` | ensureUserExists, getGroups, createGroup, updateGroup, deleteGroup |
| `src/modules/contacts/repositories/contacts.repository.ts` | findAllByOwner, findOne, create, save, remove |
| `src/modules/contacts/services/contacts.service.ts` | ensureUserExists, getContacts, addContact, removeContact |
| `src/modules/privacy/services/privacy.service.ts` | ensureUserExists, getSettings, updateSettings |
| `src/modules/privacy/repositories/privacy-settings.repository.ts` | findByUserId, createDefault, save |
| `src/modules/common/repositories/user.repository.ts` | create, save |

## Entry Points

Start here when exploring this area:

- **`findAllByOwner`** (Method) — `src/modules/groups/repositories/groups.repository.ts:12`
- **`findOneById`** (Method) — `src/modules/groups/repositories/groups.repository.ts:16`
- **`create`** (Method) — `src/modules/groups/repositories/groups.repository.ts:24`
- **`save`** (Method) — `src/modules/groups/repositories/groups.repository.ts:29`
- **`remove`** (Method) — `src/modules/groups/repositories/groups.repository.ts:33`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `findAllByOwner` | Method | `src/modules/groups/repositories/groups.repository.ts` | 12 |
| `findOneById` | Method | `src/modules/groups/repositories/groups.repository.ts` | 16 |
| `create` | Method | `src/modules/groups/repositories/groups.repository.ts` | 24 |
| `save` | Method | `src/modules/groups/repositories/groups.repository.ts` | 29 |
| `remove` | Method | `src/modules/groups/repositories/groups.repository.ts` | 33 |
| `ensureUserExists` | Method | `src/modules/groups/services/groups.service.ts` | 14 |
| `getGroups` | Method | `src/modules/groups/services/groups.service.ts` | 21 |
| `createGroup` | Method | `src/modules/groups/services/groups.service.ts` | 26 |
| `updateGroup` | Method | `src/modules/groups/services/groups.service.ts` | 31 |
| `deleteGroup` | Method | `src/modules/groups/services/groups.service.ts` | 47 |
| `ensureUserExists` | Method | `src/modules/contacts/services/contacts.service.ts` | 13 |
| `getContacts` | Method | `src/modules/contacts/services/contacts.service.ts` | 20 |
| `addContact` | Method | `src/modules/contacts/services/contacts.service.ts` | 25 |
| `removeContact` | Method | `src/modules/contacts/services/contacts.service.ts` | 41 |
| `findAllByOwner` | Method | `src/modules/contacts/repositories/contacts.repository.ts` | 12 |
| `findOne` | Method | `src/modules/contacts/repositories/contacts.repository.ts` | 16 |
| `create` | Method | `src/modules/contacts/repositories/contacts.repository.ts` | 20 |
| `save` | Method | `src/modules/contacts/repositories/contacts.repository.ts` | 25 |
| `remove` | Method | `src/modules/contacts/repositories/contacts.repository.ts` | 29 |
| `ensureUserExists` | Method | `src/modules/privacy/services/privacy.service.ts` | 13 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SearchByPhoneBatch → Save` | cross_community | 6 |
| `SearchByUsername → Save` | cross_community | 5 |
| `CreateUserAccount → Save` | cross_community | 5 |
| `SearchByPhoneBatch → Save` | cross_community | 5 |
| `UpdateSettings → FindOne` | cross_community | 5 |
| `UpdateSettings → Save` | intra_community | 5 |
| `SearchByUsername → Save` | cross_community | 4 |
| `UpdateGroup → FindOne` | cross_community | 4 |
| `DeleteGroup → FindOne` | cross_community | 4 |
| `AddContact → FindOne` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 3 calls |

## How to Explore

1. `gitnexus_context({name: "findAllByOwner"})` — see callers and callees
2. `gitnexus_query({query: "repositories"})` — find related execution flows
3. Read key files listed above for implementation details
