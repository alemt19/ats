import { Global, Module } from '@nestjs/common';
import { EmbeddingsQueueProducer } from './embeddings-queue.producer';

@Global()
@Module({
	providers: [EmbeddingsQueueProducer],
	exports: [EmbeddingsQueueProducer],
})
export class QueuesModule {}
