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

function ReclutadorEmailVerificationForm() {
	const searchParams = useSearchParams()

	const email = searchParams.get("email") ?? ""
	const emailLabel = email ? maskEmail(email) : "el correo del reclutador"

	return (
		<main className="flex min-h-[70vh] items-center justify-center p-4 md:p-6">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-3 text-center">
					<CardTitle className="text-2xl">Verifica el correo del reclutador</CardTitle>
					<CardDescription>
						Enviamos un enlace de verificación a {emailLabel}. El reclutador debe abrirlo para
						activar su acceso.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<div className="space-y-3">
						<Button type="button" className="w-full" asChild>
							<Link href="/admin/reclutadores">Ir al listado de reclutadores</Link>
						</Button>

						<Button type="button" variant="outline" className="w-full" asChild>
							<Link href="/admin/reclutadores/crear">Crear otro reclutador</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</main>
	)
}

export default function ReclutadorEmailVerificationPage() {
	return (
		<React.Suspense fallback={<div className="flex h-screen items-center justify-center">Cargando...</div>}>
			<ReclutadorEmailVerificationForm />
		</React.Suspense>
	)
}
