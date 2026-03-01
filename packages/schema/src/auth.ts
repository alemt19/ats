/** @format */

import { z } from 'zod';

export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(72),
});

export type LoginData = z.infer<typeof loginSchema>;

// ─── Better-Auth endpoint schemas ────────────────────────────────────────────

export const SignUpEmailSchema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(8).max(72),
	image: z.string().url().optional(),
	callbackURL: z.string().url().optional(),
});

export const SignInEmailSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(72),
	callbackURL: z.string().url().optional(),
	rememberMe: z.boolean().optional(),
});

export const ForgotPasswordSchema = z.object({
	email: z.string().email(),
	callbackURL: z.string().url().optional(),
});

export const ResetPasswordSchema = z.object({
	token: z.string().min(1),
	newPassword: z.string().min(8).max(72),
});

export type SignUpEmailData = z.infer<typeof SignUpEmailSchema>;
export type SignInEmailData = z.infer<typeof SignInEmailSchema>;
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
