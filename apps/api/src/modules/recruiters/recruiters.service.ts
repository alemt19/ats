/** @format */

import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toAdminScopedEmail, toPublicEmail } from '../auth/auth-email-scope';
import {
	CreateRecruiterDto,
	RecruitersQueryDto,
	UpdateRecruiterDto,
} from './dto/recruiters.dto';

type BetterAuthProvider = {
	auth?: {
		api?: {
			signUpEmail?: (input: {
				body: {
					email: string;
					password: string;
					name: string;
					callbackURL?: string;
				};
			}) => Promise<unknown>;
		};
	};
};

@Injectable()
export class RecruitersService {
	constructor(
		private readonly prisma: PrismaService,
		@Inject('BETTER_AUTH') private readonly betterAuth: BetterAuthProvider,
	) {}

	private async getCurrentAdmin(userId: string) {
		const adminProfile = await this.prisma.user_admin.findUnique({
			where: { user_id: userId },
		});

		if (!adminProfile) {
			throw new ForbiddenException('Admin access required');
		}

		return adminProfile;
	}

	private mapRecruiter(
		recruiter: {
			id: number;
			profile_picture: string | null;
			name: string | null;
			lastname: string | null;
			birth_date: Date | null;
			dni: string | null;
			phone: string | null;
			role: string | null;
			country: string | null;
			state: string | null;
			city: string | null;
			address: string | null;
			user: { email: string | null } | null;
		},
	) {
		return {
			id: recruiter.id,
			profile_picture: recruiter.profile_picture ?? '',
			name: recruiter.name ?? '',
			lastname: recruiter.lastname ?? '',
			email: recruiter.user?.email ? toPublicEmail(recruiter.user.email) : '',
			password: '',
			birth_date: this.formatBirthDateForInput(recruiter.birth_date),
			dni: recruiter.dni ?? '',
			phone: recruiter.phone ?? '',
			role: recruiter.role ?? '',
			country: recruiter.country ?? '',
			state: recruiter.state ?? '',
			city: recruiter.city ?? '',
			address: recruiter.address ?? '',
		};
	}

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

	private parseBirthDateInput(rawDate?: string): Date | null {
		const normalized = (rawDate ?? '').trim();
		if (!normalized) {
			return null;
		}

		return new Date(`${normalized}T00:00:00.000Z`);
	}

	private formatBirthDateForInput(value: Date | null): string {
		if (!value) {
			return '';
		}

		return value.toISOString().slice(0, 10);
	}

	private async signUpRecruiterAccount(dto: CreateRecruiterDto) {
		const signUpEmail = this.betterAuth.auth?.api?.signUpEmail;

		if (typeof signUpEmail !== 'function') {
			throw new BadRequestException('Auth provider is not available');
		}

		const publicAppUrl = process.env.APP_URL ?? 'http://localhost:3000';
		const scopedEmail = toAdminScopedEmail(dto.email);

		try {
			await signUpEmail({
				body: {
					email: scopedEmail,
					password: dto.password,
					name: `${dto.name} ${dto.lastname}`.trim(),
					callbackURL: `${publicAppUrl}/admin/reclutadores/crear/email-verification?email=${encodeURIComponent(dto.email)}`,
				},
			});
		} catch (error) {
			throw new BadRequestException('No se pudo crear la cuenta del reclutador');
		}

		const user = await this.prisma.user.findUnique({
			where: { email: scopedEmail },
			select: { id: true },
		});

		if (!user) {
			throw new BadRequestException('No se pudo resolver la cuenta del reclutador');
		}

		return user.id;
	}

	async findAll(userId: string, query: RecruitersQueryDto) {
		const adminProfile = await this.getCurrentAdmin(userId);
		const search = (query.search ?? '').trim();
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 10;
		const skip = (page - 1) * pageSize;

		const where = {
			...(adminProfile.company_id ? { company_id: adminProfile.company_id } : {}),
			...(search
				? {
					OR: [
						{ name: { contains: search, mode: 'insensitive' as const } },
						{ lastname: { contains: search, mode: 'insensitive' as const } },
						{ dni: { contains: search, mode: 'insensitive' as const } },
						{
							user: {
								email: {
									contains: toAdminScopedEmail(search),
									mode: 'insensitive' as const,
								},
							},
						},
					],
				}
				: {}),
		};

		const [items, total] = await this.prisma.$transaction([
			this.prisma.user_admin.findMany({
				where,
				skip,
				take: pageSize,
				orderBy: { created_at: 'desc' },
				select: {
					id: true,
					profile_picture: true,
					name: true,
					lastname: true,
					birth_date: true,
					dni: true,
					phone: true,
					role: true,
					country: true,
					state: true,
					city: true,
					address: true,
					user: {
						select: {
							email: true,
						},
					},
				},
			}),
			this.prisma.user_admin.count({ where }),
		]);

		return {
			items: items.map((item) => this.mapRecruiter(item)),
			total,
			page,
			pageSize,
		};
	}

