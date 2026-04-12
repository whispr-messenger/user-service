---
name: cluster-0
description: "Skill for the Cluster_0 area of user-service. 4 symbols across 1 files."
---

# Cluster_0

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how parseDatabaseUrl, getEnvDatabaseConfig, getDataSourceOptions work
- Modifying cluster_0-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/typeorm.config.ts` | parseDatabaseUrl, getEnvDatabaseConfig, getDataSourceOptions, typeOrmModuleOptionsFactory |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `parseDatabaseUrl` | Function | `src/typeorm.config.ts` | 17 |
| `getEnvDatabaseConfig` | Function | `src/typeorm.config.ts` | 31 |
| `getDataSourceOptions` | Function | `src/typeorm.config.ts` | 41 |
| `typeOrmModuleOptionsFactory` | Function | `src/typeorm.config.ts` | 55 |

## How to Explore

1. `gitnexus_context({name: "parseDatabaseUrl"})` — see callers and callees
2. `gitnexus_query({query: "cluster_0"})` — find related execution flows
3. Read key files listed above for implementation details
