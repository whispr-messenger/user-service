-- Création de la base de données users_service si elle n'existe pas
CREATE DATABASE IF NOT EXISTS users_service;

-- Utilisation de la base de données
\c users_service;

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les fonctions cryptographiques
CREATE EXTENSION IF NOT EXISTS pgcrypto;