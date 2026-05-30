/** @format */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueuesModule } from '../../common/queues/queues.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminGenericJobDescriptionsController } from './admin-generic-job-descriptions.controller';
import { AdminOffersController } from './admin-offers.controller';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [AuthModule, QueuesModule],
  controllers: [JobsController, AdminOffersController, AdminDashboardController, AdminGenericJobDescriptionsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
