"use client"

import { useEffect, useMemo, useState } from "react"

import { useSession } from "../../auth-client"

type ScopedSession = "admin" | "candidate"

type CandidateProfile = {
	id: number
	name: string | null
	lastname: string | null
	profile_picture: string | null
}

type AdminProfile = {
	id: number
	name: string | null
	lastname: string | null
	email: string | null
	profile_picture: string | null
}

type SegmentedUser = {
	id?: string
	name?: string | null
	lastname?: string | null
	email?: string | null
	image?: string | null
}

type SegmentedSessionResult<TProfile> = {
	user: SegmentedUser | null
	profile: TProfile | null
	isPending: boolean
	isAuthenticated: boolean
	isScopedSession: boolean
}

const apiBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

function readScopeCookie(): ScopedSession | null {
	if (typeof document === "undefined") {
		return null
	}

	const match = document.cookie.match(/(?:^|;\s*)ats_scope=(admin|candidate)(?:;|$)/)
	if (!match) {
		return null
	}

	return match[1] as ScopedSession
}

function useScopedSession<TProfile extends CandidateProfile | AdminProfile>(scope: ScopedSession) {
	const { data: session, isPending } = useSession()
	const [scopeCookie, setScopeCookie] = useState<ScopedSession | null>(null)
	const [profile, setProfile] = useState<TProfile | null>(null)
	const [isProfilePending, setIsProfilePending] = useState(false)

	useEffect(() => {
		const updateScope = () => {
			setScopeCookie(readScopeCookie())
		}

		updateScope()
		window.addEventListener("focus", updateScope)

		return () => {
			window.removeEventListener("focus", updateScope)
		}
	}, [])

	const isScopedSession = scopeCookie === scope && Boolean(session?.user)

	useEffect(() => {
		let cancelled = false

		if (!isScopedSession) {
			setProfile(null)
			setIsProfilePending(false)
			return
		}

		setIsProfilePending(true)

		void (async () => {
			try {
				const response = await fetch(`${apiBaseUrl}/api/auth/access/${scope}`, {
					method: "GET",
					credentials: "include",
				})

				if (!response.ok || cancelled) {
					if (!cancelled) {
						setProfile(null)
					}
					return
				}

				const data = (await response.json()) as {
					candidateProfile?: TProfile
					adminProfile?: TProfile
				}

				if (cancelled) {
					return
				}

				if (scope === "candidate") {
					setProfile((data.candidateProfile ?? null) as TProfile | null)
					return
				}

				setProfile((data.adminProfile ?? null) as TProfile | null)
			} catch {
				if (!cancelled) {
					setProfile(null)
				}
			} finally {
				if (!cancelled) {
					setIsProfilePending(false)
				}
			}
		})()

		return () => {
			cancelled = true
		}
	}, [isScopedSession, scope, session?.user?.id])

	return {
		session,
		isSessionPending: isPending,
		profile,
		isProfilePending,
		isScopedSession,
	}
}

export function useCandidateSession(): SegmentedSessionResult<CandidateProfile> {
	const { session, isSessionPending, profile, isProfilePending, isScopedSession } =
		useScopedSession<CandidateProfile>("candidate")

	const user = useMemo<SegmentedUser | null>(() => {
		if (!isScopedSession || !session?.user) {
			return null
		}

		const candidateFullName = `${profile?.name ?? ""} ${profile?.lastname ?? ""}`.trim()

		return {
			id: session.user.id,
			name: candidateFullName || session.user.name,
			lastname: profile?.lastname ?? null,
			email: session.user.email,
			image: profile?.profile_picture ?? session.user.image,
		}
	}, [isScopedSession, profile?.lastname, profile?.name, profile?.profile_picture, session?.user])

	return {
		user,
		profile,
		isPending: isSessionPending || (isScopedSession && isProfilePending),
		isAuthenticated: Boolean(user),
		isScopedSession,
	}
}

export function useAdminSession(): SegmentedSessionResult<AdminProfile> {
	const { session, isSessionPending, profile, isProfilePending, isScopedSession } =
		useScopedSession<AdminProfile>("admin")

	const user = useMemo<SegmentedUser | null>(() => {
		if (!isScopedSession || !session?.user) {
			return null
		}

		const adminFullName = `${profile?.name ?? ""} ${profile?.lastname ?? ""}`.trim()

		return {
			id: session.user.id,
			name: adminFullName || session.user.name,
			lastname: profile?.lastname ?? null,
			email: profile?.email ?? session.user.email,
			image: profile?.profile_picture ?? session.user.image,
		}
	}, [isScopedSession, profile?.email, profile?.lastname, profile?.name, profile?.profile_picture, session?.user])

	return {
		user,
		profile,
		isPending: isSessionPending || (isScopedSession && isProfilePending),
		isAuthenticated: Boolean(user),
		isScopedSession,
	}
}
