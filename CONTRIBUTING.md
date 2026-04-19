# Contribuer au User Service

## Lancer le projet

```bash
just up dev
```

## Conventions

- Conventional commits (`feat`, `fix`, `docs`, `test`, `refactor`)
- Branches : `WHISPR-XXX-description`
- Tests obligatoires avant chaque PR

## Tests

```bash
npm test
npm run test:e2e:docker
```

## Structure

```
src/modules/
├── profile/        # Profil utilisateur
├── contacts/       # Demandes de contact
├── blocked-users/  # Utilisateurs bloqués
├── privacy/        # Confidentialité
├── search/         # Recherche
├── groups/         # Groupes
├── sanctions/      # Sanctions
├── appeals/        # Appels
└── webhooks/       # Webhooks
```
