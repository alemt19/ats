/** @format */

import { createZodDto } from 'nestjs-zod';
import {
	SignUpEmailSchema,
	SignInEmailSchema,
	ForgotPasswordSchema,
	ResetPasswordSchema,
} from '@repo/schema';

/**
 * DTOs for better-auth endpoints.
 * Note: These are used only as Swagger/type contracts.
 * The actual runtime validation is handled by better-auth internally.
 */
export class SignUpEmailDto extends createZodDto(SignUpEmailSchema) {}
export class SignInEmailDto extends createZodDto(SignInEmailSchema) {}
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
