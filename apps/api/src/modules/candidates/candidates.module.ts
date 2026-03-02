/** @format */

import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { QueuesModule } from '../queues/queues.module';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';

@Module({
	imports: [StorageModule, QueuesModule],
	controllers: [CandidatesController],
	providers: [CandidatesService],
	exports: [CandidatesService],
})
export class CandidatesModule {}
