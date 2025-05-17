# Politique de Sécurité - Service Utilisateur

## 1. Introduction

### 1.1 Objectif du Document
Cette politique de sécurité définit les mesures techniques et pratiques à implémenter pour protéger le service utilisateur (User Service) de l'application Whispr dans le cadre de notre projet de fin d'études.

### 1.2 Contexte et Importance
Le service utilisateur gère les informations de profil, les relations sociales entre utilisateurs, les paramètres de confidentialité et les groupes de conversation. Il détient des données personnelles sensibles et constitue un élément essentiel de l'expérience sociale de l'application.

### 1.3 Principes Fondamentaux
- **Confidentialité par défaut**: Protection des informations personnelles par défaut
- **Contrôle utilisateur**: Permettre aux utilisateurs de contrôler la visibilité de leurs données
- **Séparation des préoccupations**: Isoler les différentes fonctionnalités du service
- **Sécurité par conception**: Intégration des considérations de sécurité dès la conception
- **Mise en œuvre réaliste**: Implémentation adaptée à nos contraintes de projet

## 2. Gestion des Données Utilisateurs

### 2.1 Contrôle d'Accès aux Profils

#### 2.1.1 Modèle de Confidentialité
- Trois niveaux d'accès configurables pour chaque attribut du profil :
  - Public (everyone) : visible par tous les utilisateurs
  - Contacts (contacts) : visible uniquement par les contacts
  - Privé (nobody) : visible uniquement par l'utilisateur lui-même
- Paramètres par défaut :
  - Photo de profil : everyone
  - Prénom : everyone
  - Nom : contacts
  - Biographie : everyone
  - Dernière connexion : contacts

#### 2.1.2 Vérification des Autorisations
- Vérification systématique des paramètres de confidentialité avant exposition des données
- Caching sécurisé des paramètres de confidentialité pour optimiser les performances
- Validation côté serveur des requêtes d'accès aux données
- Non-exposition des données des utilisateurs bloqués

#### 2.1.3 Audit des Accès
- Journalisation des accès non standards aux profils (administrateurs, opérations en batch)
- Notifications aux utilisateurs pour les modifications sensibles de leur profil
- Capacité à tracer l'historique des modifications de paramètres de confidentialité

### 2.2 Gestion des Relations Sociales

#### 2.2.1 Contacts et Blocages
- Vérification mutuelle avant établissement d'une relation de contact
- Invisibilité réciproque en cas de blocage (bidirectionnel)
- Restrictions d'accès automatiques après blocage
- Délai de grâce configurable pour les tentatives répétées d'ajout après refus

#### 2.2.2 Protection contre le Harcèlement
- Limites sur le nombre de demandes de contact par période
- Restrictions progressives en cas de comportement suspect
- Mécanisme simple pour signaler des comportements inappropriés
- Possibilité de masquer sa présence dans les recherches

### 2.3 Gestion des Groupes

#### 2.3.1 Contrôle d'Accès aux Groupes
- Validation des droits d'administration pour toute action de gestion
- Séparation claire des rôles (admin, moderator, member)
- Vérification des blocages entre utilisateurs avant ajout à un groupe
- Protection contre l'ajout non-consensuel à des groupes

#### 2.3.2 Restrictions et Limites
- Taille maximum des groupes : 200 membres
- Nombre maximum de groupes par utilisateur : 500
- Rate limiting sur les actions de création/modification de groupe
- Délai minimum entre certaines actions administratives

## 3. Protection des Données

### 3.1 Classification des Données

#### 3.1.1 Données d'Identification
- Numéro de téléphone : hautement sensible, accès restreint
- Nom d'utilisateur : sensible, accès selon paramètres de confidentialité
- Nom et prénom : modérément sensibles, accès selon paramètres de confidentialité
- ID utilisateur (UUID) : identifiant technique, usage interne

#### 3.1.2 Données de Profil
- Photo de profil : potentiellement sensible, accès selon paramètres de confidentialité
- Biographie : potentiellement sensible, accès selon paramètres de confidentialité
- Paramètres de confidentialité : hautement sensibles, accès restreint
- Dernière connexion : modérément sensible, accès selon paramètres de confidentialité

