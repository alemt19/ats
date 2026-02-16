/** @format */

import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
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
		_context: ExecutionContext,
		next: CallHandler,
	): Observable<ApiResponse<T>> {
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
