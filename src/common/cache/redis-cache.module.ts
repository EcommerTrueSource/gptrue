import { Module } from '@nestjs/common';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisCacheService } from './redis-cache.service';
import { RedisClientOptions } from 'redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<CacheModuleOptions> => ({
        store: redisStore,
        host: configService.get<string>('app.redis.host') || 'localhost',
        port: configService.get<number>('app.redis.port') || 6379,
        password: configService.get<string>('app.redis.password'),
        ttl: configService.get<number>('app.redis.ttl') || 3600,
        max: configService.get<number>('app.redis.max') || 100,
        isGlobal: true,
      }),
    }),
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
