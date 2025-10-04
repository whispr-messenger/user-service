import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { SearchIndexService } from './search-index.service';
import { RedisConfig } from '../config/redis.config';

@Global()
@Module({
  providers: [RedisConfig, CacheService, SearchIndexService],
  exports: [CacheService, SearchIndexService],
})
export class CacheModule {}
