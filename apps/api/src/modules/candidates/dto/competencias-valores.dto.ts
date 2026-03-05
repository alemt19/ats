/** @format */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CandidateCompetenciasValoresSchema = z.object({
	behavioral_ans_1: z.string().trim().optional().default(''),
	behavioral_ans_2: z.string().trim().optional().default(''),
	technical_skills: z.string().trim().optional().default('[]'),
	soft_skills: z.string().trim().optional().default('[]'),
	values: z.string().trim().optional().default('[]'),
	cv_existing_url: z.string().trim().optional(),
});

export class UpdateMyCompetenciasValoresDto extends createZodDto(
	CandidateCompetenciasValoresSchema,
) {}
