"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "react/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "react/components/ui/card"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "react/components/ui/input-otp"

const OTP_LENGTH = 6

function maskEmail(email: string) {
	const [localPart, domain] = email.split("@")

	if (!localPart || !domain) {
		return email
	}

	if (localPart.length <= 2) {
		return `${localPart[0] ?? ""}***@${domain}`
	}

	const start = localPart.slice(0, 2)
	return `${start}${"*".repeat(Math.max(localPart.length - 2, 3))}@${domain}`
}

export default function ReclutadorEmailVerificationPage() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [otpCode, setOtpCode] = React.useState("")
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const email = searchParams.get("email") ?? ""
	const emailLabel = email ? maskEmail(email) : "el correo del reclutador"

	const isOtpComplete = otpCode.length === OTP_LENGTH

	async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!isOtpComplete) {
			return
		}

		setIsSubmitting(true)

		try {
			await new Promise((resolve) => setTimeout(resolve, 500))
			toast.success("Correo verificado correctamente")
			router.push("/admin/reclutadores")
			router.refresh()
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="flex min-h-[70vh] items-center justify-center p-4 md:p-6">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-3 text-center">
					<CardTitle className="text-2xl">Verifica el correo del reclutador</CardTitle>
					<CardDescription>
						Ingresa el código OTP de 6 dígitos enviado a {emailLabel}.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form className="space-y-6" onSubmit={handleVerify}>
						<div className="flex justify-center">
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

						<Button type="submit" className="w-full" disabled={!isOtpComplete || isSubmitting}>
							{isSubmitting ? "Verificando..." : "Verificar correo"}
						</Button>

						<Button type="button" variant="outline" className="w-full" asChild>
							<Link href="/admin/reclutadores">Volver al listado</Link>
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	)
}