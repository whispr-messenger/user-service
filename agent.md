# Changelog Agent

## 2026-02-13

### Configuration Docker
- Mise en place de l'environnement Docker pour le développement.
- Fichiers créés/modifiés :
  - `docker/dev/Dockerfile`
  - `docker/dev/compose.yml`
  - `docker/dev/init.sql`

### Gestion de Profil Utilisateur et Confidentialité
- Implémentation de la logique de récupération de profil avec filtrage selon les paramètres de confidentialité.
- Ajout de la gestion des paramètres de confidentialité (PrivacySettings).
- Création de l'entité `ContactRequest` pour gérer les demandes d'ajout.
- Fichiers modifiés :
  - `src/users/users.service.ts`
  - `src/users/users.controller.ts`
  - `src/privacy/privacy.service.ts`
  - `src/entities/contact-request.entity.ts`

### Gestion des Contacts
- Développement du flux complet de demande de contact (envoi, acceptation, refus).
- Création automatique des contacts mutuels lors de l'acceptation.
- Vérification des blocages et des doublons avant l'envoi.
- Ajout des endpoints pour lister les demandes en attente.
- Fichiers modifiés :
  - `src/contacts/contacts.controller.ts`
  - `src/contacts/contacts.service.ts`
  - `src/dto/create-contact-request.dto.ts`
  - `src/dto/respond-contact-request.dto.ts`

### Tests
- Mise à jour et validation des tests unitaires pour le service de contacts.
- Fichiers modifiés :
  - `src/contacts/contacts.service.spec.ts`
