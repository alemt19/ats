/** @format */

import { HttpException, HttpStatus } from '@nestjs/common';

export enum BusinessErrorCodes {
	LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
	INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
	DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
}

export class BusinessException extends HttpException {
	readonly errorCode: string;

	constructor(
		errorCode: string,
		message: string,
		status: number = HttpStatus.BAD_REQUEST,
	) {
		super(message, status);
		this.errorCode = errorCode;
	}
}
