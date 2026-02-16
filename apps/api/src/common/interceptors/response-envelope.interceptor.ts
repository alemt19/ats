/** @format */

import { randomUUID } from 'node:crypto';
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

interface ResponseEnvelope<T> {
	data: T;
	meta: {
		requestId: string;
		timestamp: string;
	};
	errors: null;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor<
	unknown,
	ResponseEnvelope<unknown>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<ResponseEnvelope<unknown>> {
		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const response = http.getResponse<Response>();
		const requestId =
			(request.headers as Record<string, string | undefined>)[
				'x-request-id'
			] ?? randomUUID();

		response.setHeader('x-request-id', requestId);

		return next.handle().pipe(
			map((data) => ({
				data,
				meta: {
					requestId,
					timestamp: new Date().toISOString(),
				},
				errors: null,
			})),
		);
	}
}
