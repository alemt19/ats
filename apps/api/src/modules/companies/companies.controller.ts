/** @format */

import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CompaniesService } from './companies.service';
import { AdminAuthorizationService } from '../auth/admin-authorization.service';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';
import { ADMIN_ROLE_HEAD_OF_RECRUITERS } from '../auth/admin-roles';
import { UpdateCompanyConfigDto } from './dto/company-config.dto';
import {
	CompaniesQueryDto,
	CreateCompanyDto,
	UpdateCompanyDto,
} from './dto/companies.dto';

@Controller()
export class CompaniesController {
  constructor(
    private readonly adminAuthorizationService: AdminAuthorizationService,
    private readonly companiesService: CompaniesService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  @Get('admin/company-config')
  @UseGuards(BetterAuthGuard)
  async getCompanyConfig(
    @CurrentUser() session: unknown,
    @Req() request: Request,
  ) {
    const { userId } = await this.adminAuthorizationService.authorizeAdminRequest(session, request);
    return this.companiesService.getCompanyConfig(userId);
  }

  @Put('admin/company-config')
  @UseGuards(BetterAuthGuard)
  @UseInterceptors(FileInterceptor('logo_file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!file.mimetype?.startsWith('image/')) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }

      callback(null, true);
    },
  }))
  async updateCompanyConfig(
    @CurrentUser() session: unknown,
    @Req() request: Request,
    @Body() dto: UpdateCompanyConfigDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    const { userId } = await this.adminAuthorizationService.authorizeAdminRequest(
      session,
      request,
      [ADMIN_ROLE_HEAD_OF_RECRUITERS],
    );

    const payload = {
      ...dto,
      logo_url: logoFile
        ? await this.supabaseStorageService.uploadImage(logoFile, 'companies')
        : undefined,
    };

    return this.companiesService.updateCompanyConfig(userId, payload);
  }

  @Post('companies')
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get('companies')
  findAll(@Query() dto: CompaniesQueryDto) {
    const { skip, take } = dto;
    return this.companiesService.findAll(
      skip,
      take,
    );
  }

  @Get('companies/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.findOne(id);
  }

  @Patch('companies/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete('companies/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companiesService.remove(id);
  }

	@Post(':id/logo')
	@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
	uploadLogo(
		@Param('id', ParseIntPipe) id: number,
		@UploadedFile() file: Express.Multer.File,
	) {
		return this.companiesService.uploadLogo(id, file);
	}
}
