/** @format */

import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Query,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CandidatesService } from './candidates.service';
import {
	CandidatesQueryDto,
	CreateCandidateDto,
	UpdateCandidateDto,
} from './dto/candidates.dto';

@Controller('candidates')
export class CandidatesController {
	constructor(private readonly candidatesService: CandidatesService) {}

	@Post()
	create(@Body() dto: CreateCandidateDto) {
		return this.candidatesService.create(dto);
	}

	@Get()
	findAll(@Query() dto: CandidatesQueryDto) {
		const { skip, take } = dto;
		return this.candidatesService.findAll(skip, take);
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
	@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
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
