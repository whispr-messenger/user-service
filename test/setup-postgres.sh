#!/bin/bash
set -e

echo "Waiting for Postgres to be ready..."
until pg_isready -h localhost -p 5432 -U postgres; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done

echo "Postgres is up - executing command"

# Create test user and database if they don't exist
psql -h localhost -p 5432 -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname = 'test'" | grep -q 1 || \
psql -h localhost -p 5432 -U postgres -c "CREATE USER test WITH PASSWORD 'test';"

psql -h localhost -p 5432 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'test_db'" | grep -q 1 || \
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE test_db OWNER test;"

echo "Test database setup complete."
