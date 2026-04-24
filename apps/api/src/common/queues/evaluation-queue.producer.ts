/** @format */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, type ConnectionOptions } from 'bullmq';

type EvaluationJob = {
	applicationId: number;
	candidateId: number;
	jobId: number;
};

@Injectable()
export class EvaluationQueueProducer implements OnModuleDestroy {
	private readonly logger = new Logger(EvaluationQueueProducer.name);
	private readonly queue: Queue<EvaluationJob>;

	constructor() {
		this.queue = new Queue<EvaluationJob>('evaluation', {
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

	async enqueueEvaluation(data: EvaluationJob) {
		this.logger.log(
			`Enqueuing evaluation for application ${data.applicationId}`,
		);

		await this.queue.add('evaluate', data, {
			attempts: Number.MAX_SAFE_INTEGER,
			backoff: {
				type: 'exponential',
				delay: 60000,
			},
			removeOnComplete: true,
			removeOnFail: false,
		});

		this.logger.log('Evaluation job enqueued successfully');
	}

	async onModuleDestroy() {
		await this.queue.close();
	}
}