#### 3.1.3 Données Relationnelles
- Listes de contacts : modérément sensibles, accès restreint
- Utilisateurs bloqués : hautement sensibles, accès strictement privé
- Appartenance aux groupes : modérément sensible, visibilité contrôlée

### 3.2 Chiffrement au Repos

#### 3.2.1 Données Sensibles dans PostgreSQL
- Pseudonymisation du numéro de téléphone dans les requêtes non-essentielles
- Hachage des numéros de téléphone pour la recherche dans USER_SEARCH_INDEX
- Utilisation du chiffrement au niveau colonne pour les données hautement sensibles
- Chiffrement transparent de la base de données PostgreSQL au niveau du stockage

#### 3.2.2 Cache Redis
- TTL strict sur toutes les données en cache (max 60 minutes)
- Données de cache structurées pour ne contenir que les informations nécessaires
- Invalidation proactive du cache lors des mises à jour sensibles
- Pas de stockage des données de blocage utilisateur en clair dans Redis

### 3.3 Chiffrement en Transit

#### 3.3.1 Communications Externes
- TLS 1.3 obligatoire pour toutes les API
- Configuration des suites de chiffrement sécurisées
- Certificats Let's Encrypt pour la production
- Headers de sécurité HTTP configurés (HSTS, etc.)

#### 3.3.2 Communications Inter-Services
- mTLS (TLS mutuel) pour l'authentification service-à-service
- Communication gRPC sécurisée entre les services
- Validation des requêtes inter-services via tokens JWT
- Vérification de l'intégrité des messages

## 4. Protection Contre les Menaces

### 4.1 Gestion des Accès

#### 4.1.1 Authentification et Autorisation
- Validation des tokens JWT via le service d'authentification
- Vérification des permissions basée sur les rôles et relations
- Authentification pour chaque requête API
- Intégration avec le service d'authentification pour la vérification des appareils

#### 4.1.2 Limitation de Débit (Rate Limiting)
- Limitation par utilisateur : 300 requêtes/minute sur les endpoints de lecture
- Limitation par utilisateur : 60 requêtes/minute sur les endpoints de modification
- Limitation par utilisateur : 20 requêtes/minute sur les endpoints de recherche
- Délai progressif après comportements suspects

### 4.2 Protection Contre les Attaques Courantes

#### 4.2.1 Injection et Validation des Données
- Validation stricte des entrées avec class-validator dans NestJS
- Utilisation de TypeORM avec requêtes paramétrées
- Échappement des caractères spéciaux dans les données sensibles
- Validation des contraintes métier (longueurs, formats, etc.)

#### 4.2.2 Protection Contre la Manipulation de Données
- Signatures ou tokens dans les requêtes sensibles (ex: modification de groupe)
- Vérification de l'intégrité des données lors des mises à jour en masse
- Protection contre les race conditions dans les opérations concurrentes
- Prévention de l'énumération des identifiants

#### 4.2.3 Sécurité de la Recherche
- Limitation des résultats de recherche (pagination obligatoire)
- Vérification des paramètres de confidentialité avant inclusion dans les résultats
- Protection contre les attaques par analyse de trafic
- Prévention des fuites d'information via timing attacks

### 4.3 Sécurité des Médias et Contenus

#### 4.3.1 Images de Profil et de Groupe
- Validation du type MIME des images uploadées
- Restriction des formats acceptés (JPEG, PNG, WebP)
- Limitation de taille (max 5 MB)
- Génération de métadonnées sécurisées après upload

#### 4.3.2 Contenu Utilisateur
- Filtrage basique du contenu texte (biographie, noms de groupe, etc.)
- Détection simple de contenu inapproprié
- Validation des URLs dans les données utilisateur
- Vérification de sécurité des contenus référencés

## 5. Intégration avec les Autres Services

### 5.1 Communication Avec le Service d'Authentification

#### 5.1.1 Validation des Tokens
- Vérification cryptographique des JWT émis par auth-service
- Cache local des clés publiques de vérification
- Vérification des claims spécifiques (scope, exp, etc.)
- Rejet immédiat des tokens invalides ou expirés

