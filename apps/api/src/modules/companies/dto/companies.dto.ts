/** @format */

import { createZodDto } from 'nestjs-zod';
import { CreateCompanySchema, UpdateCompanySchema, CompanySchema, PaginationSchema } from '@repo/schema';

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {}
export class UpdateCompanyDto extends createZodDto(UpdateCompanySchema) {}
export class CompaniesQueryDto extends createZodDto(PaginationSchema) {}
