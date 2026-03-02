/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/companies.dto';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class CompaniesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly storage: StorageService,
	) {}

	/**
	 * Create a new company
	 */
	async create(dto: CreateCompanyDto) {
		return this.prisma.companies.create({
			data: dto,
		});
	}

	/**
	 * Retrieve multiple companies with pagination
	 */
	async findAll(skip?: number, take?: number) {
		return this.prisma.companies.findMany({
			skip,
			take,
			orderBy: { created_at: 'desc' },
		});
	}

	/**
	 * Retrieve a single company by id
	 */
	async findOne(id: number) {
		const company = await this.prisma.companies.findUnique({
			where: { id },
		});
		if (!company) {
			throw new NotFoundException(`Company with ID ${id} not found`);
		}
		return company;
	}

	/**
	 * Update an existing company by id
	 */
	async update(id: number, dto: UpdateCompanyDto) {
		await this.findOne(id);
		return this.prisma.companies.update({
			where: { id },
			data: dto,
		});
	}

	async uploadLogo(id: number, file: Express.Multer.File) {
		await this.findOne(id);
		const upload = await this.storage.uploadCompanyLogo(id, file);
		return this.prisma.companies.update({
			where: { id },
			data: { logo_url: upload.publicUrl },
		});
	}

	/**
	 * Delete a company by id
	 */
	async remove(id: number) {
		await this.findOne(id);
		return this.prisma.companies.delete({
			where: { id },
		});
	}
}
