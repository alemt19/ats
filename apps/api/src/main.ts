/** @format */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ZodExceptionFilter, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: 'http://localhost:3000',
	});

	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalFilters(new ZodExceptionFilter());
	app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

	await app.listen(4000);
}

bootstrap();
