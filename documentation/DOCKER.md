# Docker Configuration

## Production Deployment

### Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Makefile

```bash
# Production
make up          # Start services
make down        # Stop services
make logs        # View logs
make build       # Build images
make clean       # Clean everything

# Development
make dev-up      # Start dev environment
make dev-down    # Stop dev environment
make dev-logs    # View dev logs

# Utilities
make shell       # Access service shell
make db-shell    # Access PostgreSQL
make redis-shell # Access Redis
make test        # Run tests
make restart     # Restart service
make rebuild     # Rebuild and restart
```

## Development Environment

### Start Development

```bash
# Using docker-compose
docker-compose -f docker-compose.dev.yml up -d

# Using Makefile
make dev-up
```

### Features

- Hot reload enabled
- Debug port exposed (9229)
- Volume mounting for live code changes
- Separate development database
- Enhanced logging

## Services

### User Service
- **Port**: 3000
- **Health Check**: http://localhost:3000/health
- **Debug Port**: 9229 (dev only)

### PostgreSQL
- **Port**: 5432 (prod), 5433 (dev)
- **Database**: whisper_users
- **User**: whisper_user
- **Password**: whisper_password

### Redis
- **Port**: 6379 (prod), 6380 (dev)
- **Password**: redis_password

## Environment Variables

### Production (.env.docker)
```env
NODE_ENV=production
DATABASE_HOST=postgres
REDIS_HOST=redis
JWT_SECRET=your-super-secret-jwt-key
```

### Development
```env
NODE_ENV=development
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
```

## Health Checks

All services include health checks:
- **User Service**: HTTP endpoint check
- **PostgreSQL**: pg_isready command
- **Redis**: ping command

## Volumes

### Production
- `postgres_data`: PostgreSQL data persistence
- `redis_data`: Redis data persistence

### Development
- Source code mounted for hot reload
- Separate data volumes for isolation

## Networks

- **Production**: whisper-network
- **Development**: whisper-dev-network

## Security

- Non-root user execution
- Minimal Alpine images
- Password-protected Redis
- Network isolation
- Health check monitoring

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check port usage
   lsof -i :3000
   ```

2. **Database connection**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   ```

3. **Redis connection**
   ```bash
   # Test Redis connection
   docker-compose exec redis redis-cli -a redis_password ping
   ```

### Cleanup

```bash
# Remove all containers and volumes
make clean

# Remove unused Docker resources
docker system prune -a
```

## Monitoring

### Service Status
```bash
# Check all services
docker-compose ps

# Check specific service health
docker-compose exec user-service wget -qO- http://localhost:3000/health
```

### Resource Usage
```bash
# Monitor resource usage
docker stats
```