/** @format */

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, MailerModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
