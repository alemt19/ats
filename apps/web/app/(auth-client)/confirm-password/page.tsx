"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "react/components/ui/input-otp"
import { Input } from "react/components/ui/input"
import { Label } from "react/components/ui/label"

const OTP_LENGTH = 6

const confirmSchema = z
	.object({
		otp: z.string().length(OTP_LENGTH, "El código debe tener 6 dígitos"),
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

function maskEmail(email: string) {
	const [localPart, domain] = email.split("@")

	if (!localPart || !domain) {
		return email
	}

	if (localPart.length <= 2) {
		return `${localPart[0] ?? ""}***@${domain}`
	}

	return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 3))}@${domain}`
}

export default function ConfirmPasswordPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { company } = useCompany()

	const [otpCode, setOtpCode] = React.useState("")
	const [password, setPassword] = React.useState("")
	const [confirmPassword, setConfirmPassword] = React.useState("")
	const [showPassword, setShowPassword] = React.useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
	const [error, setError] = React.useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const email = searchParams.get("email") ?? ""
	const companyName = company?.name ?? "TalentoIA"
	const emailLabel = email ? maskEmail(email) : "tu correo"

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)

		if (!email) {
			setError("No encontramos el correo. Vuelve a solicitar el código.")
			return
		}

		const parsed = confirmSchema.safeParse({
			otp: otpCode,
			password,
			confirmPassword,
		})

		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? "Verifica los datos ingresados")
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
					title: "confirm-password",
					body: `Confirm password for ${email} with otp ${parsed.data.otp}`,
					userId: 1,
				}),
			})

			if (!response.ok) {
				throw new Error("No se pudo actualizar la contraseña")
			}

			toast.success("Contraseña actualizada exitosamente")
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
					<p className="text-sm font-medium text-muted-foreground">{companyName}</p>
					<CardTitle className="text-2xl">Confirmar nueva contraseña</CardTitle>
					<CardDescription>
						Ingresa el código enviado a {emailLabel} y define tu nueva contraseña.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form className="space-y-5" onSubmit={onSubmit}>
						<div className="space-y-2">
							<Label>Código OTP</Label>
							<InputOTP
								maxLength={OTP_LENGTH}
								value={otpCode}
								onChange={(value) => setOtpCode(value)}
								containerClassName="justify-center"
							>
								<InputOTPGroup>
									{Array.from({ length: OTP_LENGTH }).map((_, index) => (
										<InputOTPSlot key={index} index={index} />
									))}
								</InputOTPGroup>
							</InputOTP>
						</div>

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
								>
									{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
								</Button>
							</div>
						</div>

						{error ? <p className="text-sm text-destructive">{error}</p> : null}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
						</Button>

						{/* <div className="text-center text-sm text-muted-foreground">
							¿No tienes código?{" "}
							<Link href="/recover-password" className="font-medium text-primary hover:underline">
								Solicitar otro
							</Link>
						</div> */}
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
