"use client"

import Image from "next/image"
import Link from "next/link"
import { loginSchema } from "@repo/schema"
import { Eye, EyeOff } from "lucide-react"
import { signIn, signOut } from "../../../../auth-client"
import * as React from "react"
import { type FieldValues, type Path, type Resolver, useForm } from "react-hook-form"
import { z } from "zod"

import { useCompany } from "react/contexts/company-context"
import { getDefaultAdminRoute } from "react/lib/admin-role"
import { toAdminScopedEmail } from "react/lib/auth-email-scope"
import { Button } from "react/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "react/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "react/components/ui/form"
import { Input } from "react/components/ui/input"

type LoginInput = z.infer<typeof loginSchema>
const apiBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

function getLoginErrorMessage(errorMessage?: string | null): string {
	if (errorMessage === "Invalid email or password") {
		return "Correo o contraseña incorrectos"
	}

	if (
		errorMessage === "Email not verified" ||
		errorMessage === "email not verified" ||
		errorMessage?.toLowerCase().includes("not verified")
	) {
		return "Tu correo no está verificado. Revisa tu bandeja de entrada y confirma el enlace de verificación."
	}

	return errorMessage ?? "Credenciales inválidas"
}

function createSafeZodResolver<TFieldValues extends FieldValues>(
	schema: z.ZodType<TFieldValues>
): Resolver<TFieldValues> {
	return async (values) => {
		const result = schema.safeParse(values)

		if (result.success) {
			return {
				values: result.data,
				errors: {},
			}
		}

		const errors = result.error.issues.reduce<Record<string, { type: string; message: string }>>(
			(accumulator, issue) => {
				const key = issue.path.join(".")
				if (!key || accumulator[key]) {
					return accumulator
				}

				accumulator[key] = {
					type: issue.code,
					message: issue.message,
				}
				return accumulator
			},
			{}
		)

		return {
			values: {} as TFieldValues,
			errors: Object.entries(errors).reduce<Record<Path<TFieldValues>, { type: string; message: string }>>(
				(accumulator, [key, value]) => {
					accumulator[key as Path<TFieldValues>] = value
					return accumulator
				},
				{} as Record<Path<TFieldValues>, { type: string; message: string }>
			),
		}
	}
}

export default function AdminLoginClientPage() {
	const { company } = useCompany()
	const [showLoginPassword, setShowLoginPassword] = React.useState(false)
	const [loginError, setLoginError] = React.useState<string | null>(null)

	const companyName = company?.name ?? "TalentoIA"

	const loginForm = useForm<LoginInput>({
		resolver: createSafeZodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const onSubmitLogin = async (values: LoginInput) => {
		setLoginError(null)

		try {
			const adminScopedEmail = toAdminScopedEmail(values.email)

			const response = await signIn.email({
				email: adminScopedEmail,
				password: values.password,
			})

			if (response.error) {
				setLoginError(getLoginErrorMessage(response.error.message))
				return
			}

			document.cookie = "ats_scope=admin; Path=/; SameSite=Lax"

			const adminAccessResponse = await fetch(`${apiBaseUrl}/api/auth/access/admin`, {
				method: "GET",
				credentials: "include",
			})

			if (!adminAccessResponse.ok) {
				document.cookie = "ats_scope=; Path=/; Max-Age=0; SameSite=Lax"
				await signOut()
				setLoginError("Tu cuenta no tiene acceso administrativo")
				return
			}

			const adminAccessPayload = (await adminAccessResponse.json().catch(() => null)) as
				| { adminRole?: string | null; adminProfile?: { role?: string | null } }
				| null

			window.location.href = getDefaultAdminRoute(
				adminAccessPayload?.adminRole ?? adminAccessPayload?.adminProfile?.role ?? null
			)
		} catch {
			setLoginError("No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.")
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-100 p-4 md:p-6">
			<Card className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl md:flex md:flex-row md:items-stretch gap-0">
				<div
					className="relative hidden overflow-hidden md:block md:h-full md:shrink-0 md:self-stretch"
					style={{ minWidth: "395px" }}
				>
					<div aria-hidden className="h-full" style={{ aspectRatio: "1000 / 1500" }} />
					<Image
						src="/images/login.jpg"
						alt="Ilustración de inicio de sesión"
						fill
						sizes="(min-width: 768px) 50vw, 100vw"
						className="object-cover"
						priority
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/30" />

					<div className="absolute inset-x-0 top-0 p-8 text-white">
						<div className="inline-flex max-w-[calc(100%-1rem)] items-center gap-3 rounded-xl border border-white/25 bg-black/45 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
							{company?.logo ? (
								<img
									src={company.logo}
									alt={`${companyName} logo`}
									className="h-8 w-8 rounded-md object-cover shadow-lg"
								/>
							) : (
								<div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-sm font-semibold shadow-lg">
									{companyName.slice(0, 2).toUpperCase()}
								</div>
							)}
							<p className="line-clamp-2 text-xl font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{companyName}</p>
						</div>
					</div>
				</div>

				<div className="min-w-0 flex-1 p-6 sm:p-8">
					<CardHeader className="px-0 pt-0">
						<CardTitle className="text-3xl font-bold">Bienvenido</CardTitle>
						<CardDescription className="text-base mb-5">
							Accede a tu cuenta para administrar la plataforma.
						</CardDescription>
					</CardHeader>

					<CardContent className="px-0 pb-0">
						<Form {...loginForm}>
							<form className="space-y-4" onSubmit={loginForm.handleSubmit(onSubmitLogin)}>
								<FormField
									control={loginForm.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Correo electrónico</FormLabel>
											<FormControl>
												<Input
													type="email"
													placeholder="ejemplo@tuempresa.com"
													autoComplete="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={loginForm.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contraseña</FormLabel>
											<FormControl>
												<div className="relative">
													<Input
														type={showLoginPassword ? "text" : "password"}
														placeholder="Introduce tu contraseña"
														autoComplete="current-password"
														{...field}
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => setShowLoginPassword((previous) => !previous)}
														className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
														aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
													>
														{showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
													</Button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="flex justify-end">
									<Link href="/admin/recover-password" className="text-sm font-medium text-primary hover:underline">
										¿Olvidaste tu contraseña?
									</Link>
								</div>

								{loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}

								<Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
									{loginForm.formState.isSubmitting ? "Ingresando..." : "Ingresar al sistema"}
								</Button>
							</form>
						</Form>
					</CardContent>
				</div>
			</Card>
		</main>
	)
}
