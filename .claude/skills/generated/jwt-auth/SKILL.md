---
name: jwt-auth
description: "Skill for the Jwt-auth area of user-service. 7 symbols across 2 files."
---

# Jwt-auth

7 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how getKeys, onModuleInit, loadKeysWithRetry work
- Modifying jwt-auth-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/modules/jwt-auth/jwks.service.ts` | getKeys, onModuleInit, loadKeysWithRetry, continueBackgroundRetry, sleep (+1) |
| `src/modules/jwt-auth/jwt.strategy.ts` | constructor |

## Entry Points

Start here when exploring this area:

- **`getKeys`** (Method) — `src/modules/jwt-auth/jwks.service.ts:13`
- **`onModuleInit`** (Method) — `src/modules/jwt-auth/jwks.service.ts:31`
- **`loadKeysWithRetry`** (Method) — `src/modules/jwt-auth/jwks.service.ts:39`
- **`continueBackgroundRetry`** (Method) — `src/modules/jwt-auth/jwks.service.ts:79`
- **`sleep`** (Method) — `src/modules/jwt-auth/jwks.service.ts:121`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getKeys` | Method | `src/modules/jwt-auth/jwks.service.ts` | 13 |
| `onModuleInit` | Method | `src/modules/jwt-auth/jwks.service.ts` | 31 |
| `loadKeysWithRetry` | Method | `src/modules/jwt-auth/jwks.service.ts` | 39 |
| `continueBackgroundRetry` | Method | `src/modules/jwt-auth/jwks.service.ts` | 79 |
| `sleep` | Method | `src/modules/jwt-auth/jwks.service.ts` | 121 |
| `constructor` | Method | `src/modules/jwt-auth/jwt.strategy.ts` | 14 |
| `getSecretProvider` | Method | `src/modules/jwt-auth/jwks.service.ts` | 108 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `OnModuleInit → Sleep` | intra_community | 4 |
| `OnModuleInit → GetKeys` | intra_community | 4 |

## How to Explore

1. `gitnexus_context({name: "getKeys"})` — see callers and callees
2. `gitnexus_query({query: "jwt-auth"})` — find related execution flows
3. Read key files listed above for implementation details
