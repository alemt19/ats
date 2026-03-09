/** @format */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';

type JobSummaryEmbeddingJob = {
	jobId: number;
};

@Injectable()
export class JobSummaryQueueProducer implements OnModuleDestroy {
	private readonly logger = new Logger(JobSummaryQueueProducer.name);
	private readonly queue: Queue<JobSummaryEmbeddingJob>;

	constructor() {
		this.queue = new Queue<JobSummaryEmbeddingJob>('job-summary-embedding', {
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

	async enqueueJobSummaryEmbedding(data: JobSummaryEmbeddingJob) {
		this.logger.log(
			`Enqueuing summary embedding generation for job ${data.jobId}`,
		);

		await this.queue.add('generate-summary', data, {
			attempts: 3,
			backoff: {
				type: 'exponential',
				delay: 10_000,
			},
			removeOnComplete: true,
			removeOnFail: false,
		});

		this.logger.log('Job summary embedding job enqueued successfully');
	}

	async onModuleDestroy() {
		await this.queue.close();
	}
}
