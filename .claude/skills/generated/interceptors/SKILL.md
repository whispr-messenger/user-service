---
name: interceptors
description: "Skill for the Interceptors area of user-service. 5 symbols across 3 files."
---

# Interceptors

5 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how createSwaggerDocumentation, LoggingInterceptor work
- Modifying interceptors-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/swagger.ts` | buildSwaggerDocument, createSwaggerCustomOptions, createSwaggerDocumentation |
| `src/main.ts` | bootstrap |
| `src/interceptors/logging.interceptor.ts` | LoggingInterceptor |

## Entry Points

Start here when exploring this area:

- **`createSwaggerDocumentation`** (Function) — `src/swagger.ts:22`
- **`LoggingInterceptor`** (Class) — `src/interceptors/logging.interceptor.ts:6`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LoggingInterceptor` | Class | `src/interceptors/logging.interceptor.ts` | 6 |
| `createSwaggerDocumentation` | Function | `src/swagger.ts` | 22 |
| `buildSwaggerDocument` | Function | `src/swagger.ts` | 5 |
| `createSwaggerCustomOptions` | Function | `src/swagger.ts` | 16 |
| `bootstrap` | Function | `src/main.ts` | 19 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Bootstrap → BuildSwaggerDocument` | intra_community | 3 |
| `Bootstrap → CreateSwaggerCustomOptions` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "createSwaggerDocumentation"})` — see callers and callees
2. `gitnexus_query({query: "interceptors"})` — find related execution flows
3. Read key files listed above for implementation details
