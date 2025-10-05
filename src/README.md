# Source Code Organization

This directory contains the main source code for the User Service, organized following NestJS best practices.

## Directory Structure

```
src/
├── common/           # Shared utilities and components
│   ├── decorators/   # Custom decorators
│   ├── filters/      # Exception filters
│   ├── guards/       # Route guards
│   ├── interceptors/ # Request/response interceptors
│   └── pipes/        # Validation and transformation pipes
├── config/           # Configuration files
├── database/         # Database related files
│   ├── migrations/   # TypeORM migrations
│   └── seeds/        # Database seed files
├── dto/              # Data Transfer Objects
├── entities/         # TypeORM entities
├── modules/          # Feature modules
│   ├── blocked-users/
│   ├── contacts/
│   ├── groups/
│   ├── privacy/
│   ├── search/
│   └── users/
└── cache/           # Cache service and utilities
```

## Guidelines

- Each module should be self-contained with its own controller, service, and tests
- Common utilities should be placed in the `common/` directory
- All DTOs should be in the `dto/` directory with proper validation
- Database entities should be in the `entities/` directory
- Use barrel exports (index.ts) for better import organization