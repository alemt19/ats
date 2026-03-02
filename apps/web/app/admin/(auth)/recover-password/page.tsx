"use client"

"use client"
import * as React from "react"
import { z } from "zod"
import { toast } from "sonner"

import { toAdminScopedEmail } from "react/lib/auth-email-scope"
import { useCompany } from "react/contexts/company-context"
import { Button } from "react/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "react/components/ui/card"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"

const recoverSchema = z.object({
	email: z.string().email("Ingresa un correo válido"),
})

const authBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

export default function AdminRecoverPasswordPage() {
	const { company } = useCompany()

	const [email, setEmail] = React.useState("")
	const [error, setError] = React.useState<string | null>(null)
	const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const companyName = company?.name ?? "TalentoIA"

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		setSuccessMessage(null)

		const parsed = recoverSchema.safeParse({ email })

		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Correo inválido")
			return
		}

		setIsSubmitting(true)

		try {
			const adminScopedEmail = toAdminScopedEmail(parsed.data.email)

			const response = await fetch(`${authBaseUrl}/api/auth/request-password-reset`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					email: adminScopedEmail,
				}),
			})

			if (!response.ok) {
				throw new Error("No se pudo procesar la solicitud")
			}

			toast.success("Te enviamos un enlace para restablecer tu contraseña")
			setSuccessMessage(
				"Revisa tu correo y abre el enlace de recuperación para definir una nueva contraseña."
			)
		} catch {
			setError("No se pudo enviar el correo de recuperación. Intenta de nuevo.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-6">
			<Card className="w-full max-w-md shadow-2xl">
				<CardHeader className="space-y-3 text-center">
					<p className="text-sm font-medium text-muted-foreground">{companyName}</p>
					<CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
					<CardDescription>
						Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecerla.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form className="space-y-5" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label htmlFor="recovery-email">Correo electrónico</Label>
							<Input
								id="recovery-email"
								type="email"
								value={email}
								autoComplete="email"
								placeholder="ejemplo@tuempresa.com"
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>

						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						{successMessage ? <p className="text-sm text-primary">{successMessage}</p> : null}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Enviando..." : "Enviar código"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