#### 5.1.2 Synchronisation des Données
- Écoute des événements d'identité depuis auth-service (création, suppression)
- Vérification d'intégrité pour les opérations de changement de numéro
- Gestion des situations de désynchronisation
- Reconstruction possible à partir des événements d'identité

### 5.2 Intégration avec Media Service

#### 5.2.1 Stockage des Médias
- Référencement sécurisé des URLs de médias
- Contrôle d'accès aux médias via media-service
- Vérification croisée des permissions avant accès aux médias
- Suppression coordonnée des références et des médias

#### 5.2.2 Modération des Contenus
- Intégration avec moderation-service pour les images de profil et de groupe
- Validation préliminaire avant stockage définitif
- Capacité à marquer les contenus inappropriés
- Procédure de contestation des décisions de modération

### 5.3 Intégration avec Messaging Service

#### 5.3.1 Événements et Notifications
- Émission d'événements pour les changements de profil pertinents
- Notifications aux participants lors des modifications de groupe
- Synchronisation des informations de blocage pour le filtrage des messages
- Communication des changements de paramètres de confidentialité

## 6. Détection et Réponse aux Incidents

### 6.1 Journalisation et Surveillance

#### 6.1.1 Journalisation Sécurisée
- Journalisation structurée des événements de sécurité :
  - Accès et modifications de profil
  - Changements dans les relations (contacts, blocages)
  - Opérations administratives sur les groupes
  - Modifications des paramètres de confidentialité
- Format de journalisation JSON via NestJS Logger
- Horodatage précis en UTC
- Expurgation des données sensibles dans les logs

#### 6.1.2 Surveillance et Alertes
- Métriques de sécurité collectées via Prometheus
- Alertes configurées pour les comportements suspects :
  - Nombre élevé de modifications de profil
  - Taux anormal de blocage par les utilisateurs
  - Tentatives répétées d'accès non autorisé
  - Activité inhabituelle sur les groupes
- Dashboard pour visualiser l'activité des utilisateurs

### 6.2 Gestion des Incidents

#### 6.2.1 Classification des Incidents
- Niveaux de gravité définis :
  - Critique : Divulgation non autorisée de données personnelles
  - Élevé : Contournement des contrôles d'accès
  - Moyen : Abus des fonctionnalités de l'application
  - Faible : Anomalies mineures

#### 6.2.2 Procédures de Réponse
- Étapes documentées pour chaque type d'incident
- Procédure d'escalade et personnes à contacter
- Instructions pour limiter l'impact (ex : restrictions temporaires)
- Processus de communication avec les utilisateurs affectés
- Documentation des incidents pour analyse post-mortem

## 7. Sécurité du Développement

### 7.1 Pratiques de Développement Sécurisé

#### 7.1.1 Principes de Code Sécurisé
- Application des principes OWASP dans le développement
- Utilisation des fonctionnalités de sécurité de NestJS
- Patterns pour la validation des données et le contrôle d'accès
- Séparation claire entre les couches de l'application

#### 7.1.2 Revue de Code et Tests
- Revue de sécurité obligatoire pour les fonctionnalités sensibles
- Tests unitaires pour les contrôles de sécurité
- Tests d'intégration pour les scénarios de sécurité complexes
- Analyse statique de code avec ESLint et règles de sécurité

### 7.2 Gestion des Dépendances

#### 7.2.1 Sélection et Validation
- Évaluation des dépendances avant intégration
- Préférence pour les bibliothèques maintenues activement
- Vérification de l'historique de sécurité des packages
- Limitation des dépendances externes au strict nécessaire

#### 7.2.2 Maintenance et Mise à Jour
- Vérification automatique des vulnérabilités avec npm audit
- Planification régulière des mises à jour de sécurité
- Tests de régression après mises à jour majeures
- Documentation des dépendances critiques et alternatives

## 8. Protection des Données Personnelles

### 8.1 Conformité RGPD

