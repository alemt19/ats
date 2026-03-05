/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
	CreateJobCategoryDto,
	JobCategoriesQueryDto,
	UpdateJobCategoryDto,
} from './dto/job-categories.dto';

@Injectable()
export class JobCategoriesService {
	constructor(private readonly prisma: PrismaService) {}

	async findAll(query: JobCategoriesQueryDto) {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 10;
		const normalizedName = query.name?.trim().toLowerCase() ?? '';

		const where = normalizedName
			? {
				name: {
					contains: normalizedName,
					mode: 'insensitive' as const,
				},
			}
			: {};

		const [total, records] = await Promise.all([
			this.prisma.job_categories.count({ where }),
			this.prisma.job_categories.findMany({
				where,
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { name: 'asc' },
			}),
		]);

		return {
			items: records
				.filter((record) => Boolean(record.name?.trim()))
				.map((record) => ({
					id: record.id,
					name: record.name!.trim(),
				})),
			total,
			page,
			pageSize,
		};
	}

	async findOne(id: number) {
		const category = await this.prisma.job_categories.findUnique({
			where: { id },
		});

		if (!category || !category.name?.trim()) {
			throw new NotFoundException(`Category with ID ${id} not found`);
		}

		return {
			id: category.id,
			name: category.name.trim(),
		};
	}

	async create(dto: CreateJobCategoryDto) {
		const created = await this.prisma.job_categories.create({
			data: {
				name: dto.name.trim(),
			},
		});

		return {
			id: created.id,
			name: created.name?.trim() ?? dto.name.trim(),
		};
	}

	async update(id: number, dto: UpdateJobCategoryDto) {
		await this.findOne(id);

		const updated = await this.prisma.job_categories.update({
			where: { id },
			data: {
				name: dto.name.trim(),
			},
		});

		return {
			id: updated.id,
			name: updated.name?.trim() ?? dto.name.trim(),
		};
	}

	async remove(id: number) {
		await this.findOne(id);
		return this.prisma.job_categories.delete({ where: { id } });
	}
}
