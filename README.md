# User Service
<!-- [![Quality Gate Status](https://sonarqube.whispr.epitech-msc2026.me/api/project_badges/measure?project=whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56&metric=alert_status&token=sqb_447aebc169925a474766cc3247a75fd2b838eeb6)](https://sonarqube.whispr.epitech-msc2026.me/dashboard?id=whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56) -->

[![App Status](https://argocd.whispr.epitech.beer/api/badge?name=user-service&revision=true&showAppName=true)](https://argocd.whispr.epitech.beer/applications/user-service)
---
- [Documentation](https://whispr-messenger.github.io/user-service/)
- [Swagger UI](https://whispr.epitech.beer/user/swagger)
- [ArgoCD UI](https://argocd.whispr.epitech.beer)
- [SonarQube](https://sonarqube.whispr.epitech.beer)

## Description

This Microservice is responsible of the user social profile settings, and of the relationships management tasks in the Whispr Messenger system. It also handles contact requests, blocked users, privacy settings and user search.

## Tech Stack

- **Runtime** : Node.js 22+
- **Framework** : NestJS + TypeScript
- **Base de données** : PostgreSQL avec TypeORM
- **Cache** : Redis

## Installation

The repository uses `just` a custom recipe runner (like `make` in C lang) to provide useful scripts.

Once you have `just` and `docker` installed in your computer you can start the development server with:

```sh
just up dev
```

## Modules

| Module | Rôle |
|--------|------|
| `profile` | Gestion du profil utilisateur |
| `contacts` | Demandes de contact et liste d'amis |
| `blocked-users` | Blocage/déblocage d'utilisateurs |
| `privacy` | Paramètres de confidentialité |
| `search` | Recherche d'utilisateurs |
| `groups` | Gestion des groupes |
| `sanctions` | Sanctions et modération |
| `appeals` | Appels contre les sanctions |
| `webhooks` | Webhooks pour événements |
| `roles` | Gestion des rôles (admin, user) |
| `reputation` | Score de réputation utilisateur |
| `audit` | Logs d'audit des actions |

## Architecture

```
┌──────────────┐     ┌──────────────┐
│  Mobile App  │────▶│ User Service │
└──────────────┘     └──────┬───────┘
                            │
                  ┌─────────┼─────────┐
                  │         │         │
            ┌─────▼───┐ ┌───▼───┐ ┌───▼──────┐
            │ Postgres │ │ Redis │ │ Auth     │
            └─────────┘ └───────┘ │ Service  │
                                  └──────────┘
```

## Testing

```bash
npm test
npm run test:cov
npm run test:e2e:docker
```

## Déploiement

Déployé via ArgoCD sur GKE. Le CI build l'image Docker et la push sur GHCR.

```
Push ──▶ GitHub Actions ──▶ Docker Build ──▶ GHCR ──▶ ArgoCD ──▶ GKE
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `REDIS_HOST` | Hôte Redis |
| `REDIS_PORT` | Port Redis |
| `JWT_PUBLIC_KEY` | Clé publique pour vérifier les tokens |
| `NODE_ENV` | Environnement d'exécution |
