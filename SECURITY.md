# Sécurité

## Authentification

Toutes les requêtes nécessitent un JWT valide vérifié via le JWKS de l'auth-service.

## Données personnelles

- Soft delete des comptes (champ `deletedAt`)
- Paramètres de confidentialité par utilisateur
- Blocage d'utilisateurs
- Système de sanctions et appels
- Logs d'audit des actions admin
