import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductProcessor } from './processors/product.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'product-processing' }),
  ],
  providers: [ProductProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
