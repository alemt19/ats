"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

import { useCompany } from "react/contexts/company-context"
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

export default function EmailVerificationPage() {
	const searchParams = useSearchParams()
	const { company } = useCompany()
	const [otpCode, setOtpCode] = React.useState("")
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const email = searchParams.get("email") ?? ""
	const emailLabel = email ? maskEmail(email) : "tu correo"
	const companyName = company?.name ?? "TalentoIA"

	const isOtpComplete = otpCode.length === OTP_LENGTH

	async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!isOtpComplete) {
			return
		}

		setIsSubmitting(true)

		try {
			await new Promise((resolve) => setTimeout(resolve, 500))
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-6">
			<Card className="w-full max-w-md shadow-2xl">
				<CardHeader className="space-y-3 text-center">
					<p className="text-sm font-medium text-muted-foreground">{companyName}</p>
					<CardTitle className="text-2xl">Verifica tu correo</CardTitle>
					<CardDescription>
						Ingresa el código de 6 dígitos que enviamos a {emailLabel}.
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
							{isSubmitting ? "Verificando..." : "Verificar cuenta"}
						</Button>

						{/* <div className="text-center text-sm text-muted-foreground">
							¿No recibiste el código?{" "}
							<Link href="#" className="font-medium text-primary hover:underline">
								Reenviar código
							</Link>
						</div> */}
					</form>
				</CardContent>
			</Card>
		</main>
	)
}
