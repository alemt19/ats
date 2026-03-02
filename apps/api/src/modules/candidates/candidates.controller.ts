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
  UseGuards,
  UseInterceptors,
  UnauthorizedException,
  UploadedFile,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesQueryDto, CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import type { StorageEngine } from 'multer';
import { extname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  private getUserIdFromSession(session: any): string {
    const userId = session?.user?.id ?? session?.id;
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid authenticated user');
    }
    return userId;
  }

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto);
  }

  @Get()
  findAll(@Query() dto: CandidatesQueryDto) {
    const { skip, take } = dto;
    return this.candidatesService.findAll(
      skip,
      take,
    );
  }

  @UseGuards(BetterAuthGuard)
  @Get('me')
  findMe(@CurrentUser() session: any) {
    const userId = this.getUserIdFromSession(session);
    return this.candidatesService.findMe(userId);
  }

  @UseGuards(BetterAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() session: any, @Body() dto: UpdateMyCandidateDto) {
    const userId = this.getUserIdFromSession(session);
    return this.candidatesService.updateMe(userId, dto);
  }

  @UseGuards(BetterAuthGuard)
  @Post('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('profile_picture', {
      storage: diskStorage({
        destination: (
          _req: Request,
          _file: Express.Multer.File,
          callback: (error: Error | null, destination: string) => void,
        ) => {
          const uploadDir = resolve(process.cwd(), 'uploads', 'candidates');
          mkdirSync(uploadDir, { recursive: true });
          callback(null, uploadDir);
        },
        filename: (
          _req: Request,
          file: Express.Multer.File,
          callback: (error: Error | null, filename: string) => void,
        ) => {
          const fileExt = extname(file.originalname || '').toLowerCase();
          const safeExt = fileExt || '.jpg';
          const fileName = `candidate-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
          callback(null, fileName);
        },
      }) as StorageEngine,
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
    }),
  )
  async uploadProfilePicture(
    @CurrentUser() session: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('profile_picture file is required');
    }

    const userId = this.getUserIdFromSession(session);
    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:4000';
    const imageUrl = `${backendPublicUrl}/uploads/candidates/${file.filename}`;

    const candidate = await this.candidatesService.updateMe(userId, {
      profile_picture: imageUrl,
    });

    return {
      imageUrl,
      candidate,
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.remove(id);
  }
}
