# Recherche d'utilisateurs

## Flux

```
Client ──▶ GET /user/v1/search?q=<query>
                │
          ┌─────▼─────┐
          │ Recherche  │
          │ par pseudo │
          │ ou nom     │
          └─────┬─────┘
                │
          Résultats paginés
```

La recherche respecte les paramètres de confidentialité des utilisateurs.
