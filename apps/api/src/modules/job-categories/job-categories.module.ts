/** @format */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobCategoriesController } from './job-categories.controller';
import { JobCategoriesService } from './job-categories.service';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [JobCategoriesController],
	providers: [JobCategoriesService],
})
export class JobCategoriesModule {}
