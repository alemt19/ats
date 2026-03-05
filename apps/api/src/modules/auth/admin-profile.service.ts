/** @format */

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPublicEmail } from './auth-email-scope';
import { UpdateAdminProfileDto } from './dto/admin-profile.dto';

@Injectable()
export class AdminProfileService {
	constructor(private readonly prisma: PrismaService) {}

	private composePhone(phone: string, phonePrefix?: string) {
		const rawPhone = phone.trim();
		const rawPrefix = (phonePrefix ?? '').trim();

		if (!rawPhone) {
			return '';
		}

		if (!rawPrefix) {
			return rawPhone;
		}

		return `${rawPrefix}${rawPhone}`;
	}

	private parseBirthDate(value?: string) {
		const raw = (value ?? '').trim();
		if (!raw) {
			return null;
		}

		const parsed = new Date(raw);
		if (Number.isNaN(parsed.getTime())) {
			throw new BadRequestException('Fecha de nacimiento inválida');
		}

		return parsed;
	}

	private mapAdminProfile(record: {
		id: number;
		profile_picture: string | null;
		name: string | null;
		lastname: string | null;
		dni: string | null;
		phone: string | null;
		role: string | null;
		country: string | null;
		state: string | null;
		city: string | null;
		address: string | null;
		birth_date: Date | null;
		user: { email: string | null } | null;
	}) {
		return {
			id: record.id,
			profile_picture: record.profile_picture ?? '',
			name: record.name ?? '',
			lastname: record.lastname ?? '',
			email: record.user?.email ? toPublicEmail(record.user.email) : '',
			dni: record.dni ?? '',
			phone: record.phone ?? '',
			role: record.role ?? '',
			country: record.country ?? '',
			state: record.state ?? '',
			city: record.city ?? '',
			address: record.address ?? '',
			birth_date: record.birth_date ? record.birth_date.toISOString().slice(0, 10) : '',
		};
	}

	async getProfile(userId: string) {
		const adminProfile = await this.prisma.user_admin.findUnique({
			where: { user_id: userId },
			select: {
				id: true,
				profile_picture: true,
				name: true,
				lastname: true,
				dni: true,
				phone: true,
				role: true,
				country: true,
				state: true,
				city: true,
				address: true,
				birth_date: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		if (!adminProfile) {
			throw new ForbiddenException('Admin access required');
		}

		return this.mapAdminProfile(adminProfile);
	}

	async updateProfile(userId: string, dto: UpdateAdminProfileDto, profilePictureUrl?: string | null) {
		const existing = await this.prisma.user_admin.findUnique({
			where: { user_id: userId },
			select: { id: true },
		});

		if (!existing) {
			throw new ForbiddenException('Admin access required');
		}

		const updated = await this.prisma.user_admin.update({
			where: { id: existing.id },
			data: {
				profile_picture: profilePictureUrl ?? (dto.profile_picture?.trim() || undefined),
				name: dto.name.trim(),
				lastname: dto.lastname.trim(),
				dni: dto.dni.trim() || null,
				phone: this.composePhone(dto.phone, dto.phone_prefix) || null,
				state: dto.state.trim(),
				city: dto.city.trim(),
				address: dto.address.trim(),
				birth_date: this.parseBirthDate(dto.birth_date),
			},
			select: {
				id: true,
				profile_picture: true,
				name: true,
				lastname: true,
				dni: true,
				phone: true,
				role: true,
				country: true,
				state: true,
				city: true,
				address: true,
				birth_date: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		return this.mapAdminProfile(updated);
	}
}
