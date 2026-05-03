# Groupes

## Fonctionnalités

- Création de groupes
- Ajout/retrait de membres
- Rôles (admin, membre)

## Schéma

```
┌──────────┐     ┌──────────────┐
│  Group   │────▶│ Group Member │
│          │     │              │
│ - id     │     │ - groupId    │
│ - name   │     │ - userId     │
│ - avatar │     │ - role       │
└──────────┘     └──────────────┘
```
