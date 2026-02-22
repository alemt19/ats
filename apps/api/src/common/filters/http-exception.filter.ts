/** @format */

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { BusinessException } from '../exceptions/business.exception';

type ValidationIssue = {
	field: string;
	message: string;
};

const normalizeValidationIssues = (messages: unknown[]): ValidationIssue[] => {
	return messages
		.map((message) => {
			if (typeof message === 'string') {
				const quotedMatch = message.match(/['"`]+([^'"`]+)['"`]+/);
				const field =
					quotedMatch?.[1] ?? message.split(' ')[0] ?? 'unknown';
				return { field, message };
			}

			if (message && typeof message === 'object') {
				const issue = message as {
					field?: string;
					path?: Array<string | number>;
					message?: string;
				};

				const field =
					issue.field ??
					(issue.path?.length ? issue.path.join('.') : 'root');
				const detail = issue.message;

				if (field && detail) {
					return { field, message: detail };
				}
			}

			return null;
		})
		.filter((issue): issue is ValidationIssue => issue !== null);
};

const normalizeZodIssues = (
	exception: ZodValidationException,
): ValidationIssue[] => {
	const zodError =
		(
			exception as unknown as {
				getZodError?: () => {
					issues: Array<{
						path: Array<string | number>;
						message: string;
					}>;
					errors: Array<{
						path: Array<string | number>;
						message: string;
					}>;
				};
			}
		).getZodError?.() ??
		(
			exception as unknown as {
				issues?: Array<{
					path: Array<string | number>;
					message: string;
				}>;
				errors?: Array<{
					path: Array<string | number>;
					message: string;
				}>;
			}
		).errors;

	const issues = Array.isArray(zodError)
		? zodError
		: ((zodError as any)?.issues ?? (zodError as any)?.errors);
	if (issues && Array.isArray(issues)) {
		return issues.map((issue) => ({
			field: issue.path.length ? issue.path.join('.') : 'root',
			message: issue.message,
		}));
	}

	const response = exception.getResponse() as
		| { message?: unknown[]; errors?: unknown[] }
		| string;
	if (typeof response === 'object') {
		if (response?.message && Array.isArray(response.message)) {
			return normalizeValidationIssues(response.message);
		}
		if (response?.errors && Array.isArray(response.errors)) {
			return normalizeValidationIssues(response.errors);
		}
	}

	return [{ field: 'root', message: exception.message }];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message: string | string[] | ValidationIssue[] =
			'Internal server error';
		let errorCode: string | undefined;

		if (exception instanceof BusinessException) {
			status = exception.getStatus();
			message = exception.message;
			errorCode = exception.errorCode;
		} else if (exception instanceof ZodValidationException) {
			status = HttpStatus.BAD_REQUEST;
			message = normalizeZodIssues(exception);
		} else if (exception instanceof HttpException) {
			status = exception.getStatus();
			const exceptionResponse = exception.getResponse();

			if (typeof exceptionResponse === 'string') {
				message = exceptionResponse;
			} else if (
				typeof exceptionResponse === 'object' &&
				exceptionResponse !== null
			) {
				const responseObj = exceptionResponse as {
					message?: string | string[];
					errors?: any[];
				};

				if (Array.isArray(responseObj.errors)) {
					message = normalizeValidationIssues(responseObj.errors);
				} else if (Array.isArray(responseObj.message)) {
					message = normalizeValidationIssues(responseObj.message);
				} else {
					message = responseObj.message ?? 'Unknown error';
				}
			}
		} else {
			const errorMsg =
				exception instanceof Error ? exception.message : 'Unknown';
			const errorStack =
				exception instanceof Error ? exception.stack : undefined;

			// Log unhandled exceptions
			this.logger.error(
				`Unhandled exception: ${errorMsg}`,
				errorStack,
				`Request: ${request.method} ${request.url}`,
			);

			// Check for Prisma specific errors
			if (exception && typeof exception === 'object') {
				const error = exception as any;

				// Standard Prisma error code handling
				if (error.code === 'P2002') {
					status = HttpStatus.CONFLICT;
					const target = error.meta?.target as string[];
					message = `Duplicate field value: ${
						target ? target.join(', ') : 'unknown'
					}`;
				} else if (error.code) {
					// Other Prisma errors with codes
					message = `Database error: ${error.code} - ${errorMsg}`;
				} else if (error.name?.startsWith('Prisma')) {
					// Prisma errors without codes (like initialization or connection)
					message = `Database error: ${error.name} - ${errorMsg}`;
				} else {
					// Fallback for non-production
					message = errorMsg || 'Internal server error';
				}
			} else {
				message = 'Internal server error';
			}

			// In development, we want to see the error message in the response regardless of type
			if (process.env.NODE_ENV !== 'production') {
				if (
					typeof message === 'string' &&
					!message.includes(errorMsg)
				) {
					message = `${message} (${errorMsg})`;
				}
			}
		}

		response.status(status).json({
			success: false,
			data: null,
			error: {
				code: status,
				...(errorCode ? { errorCode } : {}),
				message,
				path: request.url,
			},
			timestamp: new Date().toISOString(),
		});
	}
}
