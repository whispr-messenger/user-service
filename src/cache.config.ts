import { CacheModuleAsyncOptions, CacheOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

function cacheModuleOptionsFactory(configService: ConfigService): CacheOptions {
    const redis_host = configService.get('REDIS_HOST', 'redis');
    const redis_port = configService.get('REDIS_PORT', 6379);
    const redis_url = `redis://${redis_host}:${redis_port}`;

    return {
        stores: [new KeyvRedis(redis_url)],
        ttl: 900,
        max: 1000,
    };
}

// Caching (Redis)
export const cacheModuleAsyncOptions: CacheModuleAsyncOptions = {
    imports: [ConfigModule],
    useFactory: cacheModuleOptionsFactory,
    inject: [ConfigService],
    isGlobal: true,
};