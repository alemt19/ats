export const ADMIN_ROLE_HEAD_OF_RECRUITERS = "head_of_recruiters"
export const ADMIN_ROLE_RECRUITER = "recruiter"

export function normalizeAdminRole(role?: string | null) {
	return role?.trim() ?? ""
}

export function isHeadOfRecruiters(role?: string | null) {
	return normalizeAdminRole(role) === ADMIN_ROLE_HEAD_OF_RECRUITERS
}

export function canEditAdminConfiguration(role?: string | null) {
	return isHeadOfRecruiters(role)
}

export function getDefaultAdminRoute(role?: string | null) {
	return isHeadOfRecruiters(role) ? "/admin/dashboard" : "/admin/ofertas"
}