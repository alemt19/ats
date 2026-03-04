import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'node:path';

@Injectable()
export class SupabaseStorageService {
	private readonly bucket: string;
	private readonly supabaseUrl?: string;
	private readonly supabaseServiceRoleKey?: string;

	constructor() {
		this.supabaseUrl = process.env.SUPABASE_URL;
		this.supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
		this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'ats-files';
	}

	private getClient(): SupabaseClient {
		if (!this.supabaseUrl || !this.supabaseServiceRoleKey) {
			throw new InternalServerErrorException(
				'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file uploads',
			);
		}

		return createClient(this.supabaseUrl, this.supabaseServiceRoleKey);
	}

	private inferExtension(file: Express.Multer.File) {
		const fromOriginal = extname(file.originalname || '').toLowerCase();
		if (fromOriginal) {
			return fromOriginal;
		}

		const fromMime = file.mimetype?.split('/')[1]?.toLowerCase();
		if (!fromMime) {
			return '.jpg';
		}

		if (fromMime === 'jpeg') {
			return '.jpg';
		}

		return `.${fromMime}`;
	}

	async uploadImage(file: Express.Multer.File, folder: string) {
		if (!file?.buffer || file.buffer.length === 0) {
			throw new BadRequestException('Empty file payload');
		}

		const supabase = this.getClient();

		const safeFolder = folder.replace(/^\/+|\/+$/g, '');
		const fileExt = this.inferExtension(file);
		const fileName = `${safeFolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

		const { error } = await supabase.storage
			.from(this.bucket)
			.upload(fileName, file.buffer, {
				contentType: file.mimetype || 'application/octet-stream',
				upsert: false,
			});

		if (error) {
			throw new InternalServerErrorException('No se pudo subir el archivo a Supabase Storage');
		}

		const { data } = supabase.storage.from(this.bucket).getPublicUrl(fileName);
		if (!data?.publicUrl) {
			throw new InternalServerErrorException('No se pudo resolver la URL pública del archivo');
		}

		return data.publicUrl;
	}
}
