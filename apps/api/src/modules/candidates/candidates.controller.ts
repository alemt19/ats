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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CandidatesService } from './candidates.service';
import { CandidatesQueryDto, CreateCandidateDto, UpdateCandidateDto, UpdateMyCandidateDto } from './dto/candidates.dto';
import { UpdateMyCompetenciasValoresDto } from './dto/competencias-valores.dto';
import { BetterAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Request } from 'express';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';

@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

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
		return this.candidatesService.findAll(skip, take);
	}

  @UseGuards(BetterAuthGuard)
  @Get('me')
  findMe(@CurrentUser() session: any) {
    const userId = this.getUserIdFromSession(session);
    return this.candidatesService.findMe(userId);
  }

  @UseGuards(BetterAuthGuard)
  @Get('me/competencias-valores')
  findMeCompetenciasValores(@CurrentUser() session: any) {
    const userId = this.getUserIdFromSession(session);
    return this.candidatesService.findMeCompetenciasValores(userId);
  }

  @UseGuards(BetterAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() session: any, @Body() dto: UpdateMyCandidateDto) {
    const userId = this.getUserIdFromSession(session);
    return this.candidatesService.updateMe(userId, dto);
  }

  @UseGuards(BetterAuthGuard)
  @Patch('me/competencias-valores')
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        const isDocx =
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.originalname.toLowerCase().endsWith('.docx');

        if (!isPdf && !isDocx) {
          return callback(new BadRequestException('Only PDF or DOCX files are allowed'), false);
        }

        callback(null, true);
      },
    }),
  )
  async updateMeCompetenciasValores(
    @CurrentUser() session: any,
    @Body() dto: UpdateMyCompetenciasValoresDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId = this.getUserIdFromSession(session);
    const cvFileUrl = file
      ? await this.supabaseStorageService.uploadImage(file, 'candidates')
      : undefined;

    return this.candidatesService.updateMeCompetenciasValores(userId, dto, cvFileUrl);
  }

  @UseGuards(BetterAuthGuard)
  @Post('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('profile_picture', {
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
    const imageUrl = await this.supabaseStorageService.uploadImage(file, 'candidates');

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
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateCandidateDto,
	) {
		return this.candidatesService.update(id, dto);
	}

	@Post(':id/cv')
	@UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        const isPdf =
          file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        const isDocx =
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.originalname.toLowerCase().endsWith('.docx');

        if (!isPdf && !isDocx) {
          return callback(new BadRequestException('Only PDF or DOCX files are allowed'), false);
        }

        callback(null, true);
      },
    }),
  )
	uploadCv(
		@Param('id', ParseIntPipe) id: number,
		@UploadedFile() file: Express.Multer.File,
	) {
		return this.candidatesService.uploadCv(id, file);
	}

	@Delete(':id')
	remove(@Param('id', ParseIntPipe) id: number) {
		return this.candidatesService.remove(id);
	}
}
