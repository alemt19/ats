/** @format */

import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

type LockStatus = {
	locked: boolean;
	remainingSeconds: number;
};

type FailureResult = {
	locked: boolean;
	remainingAttempts: number;
	remainingSeconds: number;
};

@Injectable()
export class LoginSoftLockService {
	private readonly logger = new Logger(LoginSoftLockService.name);
	private readonly maxAttempts = this.readPositiveInt(
		process.env.AUTH_LOGIN_MAX_ATTEMPTS,
		5,
	);
	private readonly attemptWindowSeconds = this.readPositiveInt(
		process.env.AUTH_LOGIN_ATTEMPT_WINDOW_SECONDS,
		10 * 60,
	);
	private readonly lockSeconds = this.readPositiveInt(
		process.env.AUTH_LOGIN_LOCK_SECONDS,
		15 * 60,
	);
	private readonly redis = this.buildRedisClient();

	private readPositiveInt(value: string | undefined, fallback: number): number {
		if (!value) {
			return fallback;
		}

		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			return fallback;
		}

		return parsed;
	}

	private buildRedisClient(): Redis | null {
		const redisUrl = process.env.REDIS_URL?.trim();
		if (!redisUrl) {
			this.logger.warn(
				'REDIS_URL is not configured. Login soft lock is disabled.',
			);
			return null;
		}

		try {
			return new Redis(redisUrl, {
				lazyConnect: true,
				maxRetriesPerRequest: 1,
				enableOfflineQueue: false,
			});
		} catch (error) {
			this.logger.error('Unable to initialize Redis client for login soft lock', error);
			return null;
		}
	}

	private async ensureConnected(): Promise<boolean> {
		if (!this.redis) {
			return false;
		}

		if (this.redis.status === 'ready' || this.redis.status === 'connect') {
			return true;
		}

		try {
			await this.redis.connect();
			return true;
		} catch (error) {
			this.logger.error('Redis connection failed for login soft lock', error);
			return false;
		}
	}

	private normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}

	private attemptsKey(email: string): string {
		return `auth:signin:attempts:${email}`;
	}

	private lockKey(email: string): string {
		return `auth:signin:lock:${email}`;
	}

	async getLockStatus(email: string): Promise<LockStatus> {
		const normalizedEmail = this.normalizeEmail(email);
		const canUseRedis = await this.ensureConnected();

		if (!canUseRedis || !this.redis) {
			return { locked: false, remainingSeconds: 0 };
		}

		try {
			const ttl = await this.redis.ttl(this.lockKey(normalizedEmail));
			if (ttl > 0) {
				return { locked: true, remainingSeconds: ttl };
			}

			return { locked: false, remainingSeconds: 0 };
		} catch (error) {
			this.logger.error('Failed to read lock status from Redis', error);
			return { locked: false, remainingSeconds: 0 };
		}
	}

	async clearFailures(email: string): Promise<void> {
		const normalizedEmail = this.normalizeEmail(email);
		const canUseRedis = await this.ensureConnected();

		if (!canUseRedis || !this.redis) {
			return;
		}

		try {
			await this.redis.del(
				this.attemptsKey(normalizedEmail),
				this.lockKey(normalizedEmail),
			);
		} catch (error) {
			this.logger.error('Failed to clear login failure counters', error);
		}
	}

	async registerFailure(email: string): Promise<FailureResult> {
		const normalizedEmail = this.normalizeEmail(email);
		const canUseRedis = await this.ensureConnected();

		if (!canUseRedis || !this.redis) {
			return {
				locked: false,
				remainingAttempts: this.maxAttempts - 1,
				remainingSeconds: 0,
			};
		}

		const attemptsKey = this.attemptsKey(normalizedEmail);
		const lockKey = this.lockKey(normalizedEmail);

		try {
			const currentAttempts = await this.redis.incr(attemptsKey);

			if (currentAttempts === 1) {
				await this.redis.expire(attemptsKey, this.attemptWindowSeconds);
			}

			const remainingAttempts = Math.max(0, this.maxAttempts - currentAttempts);

			if (currentAttempts >= this.maxAttempts) {
				await this.redis.multi().set(lockKey, '1', 'EX', this.lockSeconds).del(attemptsKey).exec();

				return {
					locked: true,
					remainingAttempts: 0,
					remainingSeconds: this.lockSeconds,
				};
			}

			return {
				locked: false,
				remainingAttempts,
				remainingSeconds: 0,
			};
		} catch (error) {
			this.logger.error('Failed to register login failure', error);
			return {
				locked: false,
				remainingAttempts: this.maxAttempts - 1,
				remainingSeconds: 0,
			};
		}
	}
}