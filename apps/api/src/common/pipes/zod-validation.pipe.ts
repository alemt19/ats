/** @format */

import {
	PipeTransform,
	Injectable,
	ArgumentMetadata,
	BadRequestException,
} from '@nestjs/common';
import { ZodType, ZodError } from 'zod';
import { ZodValidationException } from 'nestjs-zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	constructor(private schema: ZodType<any>) {}

	transform(value: any, metadata: ArgumentMetadata) {
		// Only validate the body parameter
		if (metadata.type !== 'body') {
			return value;
		}

		try {
			const parsedValue = this.schema.parse(value);
			return parsedValue;
		} catch (error: any) {
			if (error instanceof ZodError) {
				throw new ZodValidationException(error);
			}
			throw new BadRequestException('Validation failed');
		}
	}
}
