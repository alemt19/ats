/** @format */

import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

export interface ApiResponse<T> {
	success: boolean;
	data: T;
	timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
	T,
	ApiResponse<T>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<ApiResponse<T>> {
		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const response = http.getResponse<Response>();

		// Skip wrapping for Better-Auth endpoints or when response is already sent
		if (request?.url?.startsWith('/api/auth') || response?.headersSent) {
			return next.handle() as Observable<any>;
		}

		return next.handle().pipe(
			map((data) => {
				if (data && typeof data === 'object' && 'data' in data) {
					return {
						success: true,
						timestamp: new Date().toISOString(),
						...data,
					} as ApiResponse<T>;
				}

				return {
					success: true,
					timestamp: new Date().toISOString(),
					data: data as T,
				} as ApiResponse<T>;
			}),
		);
	}
}
