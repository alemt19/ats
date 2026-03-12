export const ADMIN_ROLE_HEAD_OF_RECRUITERS = 'head_of_recruiters';
export const ADMIN_ROLE_RECRUITER = 'recruiter';

export const ADMIN_ALLOWED_ROLES = [
	ADMIN_ROLE_HEAD_OF_RECRUITERS,
	ADMIN_ROLE_RECRUITER,
] as const;

export type AdminRole = (typeof ADMIN_ALLOWED_ROLES)[number];