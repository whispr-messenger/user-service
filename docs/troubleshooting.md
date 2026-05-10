# Troubleshooting

## Token expiré

Utiliser le refresh token via `POST /auth/v1/tokens/refresh`.

## Code OTP non reçu

Vérifier les logs du fournisseur SMS et le rate limiting Redis.

## Redis inaccessible

```bash
redis-cli ping
```
