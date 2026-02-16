/** @format */

import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@repo/schema';

export class LoginDto extends createZodDto(loginSchema) {}
