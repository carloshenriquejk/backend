import { NestFactory } from '@nestjs/core';
import { QueuesModule } from './queues/queues.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(QueuesModule);
  app.enableShutdownHooks();
}
void bootstrap();
