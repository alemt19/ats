import { BadRequestException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const DEFAULT_BUCKET = 'ats-files';

@Injectable()
export class StorageService {
	private readonly client: SupabaseClient;
	private readonly bucket: string;

	constructor() {
		const url = process.env.SUPABASE_URL ?? '';
		const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
		if (!url || !key) {
			throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
		}
		this.client = createClient(url, key, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
		this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_BUCKET;
	}

	async uploadCandidateCv(candidateId: number, file: Express.Multer.File) {
		return this.uploadFile({
			folder: 'cvs',
			ownerId: candidateId,
			file,
			defaultExt: 'pdf',
		});
	}

	async uploadCompanyLogo(companyId: number, file: Express.Multer.File) {
		return this.uploadFile({
			folder: 'company-logos',
			ownerId: companyId,
			file,
		});
	}

	private async uploadFile(params: {
		folder: string;
		ownerId: number;
		file: Express.Multer.File;
		defaultExt?: string;
	}) {
		const { folder, ownerId, file, defaultExt } = params;
		if (!file) {
			throw new BadRequestException('File is required');
		}

		const extension = this.resolveExtension(file, defaultExt);
		const timestamp = Date.now();
		const filename = `${timestamp}-${randomUUID()}.${extension}`;
		const path = `${folder}/${ownerId}/${filename}`;

		const { error } = await this.client.storage
			.from(this.bucket)
			.upload(path, file.buffer, {
				contentType: file.mimetype,
				upsert: true,
			});

		if (error) {
			throw new BadRequestException(`Storage upload failed: ${error.message}`);
		}

		const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
		return {
			path,
			publicUrl: data.publicUrl,
			contentType: file.mimetype,
			size: file.size,
			filename,
		};
	}

	private resolveExtension(file: Express.Multer.File, defaultExt?: string) {
		const original = file.originalname ?? '';
		const dot = original.lastIndexOf('.');
		if (dot >= 0 && dot < original.length - 1) {
			return original.slice(dot + 1).toLowerCase();
		}
		if (defaultExt) {
			return defaultExt;
		}
		return 'bin';
	}
}
