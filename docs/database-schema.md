# Schéma base de données

## Tables principales

```
┌──────────┐     ┌───────────────┐
│  users   │────▶│ contact_reqs  │
│          │     │               │
│ - id     │     │ - senderId    │
│ - phone  │     │ - receiverId  │
│ - pseudo │     │ - status      │
└──────┬───┘     └───────────────┘
       │
  ┌────┼────────────┐
  │    │            │
┌─▼──┐ ┌─▼────────┐ ┌▼──────────┐
│role│ │blocked   │ │privacy    │
│    │ │users     │ │settings   │
└────┘ └──────────┘ └───────────┘
```
