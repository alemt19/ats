"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

import { Button } from "react/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "react/components/ui/card"

type VerificationStatus = "loading" | "success" | "error"

const authBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

export default function VerifyEmailPage() {
	const searchParams = useSearchParams()
	const token = searchParams.get("token")

	const [status, setStatus] = React.useState<VerificationStatus>("loading")
	const [message, setMessage] = React.useState("Validando tu enlace de verificación...")

	React.useEffect(() => {
		let isMounted = true

		async function verifyEmail() {
			if (!token) {
				if (!isMounted) {
					return
				}
				setStatus("error")
				setMessage("El enlace no contiene un token válido.")
				return
			}

			const endpoint = `${authBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`

			try {
				const response = await fetch(endpoint, {
					method: "GET",
					credentials: "include",
				})

				if (!isMounted) {
					return
				}

				if (response.ok) {
					setStatus("success")
					setMessage("Tu correo fue verificado correctamente. Ya puedes iniciar sesión.")
					return
				}

				setStatus("error")
				setMessage("El enlace expiró o ya fue utilizado. Solicita una nueva verificación.")
			} catch {
				if (!isMounted) {
					return
				}
				setStatus("error")
				setMessage("No se pudo verificar el correo en este momento. Inténtalo nuevamente.")
			}
		}

		void verifyEmail()

		return () => {
			isMounted = false
		}
	}, [token])

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-6">
			<Card className="w-full max-w-md shadow-2xl">
				<CardHeader className="space-y-3 text-center">
					<CardTitle className="text-2xl">Verificación de correo</CardTitle>
					<CardDescription>{message}</CardDescription>
				</CardHeader>
				<CardContent>
					{status === "loading" ? (
						<Button type="button" className="w-full" disabled>
							Verificando...
						</Button>
					) : (
						<Button type="button" className="w-full" asChild>
							<Link href="/login">
								{status === "success" ? "Ir a iniciar sesión" : "Volver a iniciar sesión"}
							</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		</main>
	)
}
