"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

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

const resetSchema = z
	.object({
		password: z
			.string()
			.min(8, "La contraseña debe tener al menos 8 caracteres")
			.max(72, "La contraseña es demasiado larga"),
		confirmPassword: z.string().min(8, "Confirma tu nueva contraseña"),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Las contraseñas no coinciden",
		path: ["confirmPassword"],
	})

const authBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

export default function ResetPasswordPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get("token")

	const [password, setPassword] = React.useState("")
	const [confirmPassword, setConfirmPassword] = React.useState("")
	const [showPassword, setShowPassword] = React.useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)

		if (!token) {
			setError("El enlace de recuperación no es válido o está incompleto.")
			return
		}

		const parsed = resetSchema.safeParse({ password, confirmPassword })

		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Verifica los datos ingresados")
			return
		}

		setIsSubmitting(true)

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/reset-password`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					token,
					newPassword: parsed.data.password,
				}),
			})

			if (!response.ok) {
				setError("El enlace expiró o no es válido. Solicita una nueva recuperación.")
				return
			}

			toast.success("Contraseña actualizada correctamente")
			router.push("/login")
		} catch {
			setError("No se pudo actualizar tu contraseña. Intenta nuevamente.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-6">
			<Card className="w-full max-w-md shadow-2xl">
				<CardHeader className="space-y-3 text-center">
					<CardTitle className="text-2xl">Restablecer contraseña</CardTitle>
					<CardDescription>
						Define tu nueva contraseña para recuperar el acceso a tu cuenta.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form className="space-y-5" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label htmlFor="new-password">Nueva contraseña</Label>
							<div className="relative">
								<Input
									id="new-password"
									type={showPassword ? "text" : "password"}
									value={password}
									autoComplete="new-password"
									placeholder="Introduce tu nueva contraseña"
									onChange={(event) => setPassword(event.target.value)}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
									onClick={() => setShowPassword((previous) => !previous)}
									aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
								>
									{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
							<div className="relative">
								<Input
									id="confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									autoComplete="new-password"
									placeholder="Confirma tu nueva contraseña"
									onChange={(event) => setConfirmPassword(event.target.value)}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
									onClick={() => setShowConfirmPassword((previous) => !previous)}
									aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
								>
									{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
								</Button>
							</div>
						</div>

						{error ? <p className="text-sm text-destructive">{error}</p> : null}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
						</Button>

						<Button type="button" variant="outline" className="w-full" asChild>
							<Link href="/login">Volver a iniciar sesión</Link>
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
