/** @format */

import { createZodDto } from 'nestjs-zod';
import { CreateCandidateSchema, UpdateCandidateSchema, CandidateSchema, PaginationSchema } from '@repo/schema';

export class CreateCandidateDto extends createZodDto(CreateCandidateSchema) {}
export class UpdateCandidateDto extends createZodDto(UpdateCandidateSchema) {}
export class CandidatesQueryDto extends createZodDto(PaginationSchema) {}
