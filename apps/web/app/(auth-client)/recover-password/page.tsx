"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { toast } from "sonner"

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

export default function RecoverPasswordPage() {
	const router = useRouter()
	const { company } = useCompany()

	const [email, setEmail] = React.useState("")
	const [error, setError] = React.useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const companyName = company?.name ?? "TalentoIA"

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)

		const parsed = recoverSchema.safeParse({ email })

		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Correo inválido")
			return
		}

		setIsSubmitting(true)

		try {
			const response = await fetch("https://dummyjson.com/posts/add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: "password-recovery-request",
					body: `Recover password for ${parsed.data.email}`,
					userId: 1,
				}),
			})

			if (!response.ok) {
				throw new Error("No se pudo procesar la solicitud")
			}

			toast.success("Te enviamos un código de verificación al correo")
			const nextUrl = `/confirm-password?email=${encodeURIComponent(parsed.data.email)}`
			router.push(nextUrl)
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
						Ingresa el correo de tu cuenta y te enviaremos un código OTP para restablecerla.
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

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Enviando..." : "Enviar código"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
