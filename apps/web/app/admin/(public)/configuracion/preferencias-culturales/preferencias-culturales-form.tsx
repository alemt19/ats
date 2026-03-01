"use client"

import * as React from "react"
import { useForm, type FieldPath } from "react-hook-form"

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
}

const DEFAULT_SCHEMA_PREFERENCES: Record<PreferenceFieldName, string> = {
	dress_code: "none",
	colaboration_style: "flexible",
	work_pace: "moderate",
	level_of_autonomy: "medium",
	dealing_with_management: "none",
	level_of_monitoring: "medium",
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
			const schemaDefault = DEFAULT_SCHEMA_PREFERENCES[fieldName]
			const fallbackBySchema = options.includes(schemaDefault) ? schemaDefault : options[0] ?? ""
			const selectedValue = initialValue && options.includes(initialValue) ? initialValue : fallbackBySchema

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
}: PreferenciasCulturalesFormProps) {
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

	const onSubmit = (values: PreferenciasCulturalesFormValues) => {
		const payload = {
			userId,
			dress_code: values.preferences.dress_code,
			colaboration_style: values.preferences.colaboration_style,
			work_pace: values.preferences.work_pace,
			level_of_autonomy: values.preferences.level_of_autonomy,
			dealing_with_management: values.preferences.dealing_with_management,
			level_of_monitoring: values.preferences.level_of_monitoring,
		}

		console.log("Payload para backend:", payload)
	}

	return (
		<section className="mx-auto w-full max-w-5xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Preferencias Culturales</h1>
				<p className="text-sm text-muted-foreground">
					Define las preferencias culturales para alinear mejor candidatos y equipo.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Alineación cultural</CardTitle>
							<CardDescription>
								Estas preferencias abarcan desde dress code hasta nivel de supervisión.
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
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
										render={({ field }) => (
											<Card>
												<CardHeader>
													<CardTitle>{category.display_name}</CardTitle>
													<CardDescription>
														Elige la opción que mejor se alinee con la cultura de la empresa.
													</CardDescription>
												</CardHeader>
												<CardContent>
													<FormItem className="space-y-3">
														<FormLabel className="text-sm text-muted-foreground">Selección única</FormLabel>
														<FormControl>
															<RadioGroup
																value={typeof field.value === "string" ? field.value : ""}
																onValueChange={field.onChange}
																className="grid gap-4 sm:grid-cols-2"
															>
																{category.values.map((option) => {
																	const isSelected = field.value === option.technical_name
																	const optionId = `${category.technical_name}-${option.technical_name}`

																	return (
																		<label key={option.technical_name} className="block">
																			<Card
																				className={cn(
																					"cursor-pointer border-muted/60 transition hover:border-primary/50",
																					isSelected && "border-primary/70 ring-1 ring-primary/20"
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
						</CardContent>
					</Card>

					<CardFooter className="justify-end px-0">
						<Button type="submit">Guardar cambios</Button>
					</CardFooter>
				</form>
			</Form>
		</section>
	)
}
