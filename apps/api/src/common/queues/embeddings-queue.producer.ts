import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';

type AttributeEmbeddingJob = {
	attributeId: number;
	name: string;
};

@Injectable()
export class EmbeddingsQueueProducer implements OnModuleDestroy {
	private readonly logger = new Logger(EmbeddingsQueueProducer.name);
	private readonly queue: Queue<AttributeEmbeddingJob>;

	constructor() {
		this.queue = new Queue<AttributeEmbeddingJob>('embeddings_queue', {
			connection: this.buildConnection(),
		});
	}

	private buildConnection(): ConnectionOptions {
		const redisUrl = process.env.REDIS_URL?.trim();

		if (!redisUrl) {
			return {
				host: '127.0.0.1',
				port: 6379,
			};
		}

		const parsed = new URL(redisUrl);

		return {
			host: parsed.hostname,
			port: parsed.port ? Number(parsed.port) : 6379,
			username: parsed.username || undefined,
			password: parsed.password || undefined,
			tls: parsed.protocol === 'rediss:' ? {} : undefined,
		};
	}

	async enqueueAttributes(attributes: AttributeEmbeddingJob[]) {
		if (attributes.length === 0) {
			return;
		}

		this.logger.log(`Enqueuing ${attributes.length} embedding job(s)`);

		await Promise.all(
			attributes.map((attribute) =>
				this.queue.add('generate', attribute, {
					attempts: 2_147_483_647,
					backoff: {
						type: 'exponential',
						delay: 20_000,
					},
					removeOnComplete: true,
				}),
			),
		);

		this.logger.log('Embedding job(s) enqueued successfully');
	}

	async onModuleDestroy() {
		await this.queue.close();
	}
}
