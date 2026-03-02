const ADMIN_EMAIL_LOCAL_SUFFIX = "+ats-admin"
const LEGACY_ADMIN_EMAIL_PREFIX = "admin::"

function splitEmail(email: string) {
	const atIndex = email.lastIndexOf("@")
	if (atIndex <= 0 || atIndex >= email.length - 1) {
		return null
	}

	return {
		local: email.slice(0, atIndex),
		domain: email.slice(atIndex + 1),
	}
}

export function toAdminScopedEmail(email: string): string {
	const publicEmail = toPublicEmail(email).toLowerCase()
	const parts = splitEmail(publicEmail)

	if (!parts) {
		return publicEmail
	}

	if (parts.local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)) {
		return `${parts.local}@${parts.domain}`
	}

	return `${parts.local}${ADMIN_EMAIL_LOCAL_SUFFIX}@${parts.domain}`
}

export function isAdminScopedEmail(email: string): boolean {
	if (email.startsWith(LEGACY_ADMIN_EMAIL_PREFIX)) {
		return true
	}

	const parts = splitEmail(email)
	if (!parts) {
		return false
	}

	return parts.local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)
}

export function toPublicEmail(email: string): string {
	if (email.startsWith(LEGACY_ADMIN_EMAIL_PREFIX)) {
		return email.slice(LEGACY_ADMIN_EMAIL_PREFIX.length)
	}

	const parts = splitEmail(email)
	if (!parts) {
		return email
	}

	if (!parts.local.endsWith(ADMIN_EMAIL_LOCAL_SUFFIX)) {
		return email
	}

	const baseLocal = parts.local.slice(0, -ADMIN_EMAIL_LOCAL_SUFFIX.length)
	return `${baseLocal}@${parts.domain}`
}
