.PHONY: build up down logs clean dev-up dev-down dev-logs test

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v --rmi all

dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

test:
	docker-compose exec user-service npm run test

test-e2e:
	docker-compose exec user-service npm run test:e2e

test-cov:
	docker-compose exec user-service npm run test:cov

shell:
	docker-compose exec user-service sh

db-shell:
	docker-compose exec postgres psql -U whisper_user -d whisper_users

redis-shell:
	docker-compose exec redis redis-cli -a redis_password

restart:
	docker-compose restart user-service

rebuild:
	docker-compose down && docker-compose build --no-cache && docker-compose up -d