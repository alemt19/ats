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
import { CompaniesService } from './companies.service';
import {
	CompaniesQueryDto,
	CreateCompanyDto,
	UpdateCompanyDto,
} from './dto/companies.dto';

@Controller('companies')
export class CompaniesController {
	constructor(private readonly companiesService: CompaniesService) {}

	@Post()
	create(@Body() dto: CreateCompanyDto) {
		return this.companiesService.create(dto);
	}

	@Get()
	findAll(@Query() dto: CompaniesQueryDto) {
		const { skip, take } = dto;
		return this.companiesService.findAll(skip, take);
	}

	@Get(':id')
	findOne(@Param('id', ParseIntPipe) id: number) {
		return this.companiesService.findOne(id);
	}

	@Patch(':id')
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateCompanyDto,
	) {
		return this.companiesService.update(id, dto);
	}

	@Post(':id/logo')
	@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
	uploadLogo(
		@Param('id', ParseIntPipe) id: number,
		@UploadedFile() file: Express.Multer.File,
	) {
		return this.companiesService.uploadLogo(id, file);
	}

	@Delete(':id')
	remove(@Param('id', ParseIntPipe) id: number) {
		return this.companiesService.remove(id);
	}
}
