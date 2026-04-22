"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, type FieldPath } from "react-hook-form"
import { toast } from "sonner"

import type {
	AdminCompanyConfigInitialData,
	CulturePreferenceCategory,
	PreferenceFieldName,
} from "../company-config-bootstrap"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "react/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "react/components/ui/form"
import { RadioGroup, RadioGroupItem } from "react/components/ui/radio-group"
import { cn } from "react/lib/utils"

type PreferenciasCulturalesFormValues = {
	preferences: Record<PreferenceFieldName, string>
}

type PreferenciasCulturalesFormProps = {
	userId: string
	initialData: AdminCompanyConfigInitialData
	cultureCategories: CulturePreferenceCategory[]
	canEdit: boolean
}

function mapCategoryTechnicalNameToPreferenceField(technicalName: string): PreferenceFieldName | null {
	if (technicalName === "collaboration_style") {
		return "colaboration_style"
	}

	if (
		technicalName === "dress_code" ||
		technicalName === "work_pace" ||
		technicalName === "level_of_autonomy" ||
		technicalName === "dealing_with_management" ||
		technicalName === "level_of_monitoring"
	) {
		return technicalName
	}

	return null
}

function buildInitialPreferences(
	categories: CulturePreferenceCategory[],
	initialPreferences: Partial<Record<PreferenceFieldName, string>>
) {
	return categories.reduce<Record<PreferenceFieldName, string>>(
		(acc, category) => {
			const fieldName = mapCategoryTechnicalNameToPreferenceField(category.technical_name)

			if (!fieldName) {
				return acc
			}

			const options = category.values.map((option) => option.technical_name)
			const initialValue = initialPreferences[fieldName]
			const selectedValue = initialValue && options.includes(initialValue) ? initialValue : ""

			acc[fieldName] = selectedValue
			return acc
		},
		{
			dress_code: "",
			colaboration_style: "",
			work_pace: "",
			level_of_autonomy: "",
			dealing_with_management: "",
			level_of_monitoring: "",
		}
	)
}

export default function PreferenciasCulturalesForm({
	userId,
	initialData,
	cultureCategories,
	canEdit,
}: PreferenciasCulturalesFormProps) {
	const router = useRouter()
	const [isSaving, setIsSaving] = React.useState(false)
	const isReadOnly = !canEdit

	const defaultPreferences = React.useMemo(
		() => buildInitialPreferences(cultureCategories, initialData.preferences),
		[cultureCategories, initialData.preferences]
	)

	const defaultValues = React.useMemo<PreferenciasCulturalesFormValues>(
		() => ({
			preferences: defaultPreferences,
		}),
		[defaultPreferences]
	)

	const form = useForm<PreferenciasCulturalesFormValues>({
		defaultValues,
	})

	React.useEffect(() => {
		form.reset(defaultValues)
	}, [defaultValues, form])

	const onSubmit = async (values: PreferenciasCulturalesFormValues) => {
		if (isReadOnly) {
			return
		}

		setIsSaving(true)

		const payload = {
			userId,
			name: initialData.name.trim() || "Empresa",
			logo: initialData.logo,
			contact_email: initialData.contact_email,
			country: initialData.country,
			state: initialData.state,
			city: initialData.city,
			address: initialData.address,
			description: initialData.description,
			mision: initialData.mision,
			values: initialData.values,
			dress_code: values.preferences.dress_code,
			colaboration_style: values.preferences.colaboration_style,
			work_pace: values.preferences.work_pace,
			level_of_autonomy: values.preferences.level_of_autonomy,
			dealing_with_management: values.preferences.dealing_with_management,
			level_of_monitoring: values.preferences.level_of_monitoring,
		}

		try {
			const response = await fetch("/api/admin/company-config", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null
				throw new Error(body?.message ?? "No se pudo guardar la configuración")
			}

			toast.success("Preferencias culturales actualizadas")
			router.refresh()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración")
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<section className="mx-auto w-full max-w-5xl space-y-8">
			<div>
				<h1 className="text-2xl font-semibold">Preferencias Culturales</h1>
				<p className="text-sm text-foreground/70">
					{isReadOnly
						? "Puedes consultar las preferencias culturales de la empresa."
						: "Define las preferencias culturales para alinear mejor candidatos y equipo."}
				</p>
			</div>

			{isReadOnly ? (
				<p className="rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
					Tu rol tiene acceso de solo lectura a esta sección.
				</p>
			) : null}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<fieldset disabled={isSaving || isReadOnly} className="space-y-8">
							{cultureCategories.map((category) => {
								const preferenceField = mapCategoryTechnicalNameToPreferenceField(category.technical_name)

								if (!preferenceField) {
									return null
								}

								const fieldName = `preferences.${preferenceField}` as FieldPath<PreferenciasCulturalesFormValues>

								return (
									<FormField
										key={category.technical_name}
										control={form.control}
										name={fieldName}
										rules={{
											required: `Debes seleccionar una opción para ${category.display_name}.`,
										}}
										render={({ field }) => (
											<Card className="rounded-2xl border border-border/70 bg-background/70 shadow-soft">
												<CardHeader className="space-y-1">
													<CardTitle>{category.display_name}</CardTitle>
													<CardDescription>
														Elige la opción que mejor se alinee con la cultura de la empresa.
													</CardDescription>
												</CardHeader>
												<CardContent>
													<FormItem className="space-y-3">
														<FormLabel className="text-sm text-foreground/70">Selección única</FormLabel>
														<FormControl>
															<RadioGroup
																value={typeof field.value === "string" ? field.value : ""}
																onValueChange={field.onChange}
																className="grid gap-5 sm:grid-cols-2"
															>
																{category.values.map((option) => {
																	const isSelected = field.value === option.technical_name
																	const optionId = `${category.technical_name}-${option.technical_name}`

																	return (
																		<label key={option.technical_name} className="block">
																			<Card
																				className={cn(
																					"cursor-pointer border border-border/70 bg-background/80 transition hover:border-primary/50 hover:bg-muted/40",
																					isSelected && "border-primary/70 ring-1 ring-primary/25 bg-primary/5"
																				)}
																			>
																				<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
																					<div className="space-y-1">
																						<CardTitle className="text-base">{option.display_name}</CardTitle>
																					</div>
																					<RadioGroupItem
																						id={optionId}
																						value={option.technical_name}
																						aria-label={option.display_name}
																					/>
																				</CardHeader>
																				<CardContent className="pt-0">
																					<CardDescription>{option.description}</CardDescription>
																				</CardContent>
																			</Card>
																		</label>
																	)
																})}
															</RadioGroup>
														</FormControl>
														<FormMessage />
													</FormItem>
												</CardContent>
											</Card>
										)}
									/>
								)
							})}

					<CardFooter className="justify-end px-0">
						{canEdit ? (
							<Button type="submit" disabled={isSaving}>
								{isSaving ? "Guardando..." : "Guardar cambios"}
							</Button>
						) : null}
					</CardFooter>
					</fieldset>
				</form>
			</Form>
		</section>
	)
}
