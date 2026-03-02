/** @format */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CV_PARSE_QUEUE } from './queues.constants';

@Module({
	imports: [
		BullModule.forRoot({
			connection: {
				url: process.env.REDIS_URL ?? 'redis://localhost:6379',
			},
		}),
		BullModule.registerQueue({ name: CV_PARSE_QUEUE }),
	],
	exports: [BullModule],
})
export class QueuesModule {}
