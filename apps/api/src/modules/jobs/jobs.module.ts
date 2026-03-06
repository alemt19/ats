/** @format */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminOffersController } from './admin-offers.controller';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [AuthModule],
  controllers: [JobsController, AdminOffersController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
