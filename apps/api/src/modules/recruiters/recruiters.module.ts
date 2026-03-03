/** @format */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RecruitersController } from './recruiters.controller';
import { RecruitersService } from './recruiters.service';

@Module({
	imports: [PrismaModule, AuthModule],
	controllers: [RecruitersController],
	providers: [RecruitersService],
})
export class RecruitersModule {}
