/** @format */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCandidateDto, UpdateCandidateDto } from './dto/candidates.dto';
import { StorageService } from '../../common/storage/storage.service';
import { CV_PARSE_QUEUE } from '../queues/queues.constants';

@Injectable()
export class CandidatesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly storage: StorageService,
		@InjectQueue(CV_PARSE_QUEUE)
		private readonly cvParseQueue: Queue,
	) {}

	/**
	 * Create a new candidate
	 */
	async create(dto: CreateCandidateDto) {
		return this.prisma.candidates.create({
			data: dto,
		});
	}

	/**
	 * Retrieve multiple candidates with pagination
	 */
	async findAll(skip?: number, take?: number) {
		return this.prisma.candidates.findMany({
			skip,
			take,
			orderBy: { created_at: 'desc' },
		});
	}

	/**
	 * Retrieve a single candidate by id
	 */
	async findOne(id: number) {
		const candidate = await this.prisma.candidates.findUnique({
			where: { id },
		});
		if (!candidate) {
			throw new NotFoundException(`Candidate with ID ${id} not found`);
		}
		return candidate;
	}

	/**
	 * Update an existing candidate by id
	 */
	async update(id: number, dto: UpdateCandidateDto) {
		await this.findOne(id);
		return this.prisma.candidates.update({
			where: { id },
			data: dto,
		});
	}

	async uploadCv(id: number, file: Express.Multer.File) {
		await this.findOne(id);
		const upload = await this.storage.uploadCandidateCv(id, file);
		await this.cvParseQueue.add('parse-cv', {
			candidate_id: id,
			storage_path: upload.path,
		});
		return this.prisma.candidates.update({
			where: { id },
			data: { cv_file_url: upload.publicUrl },
		});
	}

	/**
	 * Delete a candidate by id
	 */
	async remove(id: number) {
		await this.findOne(id);
		return this.prisma.candidates.delete({
			where: { id },
		});
	}
}
