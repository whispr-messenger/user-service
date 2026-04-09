---
name: config
description: "Skill for the Config area of user-service. 3 symbols across 1 files."
---

# Config

3 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how parseSentinels, buildRedisOptions, constructor work
- Modifying config-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/config/redis.config.ts` | parseSentinels, buildRedisOptions, constructor |

## Entry Points

Start here when exploring this area:

- **`parseSentinels`** (Function) — `src/config/redis.config.ts:9`
- **`buildRedisOptions`** (Function) — `src/config/redis.config.ts:16`
- **`constructor`** (Method) — `src/config/redis.config.ts:70`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `parseSentinels` | Function | `src/config/redis.config.ts` | 9 |
| `buildRedisOptions` | Function | `src/config/redis.config.ts` | 16 |
| `constructor` | Method | `src/config/redis.config.ts` | 70 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Constructor → ParseSentinels` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "parseSentinels"})` — see callers and callees
2. `gitnexus_query({query: "config"})` — find related execution flows
3. Read key files listed above for implementation details
