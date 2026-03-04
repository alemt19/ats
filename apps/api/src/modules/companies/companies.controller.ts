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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CompaniesService } from './companies.service';
import { CompaniesQueryDto, CreateCompanyDto, UpdateCompanyDto } from './dto/companies.dto';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';
import { UpdateCompanyConfigDto } from './dto/company-config.dto';

@Controller()
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  private getUserIdFromSession(session: any): string {
    const userId = session?.user?.id ?? session?.id;
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    return userId;
  }

  private assertAdminScope(request: Request) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      throw new UnauthorizedException('Missing admin session cookie');
    }

    const match = cookieHeader.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/);
    if (match?.[1] !== 'admin') {
      throw new UnauthorizedException('Admin session required');
    }
  }

  @Get('admin/company-config')
  @UseGuards(BetterAuthGuard)
  getCompanyConfig(
    @CurrentUser() session: any,
    @Req() request: Request,
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);
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
    @CurrentUser() session: any,
    @Req() request: Request,
    @Body() dto: UpdateCompanyConfigDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    this.assertAdminScope(request);
    const userId = this.getUserIdFromSession(session);

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
}