	async findOne(userId: string, recruiterId: number) {
		const adminProfile = await this.getCurrentAdmin(userId);

		const recruiter = await this.prisma.user_admin.findFirst({
			where: {
				id: recruiterId,
				...(adminProfile.company_id
					? { company_id: adminProfile.company_id }
					: {}),
			},
			select: {
				id: true,
				profile_picture: true,
				name: true,
				lastname: true,
				birth_date: true,
				dni: true,
				phone: true,
				role: true,
				country: true,
				state: true,
				city: true,
				address: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		if (!recruiter) {
			throw new NotFoundException('Reclutador no encontrado');
		}

		return this.mapRecruiter(recruiter);
	}

	async create(userId: string, dto: CreateRecruiterDto) {
		const adminProfile = await this.getCurrentAdmin(userId);
		const scopedEmail = toAdminScopedEmail(dto.email);

		const existingUser = await this.prisma.user.findUnique({
			where: { email: scopedEmail },
			select: {
				id: true,
				admin: {
					select: { id: true },
				},
			},
		});

		if (existingUser?.admin) {
			throw new ConflictException('Ya existe un reclutador con ese correo');
		}

		const authUserId = existingUser?.id ?? (await this.signUpRecruiterAccount(dto));

		const recruiter = await this.prisma.user_admin.upsert({
			where: { user_id: authUserId },
			update: {
				company_id: adminProfile.company_id,
				profile_picture: dto.profile_picture?.trim() || null,
				name: dto.name,
				lastname: dto.lastname,
				birth_date: this.parseBirthDateInput(dto.birth_date),
				dni: dto.dni || null,
				phone: this.composePhone(dto.phone, dto.phone_prefix) || null,
				role: dto.role,
				country: dto.country || null,
				state: dto.state,
				city: dto.city,
				address: dto.address,
			},
			create: {
				company_id: adminProfile.company_id,
				user_id: authUserId,
				profile_picture: dto.profile_picture?.trim() || null,
				name: dto.name,
				lastname: dto.lastname,
				birth_date: this.parseBirthDateInput(dto.birth_date),
				dni: dto.dni || null,
				phone: this.composePhone(dto.phone, dto.phone_prefix) || null,
				role: dto.role,
				country: dto.country || null,
				state: dto.state,
				city: dto.city,
				address: dto.address,
			},
			select: {
				id: true,
				profile_picture: true,
				name: true,
				lastname: true,
				birth_date: true,
				dni: true,
				phone: true,
				role: true,
				country: true,
				state: true,
				city: true,
				address: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		return this.mapRecruiter(recruiter);
	}

	async update(userId: string, recruiterId: number, dto: UpdateRecruiterDto) {
		const adminProfile = await this.getCurrentAdmin(userId);

		const recruiter = await this.prisma.user_admin.findFirst({
			where: {
				id: recruiterId,
				...(adminProfile.company_id
					? { company_id: adminProfile.company_id }
					: {}),
			},
			select: {
				id: true,
				user_id: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		if (!recruiter) {
			throw new NotFoundException('Reclutador no encontrado');
		}

		const updated = await this.prisma.user_admin.update({
			where: { id: recruiter.id },
			data: {
				profile_picture:
					typeof dto.profile_picture === 'string'
						? dto.profile_picture.trim() || null
						: undefined,
				name: dto.name,
				lastname: dto.lastname,
				birth_date: this.parseBirthDateInput(dto.birth_date),
				dni: dto.dni || null,
				phone: this.composePhone(dto.phone, dto.phone_prefix) || null,
				role: dto.role,
				country: dto.country || null,
				state: dto.state,
				city: dto.city,
				address: dto.address,
			},
			select: {
				id: true,
				profile_picture: true,
				name: true,
				lastname: true,
				birth_date: true,
				dni: true,
				phone: true,
				role: true,
				country: true,
				state: true,
				city: true,
				address: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		});

		return this.mapRecruiter(updated);
	}
}
