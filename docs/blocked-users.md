# Utilisateurs bloqués

## Flux

```
User A bloque User B
     │
     ▼
┌────────────┐
│ Blocage en │
│ DB         │
└────┬───────┘
     │
     ├── User B ne peut plus envoyer de messages à A
     ├── User B ne voit plus le profil de A
     └── User B ne peut plus envoyer de demande de contact
```
