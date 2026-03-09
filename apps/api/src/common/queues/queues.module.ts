import { Global, Module } from '@nestjs/common';
import { EmbeddingsQueueProducer } from './embeddings-queue.producer';
import { EvaluationQueueProducer } from './evaluation-queue.producer';
import { JobSummaryQueueProducer } from './job-summary-queue.producer';

@Global()
@Module({
	providers: [EmbeddingsQueueProducer, EvaluationQueueProducer, JobSummaryQueueProducer],
	exports: [EmbeddingsQueueProducer, EvaluationQueueProducer, JobSummaryQueueProducer],
})
export class QueuesModule {}
