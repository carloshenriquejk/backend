import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface ProductCreatedJob {
  productId: string;
  name: string;
  imageUrl?: string;
}

@Processor('product-processing')
export class ProductProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductProcessor.name);

  async process(job: Job<ProductCreatedJob>): Promise<void> {
    this.logger.log(`Processing job ${job.name} [${job.id}]`);

    if (job.name === 'product.created') {
      await this.handleProductCreated(job.data);
    }
  }

  private async handleProductCreated(data: ProductCreatedJob): Promise<void> {
    await this.optimizeImage(data);
    await this.indexProduct(data);
    await this.sendNotification(data);
  }

  private async optimizeImage(data: ProductCreatedJob): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    this.logger.log(`Image optimized for product ${data.productId}`);
  }

  private async indexProduct(data: ProductCreatedJob): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.logger.log(`Product ${data.productId} indexed in search service`);
  }

  private async sendNotification(data: ProductCreatedJob): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.logger.log(`Notification sent for product "${data.name}"`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
  }
}
