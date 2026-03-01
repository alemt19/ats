/** @format */

import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
	return this.toString();
};

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix('api');

	app.enableCors({
		origin: 'http://localhost:3000',
	});

	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalInterceptors(new ResponseInterceptor());
	app.useGlobalFilters(new HttpExceptionFilter());

		const config = new DocumentBuilder()
			.setTitle('ATS API')
			.setDescription('ATS service documentation')
			.setVersion('1.0.0')
			.addBearerAuth()
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api/docs', app, document);

	await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
