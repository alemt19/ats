/** @format */

import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ApplicationsModule } from './modules/applications/applications.module';

@Module({
	imports: [
		PrismaModule, 
		AuthModule,
		JobsModule,
		CandidatesModule,
		CompaniesModule,
		ApplicationsModule,
	],
})
export class AppModule {}
