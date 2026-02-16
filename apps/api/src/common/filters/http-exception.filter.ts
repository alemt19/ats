/** @format */

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
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
				const { field, message: detail } = message as {
					field?: string;
					message?: string;
				};
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
					errors: Array<{
						path: Array<string | number>;
						message: string;
					}>;
				};
			}
		).getZodError?.() ??
		(
			exception as unknown as {
				errors?: Array<{
					path: Array<string | number>;
					message: string;
				}>;
			}
		).errors;

	const issues = Array.isArray(zodError) ? zodError : zodError?.errors;
	if (issues) {
		return issues.map((issue) => ({
			field: issue.path.length ? issue.path.join('.') : 'root',
			message: issue.message,
		}));
	}

	const response = exception.getResponse() as
		| { message?: unknown[] }
		| string;
	if (
		typeof response === 'object' &&
		response?.message &&
		Array.isArray(response.message)
	) {
		return normalizeValidationIssues(response.message);
	}

	return [{ field: 'root', message: exception.message }];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
				exceptionResponse !== null &&
				'message' in exceptionResponse
			) {
				const extractedMessage = (
					exceptionResponse as { message: string | string[] }
				).message;
				if (Array.isArray(extractedMessage)) {
					message = normalizeValidationIssues(extractedMessage);
				} else {
					message = extractedMessage;
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
