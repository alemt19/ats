/** @format */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesQueryDto, CreateCandidateDto, UpdateCandidateDto } from './dto/candidates.dto';

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
    return this.candidatesService.findAll(
      skip,
      take,
    );
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
