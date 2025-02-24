import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('redis.host') || 'localhost',
        port: configService.get<number>('redis.port') || 6379,
        password: configService.get<string>('redis.password'),
        ttl: configService.get<number>('redis.ttl') || 3600, // 1 hora por padrão
        max: configService.get<number>('redis.max') || 100, // máximo de itens em cache
      }),
    }),
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {} 