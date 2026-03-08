/** @format */

import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
