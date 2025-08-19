# User Service - Service de Gestion des Utilisateurs

Service backend NestJS pour la gestion des utilisateurs, contacts, groupes et fonctionnalités de recherche pour WHISPR APP.

##  Fonctionnalités

### Gestion des Utilisateurs
-  CRUD complet des profils utilisateurs
-  Authentification et validation
-  Gestion des paramètres de confidentialité
-  Upload et gestion des photos de profil

### Gestion des Contacts
-  Ajout/suppression de contacts
-  Recherche de contacts
-  Synchronisation avec le carnet d'adresses
-  Gestion des utilisateurs bloqués

### Recherche d'Utilisateurs
-  Recherche par numéro de téléphone
-  Recherche par nom d'utilisateur
-  Recherche par nom complet
-  Index de recherche optimisé avec Redis

### Gestion des Groupes
-  Création et gestion de groupes
-  Système de rôles et permissions
-  Gestion des membres
-  Paramètres de confidentialité des groupes

### Cache et Performance
-  Cache Redis pour les données fréquemment accédées
-  Index de recherche optimisé
-  Gestion automatique des TTL

##  Technologies

- **Framework**: NestJS 10.x
- **Base de données**: PostgreSQL avec TypeORM
- **Cache**: Redis
- **Validation**: class-validator, class-transformer
- **Tests**: Jest avec couverture complète
- **Documentation**: Swagger/OpenAPI

##  Prérequis

- Node.js (v18 ou supérieur)
- npm ou yarn
- PostgreSQL
- Redis
- Docker (pour PostgreSQL et Redis)

##  Installation

```bash
# Cloner le repository
git clone <repository-url>
cd user-service

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Démarrer les services (PostgreSQL et Redis)
docker-compose up -d

# Lancer les migrations
npm run migration:run

# Démarrer le service
npm run start:dev
```

##  Configuration

### Variables d'environnement

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=user_service

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application
PORT=3000
JWT_SECRET=your-jwt-secret
```

##  Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:cov

# Tests e2e
npm run test:e2e

# Tests en mode watch
npm run test:watch
```

##  API Documentation

La documentation Swagger est disponible à l'adresse :
`http://localhost:3000/api/docs`

### Endpoints principaux

#### Utilisateurs
- `GET /users` - Liste des utilisateurs
- `GET /users/:id` - Détails d'un utilisateur
- `POST /users` - Créer un utilisateur
- `PUT /users/:id` - Mettre à jour un utilisateur
- `DELETE /users/:id` - Supprimer un utilisateur

#### Contacts
- `GET /contacts` - Liste des contacts
- `POST /contacts` - Ajouter un contact
- `DELETE /contacts/:id` - Supprimer un contact

#### Recherche
- `GET /search/users` - Rechercher des utilisateurs
- `GET /search/phone/:phone` - Recherche par téléphone
- `GET /search/username/:username` - Recherche par nom d'utilisateur

#### Groupes
- `GET /groups` - Liste des groupes
- `POST /groups` - Créer un groupe
- `PUT /groups/:id` - Mettre à jour un groupe
- `POST /groups/:id/members` - Ajouter un membre

##  Architecture

```
src/
├── users/           # Module utilisateurs
├── contacts/        # Module contacts
├── groups/          # Module groupes
├── search/          # Module recherche
├── privacy/         # Module confidentialité
├── blocked-users/   # Module utilisateurs bloqués
├── cache/           # Module cache Redis
├── config/          # Configuration
├── entities/        # Entités TypeORM
├── dto/             # Data Transfer Objects
└── main.ts          # Point d'entrée
```

##  Sécurité

- Validation stricte des données d'entrée
- Gestion des permissions par rôle
- Protection contre les attaques courantes
- Chiffrement des données sensibles
- Audit trail des actions utilisateurs

##  Performance

- Cache Redis pour les données fréquemment accédées
- Index de base de données optimisés
- Pagination automatique des résultats
- Compression des réponses API

##  Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

##  Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

##  Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub.
ou me contacter @DALM1
