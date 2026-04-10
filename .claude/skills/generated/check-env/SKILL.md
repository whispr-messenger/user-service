---
name: check-env
description: "Skill for the Check-env area of user-service. 4 symbols across 2 files."
---

# Check-env

4 symbols | 2 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how runEntrypoint, runEnvChecks, checkRequired work
- Modifying check-env-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/docker/check-env/check-env.ts` | runEnvChecks, checkRequired, checkOptional |
| `src/docker/entrypoint.ts` | runEntrypoint |

## Entry Points

Start here when exploring this area:

- **`runEntrypoint`** (Function) — `src/docker/entrypoint.ts:2`
- **`runEnvChecks`** (Function) — `src/docker/check-env/check-env.ts:10`
- **`checkRequired`** (Function) — `src/docker/check-env/check-env.ts:14`
- **`checkOptional`** (Function) — `src/docker/check-env/check-env.ts:25`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `runEntrypoint` | Function | `src/docker/entrypoint.ts` | 2 |
| `runEnvChecks` | Function | `src/docker/check-env/check-env.ts` | 10 |
| `checkRequired` | Function | `src/docker/check-env/check-env.ts` | 14 |
| `checkOptional` | Function | `src/docker/check-env/check-env.ts` | 25 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunEntrypoint → CheckRequired` | intra_community | 3 |
| `RunEntrypoint → CheckOptional` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "runEntrypoint"})` — see callers and callees
2. `gitnexus_query({query: "check-env"})` — find related execution flows
3. Read key files listed above for implementation details
