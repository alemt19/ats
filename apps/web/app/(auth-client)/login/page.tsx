"use client"

import Image from "next/image"
import Link from "next/link"
import { loginSchema } from "@repo/schema"
import { Eye, EyeOff } from "lucide-react"
import { signIn } from "../../../auth-client"
import * as React from "react"
import { type FieldValues, type Path, type Resolver, useForm } from "react-hook-form"
import { z } from "zod"

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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "react/components/ui/tabs"

const registerSchema = z
	.object({
		email: z.string().email("Ingresa un correo válido"),
		password: z
			.string()
			.min(8, "La contraseña debe tener al menos 8 caracteres")
			.max(72, "La contraseña es demasiado larga"),
		confirmPassword: z.string().min(8, "Confirma tu contraseña"),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Las contraseñas no coinciden",
		path: ["confirmPassword"],
	})

type RegisterInput = z.infer<typeof registerSchema>
type LoginInput = z.infer<typeof loginSchema>

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

function PasswordField({
	value,
	label,
	showPassword,
	onToggle,
}: {
	value: "password" | "confirmPassword"
	label: string
	showPassword: boolean
	onToggle: () => void
}) {
	return (
		<FormField
			name={value}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					<FormControl>
						<div className="relative">
							<Input
								type={showPassword ? "text" : "password"}
								placeholder="Introduce tu contraseña"
								autoComplete={value === "password" ? "current-password" : "new-password"}
								{...field}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={onToggle}
								className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
								aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
							>
								{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
							</Button>
						</div>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}

export default function LoginPage() {
	const { company } = useCompany()
	const [activeTab, setActiveTab] = React.useState("login")
	const [showLoginPassword, setShowLoginPassword] = React.useState(false)
	const [showRegisterPassword, setShowRegisterPassword] = React.useState(false)
	const [showRegisterConfirm, setShowRegisterConfirm] = React.useState(false)
	const [loginError, setLoginError] = React.useState<string | null>(null)
	const [registerMessage, setRegisterMessage] = React.useState<string | null>(null)

	const companyName = company?.name ?? "TalentoIA"

	const loginForm = useForm<LoginInput>({
		resolver: createSafeZodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const registerForm = useForm<RegisterInput>({
		resolver: createSafeZodResolver(registerSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	})

	const onSubmitLogin = async (values: LoginInput) => {
		setLoginError(null)
		setRegisterMessage(null)

		try {
			const response = await signIn.email({
				email: values.email,
				password: values.password,
			})

			if (response.error) {
				setLoginError("Credenciales inválidas")
				return
			}

			window.location.href = "/"
		} catch {
			setLoginError("No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.")
		}
	}

	const onSubmitRegister = async (_values: RegisterInput) => {
		setLoginError(null)
		setRegisterMessage("Registro enviado. Próximamente conectaremos este flujo al backend.")
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
						<div className="absolute inset-0 bg-black/40" />

						<div className="absolute inset-x-0 top-0 p-8 text-white">
							<div className="flex items-center gap-3">
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
								<p className="text-xl font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">{companyName}</p>
							</div>
						</div>
				</div>

				<div className="min-w-0 flex-1 p-6 sm:p-8">
					<CardHeader className="px-0 pt-0">
						<CardTitle className="text-3xl font-bold">Bienvenido</CardTitle>
						<CardDescription className="text-base mb-5">
							Accede a tu cuenta para empezar a encontrar el talento ideal.
						</CardDescription>
					</CardHeader>

					<CardContent className="px-0 pb-0">
						<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
							<TabsList className="mb-6 grid h-11 w-full grid-cols-2">
								<TabsTrigger value="login">Iniciar sesión</TabsTrigger>
								<TabsTrigger value="register">Registrarse</TabsTrigger>
							</TabsList>

							<TabsContent value="login" className="mt-0">
								<Form {...loginForm}>
									<form className="space-y-4" onSubmit={loginForm.handleSubmit(onSubmitLogin)}>
										<FormField
											control={loginForm.control}
											name="email"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Correo electrónico corporativo</FormLabel>
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
																onClick={() => setShowLoginPassword((prev) => !prev)}
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
											<Link href="/recover-password" className="text-sm font-medium text-primary hover:underline">
												¿Olvidaste tu contraseña?
											</Link>
										</div>

										{loginError ? <p className="text-sm text-destructive">{loginError}</p> : null}

										<Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
											{loginForm.formState.isSubmitting ? "Ingresando..." : "Ingresar al sistema"}
										</Button>
									</form>
								</Form>
							</TabsContent>

							<TabsContent value="register" className="mt-0">
								<Form {...registerForm}>
									<form className="space-y-4" onSubmit={registerForm.handleSubmit(onSubmitRegister)}>
										<FormField
											control={registerForm.control}
											name="email"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Correo electrónico corporativo</FormLabel>
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

										<PasswordField
											value="password"
											label="Contraseña"
											showPassword={showRegisterPassword}
											onToggle={() => setShowRegisterPassword((prev) => !prev)}
										/>

										<PasswordField
											value="confirmPassword"
											label="Confirmar contraseña"
											showPassword={showRegisterConfirm}
											onToggle={() => setShowRegisterConfirm((prev) => !prev)}
										/>

										{registerMessage ? <p className="text-sm text-primary">{registerMessage}</p> : null}

										<Button
											type="submit"
											className="w-full"
											disabled={registerForm.formState.isSubmitting}
										>
											{registerForm.formState.isSubmitting ? "Registrando..." : "Crear cuenta"}
										</Button>
									</form>
								</Form>
							</TabsContent>
						</Tabs>
					</CardContent>
				</div>
			</Card>
		</main>
	)
}
