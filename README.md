# User Service
<!-- [![Quality Gate Status](https://sonarqube.whispr.epitech-msc2026.me/api/project_badges/measure?project=whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56&metric=alert_status&token=sqb_447aebc169925a474766cc3247a75fd2b838eeb6)](https://sonarqube.whispr.epitech-msc2026.me/dashboard?id=whispr-messenger_auth-service_11813afb-b949-4baf-aa3f-7d12c436cb56) -->

[![App Status](https://argocd.whispr.epitech.beer/api/badge?name=user-service&revision=true&showAppName=true)](https://argocd.whispr.epitech.beer/applications/user-service)
---
- [Documentation](https://whispr-messenger.github.io/user-service/)
- [Swagger UI](https://whispr.epitech.beer/user/swagger)
- [ArgoCD UI](https://argocd.whispr.epitech.beer)
- [SonarQube](https://sonarqube.whispr.epitech.beer)

## Description

This Microservice is responsible of the user social profile settings, and of the relationships management tasks in the Whispr Messenger system.

## Installation

The repository uses `just` a custom recipe runner (like `make` in C lang) to provide useful scripts.

Once you have `just` and `docker` installed in your computer you can start the development server with:

```sh
just up dev
```
