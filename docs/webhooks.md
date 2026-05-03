# Webhooks

## Fonctionnement

```
Événement user ──▶ Webhook Service ──▶ POST vers URL configurée
                                            │
                                      Retry si échec
                                      (3 tentatives)
```

## Événements disponibles

- user.created
- user.updated
- user.deleted
- contact.accepted
- sanction.applied
