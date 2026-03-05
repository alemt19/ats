/** @format */

import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { RecruitersModule } from './modules/recruiters/recruiters.module';
import { JobCategoriesModule } from './modules/job-categories/job-categories.module';
import { StorageModule } from './common/storage/storage.module';
import { QueuesModule } from './common/queues/queues.module';

@Module({
	imports: [
		StorageModule,
		QueuesModule,
		PrismaModule, 
		AuthModule,
		JobsModule,
		CandidatesModule,
		CompaniesModule,
		ApplicationsModule,
		RecruitersModule,
		JobCategoriesModule,
	],
})
export class AppModule {}