#### 8.1.1 Principes Appliqués
- Minimisation des données collectées
- Finalité claire pour chaque donnée
- Exactitude et mise à jour des informations
- Limitation de la conservation
- Intégrité et confidentialité

#### 8.1.2 Droits des Utilisateurs
- Accès à leurs données personnelles
- Rectification des informations inexactes
- Effacement des données (suppression de compte)
- Limitation du traitement via paramètres de confidentialité
- Portabilité des données (export de profil)

### 8.2 Gestion des Consentements

#### 8.2.1 Paramètres de Confidentialité
- Interface claire pour configurer les paramètres de confidentialité
- Options opt-in/opt-out pour les fonctionnalités de découverte
- Granularité des choix de confidentialité
- Persistance des préférences entre sessions

#### 8.2.2 Transparence
- Documentation claire sur l'utilisation des données
- Notifications lors des changements importants
- Visibilité sur qui peut accéder aux informations de profil
- Journal des modifications de paramètres

## 9. Sauvegarde et Récupération

### 9.1 Protection des Données

#### 9.1.1 Stratégie de Sauvegarde
- Sauvegardes régulières de la base de données PostgreSQL
- Rétention des sauvegardes pendant 7 jours
- Chiffrement des sauvegardes au repos
- Tests périodiques de restauration

#### 9.1.2 Restauration et Continuité
- Procédure documentée de restauration des données
- RPO (Recovery Point Objective) : maximum 1 heure de perte de données
- RTO (Recovery Time Objective) : reprise sous 2 heures
- Priorisation des données critiques pour restauration rapide

### 9.2 Gestion des Suppressions

#### 9.2.1 Suppression de Comptes
- Processus en deux étapes (désactivation puis suppression)
- Période de grâce avant suppression définitive (30 jours)
- Anonymisation des données qui doivent être conservées
- Suppression coordonnée avec les autres services

#### 9.2.2 Suppression de Données Spécifiques
- Possibilité de supprimer des éléments spécifiques du profil
- Propagation des suppressions aux caches et index
- Vérification de l'intégrité après suppressions partielles
- Journalisation des suppressions pour audit

## 10. Documentation

### 10.1 Documentation de Sécurité

#### 10.1.1 Documentation Technique
- Architecture de sécurité du service utilisateur
- Modèle de contrôle d'accès et autorisation
- Procédures de vérification des permissions
- Flux de données avec points de contrôle

#### 10.1.2 Guides et Procédures
- Guide d'implémentation des contrôles de sécurité
- Procédures opérationnelles pour les incidents
- Documentation des API avec considérations de sécurité
- Recommandations pour les développeurs

---

## Annexes

### A. Matrice des Risques et Contrôles

| Risque | Probabilité | Impact | Mesures de Contrôle |
|--------|-------------|--------|---------------------|
| Divulgation de données personnelles | Moyenne | Élevé | Paramètres de confidentialité, vérification stricte des accès |
| Usurpation d'identité | Faible | Critique | Authentification forte, journalisation des changements |
| Énumération des utilisateurs | Moyenne | Moyen | Rate limiting, restrictions de recherche |
| Harcèlement entre utilisateurs | Moyenne | Moyen | Fonctionnalités de blocage, détection de comportements abusifs |
| Manipulation de groupes | Faible | Moyen | Contrôle stricte des permissions, journalisation des actions |
| Injection via données de profil | Faible | Élevé | Validation stricte des entrées, échappement des sorties |

### B. Métriques de Sécurité

| Métrique | Objectif | Fréquence de Mesure |
|----------|----------|---------------------|
| Taux de blocage entre utilisateurs | < 2% des interactions | Hebdomadaire |
| Tentatives d'accès non autorisés | < 0.1% des requêtes | Quotidienne |
| Temps de détection des incidents | < 30 minutes | Par incident |
| Taux de faux positifs dans les alertes | < 10% | Mensuelle |
| Couverture des tests de sécurité | > 90% des scénarios critiques | Par release |

### C. Références

- OWASP API Security Top 10
- NIST Privacy Framework
- NestJS Security Best Practices
- RGPD/GDPR Guidelines