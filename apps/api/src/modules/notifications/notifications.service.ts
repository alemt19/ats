/** @format */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_CANDIDATE_STALE_APPLICATION_DAYS = 14;
const DEFAULT_ADMIN_STALE_JOB_DAYS = 14;
const DEFAULT_NOTIFICATIONS_LIMIT = 15;
const MAX_NOTIFICATIONS_LIMIT = 50;

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.generateStaleEntityNotifications();
  }

  @Cron(process.env.NOTIFICATIONS_CRON ?? '0 8 * * *')
  async generateScheduledNotifications() {
    await this.generateStaleEntityNotifications();
  }

  private getThresholdDays(envName: string, fallback: number) {
    const rawValue = process.env[envName];
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private subtractDays(date: Date, days: number) {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private async generateStaleApplicationNotifications(now: Date) {
    const staleDays = this.getThresholdDays(
      'CANDIDATE_STALE_APPLICATION_DAYS',
      DEFAULT_CANDIDATE_STALE_APPLICATION_DAYS,
    );
    const cutoffDate = this.subtractDays(now, staleDays);

    const staleApplications = await this.prisma.applications.findMany({
      where: {
        status: 'applied',
        created_at: { lte: cutoffDate },
        candidates: {
          user_id: {
            not: null,
          },
        },
      },
      select: {
        id: true,
        created_at: true,
        candidates: {
          select: {
            user_id: true,
          },
        },
        jobs: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const payload = staleApplications
      .map((application) => {
        const userId = application.candidates?.user_id;

        if (!userId) {
          return null;
        }

        const title = 'Tu postulacion sigue sin cambios';
        const jobTitle = application.jobs?.title?.trim() || 'la oferta seleccionada';

        return {
          user_id: userId,
          type: 'stale_application',
          entity_type: 'application',
          entity_id: application.id,
          title,
          message: `Tu postulacion a ${jobTitle} sigue en estado Postulado desde hace ${staleDays} dias. Actualiza tu perfil para mejorar tus oportunidades.`,
          metadata: {
            stale_days: staleDays,
            job_id: application.jobs?.id ?? null,
            job_title: application.jobs?.title ?? null,
            application_created_at: application.created_at?.toISOString() ?? null,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (payload.length === 0) {
      return;
    }

    await this.prisma.notifications.createMany({
      data: payload,
      skipDuplicates: true,
    });
  }

  private async generateStaleJobNotifications(now: Date) {
    const staleDays = this.getThresholdDays('ADMIN_STALE_JOB_DAYS', DEFAULT_ADMIN_STALE_JOB_DAYS);
    const cutoffDate = this.subtractDays(now, staleDays);

    const staleJobs = await this.prisma.jobs.findMany({
      where: {
        status: 'published',
        created_at: { lte: cutoffDate },
        applications: {
          none: {},
        },
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        companies: {
          select: {
            user_admin: {
              where: {
                user_id: {
                  not: null,
                },
                role: {
                  in: ['recruiter', 'head_of_recruiters'],
                },
              },
              select: {
                user_id: true,
              },
            },
          },
        },
      },
    });

    const payload = staleJobs.flatMap((job) => {
      const title = 'Oferta publicada sin postulaciones';
      const offerTitle = job.title?.trim() || 'la oferta publicada';

      return (job.companies?.user_admin ?? [])
        .map((adminUser) => {
          if (!adminUser.user_id) {
            return null;
          }

          return {
            user_id: adminUser.user_id,
            type: 'stale_job_without_candidates',
            entity_type: 'job',
            entity_id: job.id,
            title,
            message: `La oferta ${offerTitle} lleva al menos ${staleDays} dias publicada y aun no tiene postulaciones.`,
            metadata: {
              stale_days: staleDays,
              job_title: job.title,
              job_created_at: job.created_at?.toISOString() ?? null,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    });

    if (payload.length === 0) {
      return;
    }

    await this.prisma.notifications.createMany({
      data: payload,
      skipDuplicates: true,
    });
  }

  async generateStaleEntityNotifications() {
    const now = new Date();

    try {
      await this.generateStaleApplicationNotifications(now);
      await this.generateStaleJobNotifications(now);
    } catch (error) {
      this.logger.error('No se pudieron generar notificaciones automaticas', error as Error);
    }
  }

  async findMyNotifications(userId: string, requestedLimit?: number) {
    const normalizedLimit =
      Number.isFinite(requestedLimit) && requestedLimit
        ? Math.max(1, Math.min(Math.floor(requestedLimit), MAX_NOTIFICATIONS_LIMIT))
        : DEFAULT_NOTIFICATIONS_LIMIT;

    const [items, unreadCount] = await Promise.all([
      this.prisma.notifications.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: normalizedLimit,
        select: {
          id: true,
          type: true,
          entity_type: true,
          entity_id: true,
          title: true,
          message: true,
          read_at: true,
          created_at: true,
        },
      }),
      this.prisma.notifications.count({
        where: {
          user_id: userId,
          read_at: null,
        },
      }),
    ]);

    return {
      unreadCount,
      items: items.map((item) => ({
        ...item,
        created_at: item.created_at.toISOString(),
        read_at: item.read_at?.toISOString() ?? null,
      })),
    };
  }

  async markAsRead(userId: string, id: number) {
    const updated = await this.prisma.notifications.updateMany({
      where: {
        id,
        user_id: userId,
      },
      data: {
        read_at: new Date(),
      },
    });

    return {
      success: updated.count > 0,
    };
  }
}
