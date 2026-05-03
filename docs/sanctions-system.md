# Système de sanctions

## Types

| Type | Durée | Effet |
|------|-------|-------|
| warning | - | Avertissement simple |
| mute | Temporaire | Ne peut plus envoyer de messages |
| ban | Temporaire/Permanent | Exclu de la plateforme |

## Flux d'appel

```
Sanction appliquée
     │
     ▼
User notifié
     │
     ▼
POST /appeals ──▶ Demande d'appel
                       │
                 Admin review
                  ok │ rejeté
                 ┌───┼───┐
                 │       │
            Levée    Maintenue
```
