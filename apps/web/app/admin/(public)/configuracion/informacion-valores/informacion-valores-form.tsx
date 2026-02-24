"use client"

import * as React from "react"
import { Sparkles, X } from "lucide-react"
import { useForm } from "react-hook-form"

import type { AdminCompanyConfigInitialData } from "../company-config-bootstrap"
import { Button } from "react/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "react/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "react/components/ui/form"
import { Input } from "react/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "react/components/ui/select"
import { Textarea } from "react/components/ui/textarea"

type MultiDatalistFieldProps = {
	label: string
	placeholder: string
	options: string[]
	selectedValues: string[]
	onChangeValues: (values: string[]) => void
	suggestionItems?: string[]
	onAddSuggestion?: (value: string) => void
	disabled?: boolean
}

type InformacionValoresFormValues = {
	name: string
	logo: string
	contact_email: string
	country: string
	state: string
	city: string
	address: string
	description: string
	mision: string
	values: string[]
}

type InformacionValoresFormProps = {
	userId: string
	initialData: AdminCompanyConfigInitialData
	cityOptions: string[]
	companyValueOptions: string[]
}

function normalizeValue(value: string) {
	return value.trim().toLowerCase()
}

function dedupe(values: string[]) {
	const unique = new Set<string>()

	values.forEach((value) => {
		const clean = value.trim()

		if (!clean) {
			return
		}

		unique.add(clean)
	})

	return Array.from(unique)
}

async function getCompanyValuesSuggestionsFromDummyApi(input: {
	description: string
	mission: string
}): Promise<string[]> {
	await new Promise((resolve) => setTimeout(resolve, 900))

	const baseText = `${input.description} ${input.mission}`.toLowerCase()
	const suggestions = ["Responsabilidad", "Integridad", "Colaboración"]

	if (baseText.includes("cliente") || baseText.includes("servicio")) {
		suggestions.push("Empatía")
	}

	if (baseText.includes("innov") || baseText.includes("tecnolog") || baseText.includes("mejora")) {
		suggestions.push("Innovación")
	}

	if (baseText.includes("equipo") || baseText.includes("talento")) {
		suggestions.push("Respeto")
	}

	if (baseText.includes("calidad") || baseText.includes("excelencia")) {
		suggestions.push("Excelencia")
	}

	return dedupe(suggestions)
}

function MultiDatalistField({
	label,
	placeholder,
	options,
	selectedValues,
	onChangeValues,
	suggestionItems = [],
	onAddSuggestion,
	disabled = false,
}: MultiDatalistFieldProps) {
	const [draft, setDraft] = React.useState("")
	const datalistId = "company-values-options"

	const addValue = React.useCallback(() => {
		const clean = draft.trim()

		if (!clean) {
			return
		}

		const alreadyExists = selectedValues.some((value) => normalizeValue(value) === normalizeValue(clean))

		if (alreadyExists) {
			setDraft("")
			return
		}

		onChangeValues([...selectedValues, clean])
		setDraft("")
	}, [draft, onChangeValues, selectedValues])

	const removeValue = React.useCallback(
		(valueToRemove: string) => {
			onChangeValues(selectedValues.filter((item) => item !== valueToRemove))
		},
		[onChangeValues, selectedValues]
	)

	const availableOptions = React.useMemo(
		() =>
			options.filter(
				(option) => !selectedValues.some((selected) => normalizeValue(selected) === normalizeValue(option))
			),
		[options, selectedValues]
	)

	return (
		<div className="space-y-2">
			<FormLabel>{label}</FormLabel>

			<div className="flex gap-2">
				<Input
					list={datalistId}
					value={draft}
					placeholder={placeholder}
					disabled={disabled}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault()
							addValue()
						}
					}}
				/>
				<Button type="button" variant="outline" onClick={addValue} disabled={disabled}>
					Agregar
				</Button>
			</div>

			<datalist id={datalistId}>
				{availableOptions.map((option) => (
					<option key={option} value={option} />
				))}
			</datalist>

			<div className="flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
				{selectedValues.length === 0 ? (
					<span className="text-sm text-muted-foreground">Sin elementos seleccionados.</span>
				) : (
					selectedValues.map((value) => (
						<span
							key={value}
							className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
						>
							{value}
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								disabled={disabled}
								onClick={() => removeValue(value)}
							>
								<X className="size-3" />
							</Button>
						</span>
					))
				)}
			</div>

			{suggestionItems.length > 0 ? (
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground">Sugerencias para {label}</p>
					<div className="flex flex-wrap gap-2">
						{suggestionItems.map((item) => {
							const alreadyAdded = selectedValues.some(
								(selectedValue) => normalizeValue(selectedValue) === normalizeValue(item)
							)

							return (
								<div
									key={item}
									className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
								>
									<span>{item}</span>
									<Button
										type="button"
										size="xs"
										variant={alreadyAdded ? "secondary" : "outline"}
										disabled={alreadyAdded || disabled}
										onClick={() => onAddSuggestion?.(item)}
									>
										{alreadyAdded ? "Agregado" : "Agregar"}
									</Button>
								</div>
							)
						})}
					</div>
				</div>
			) : null}
		</div>
	)
}

export default function InformacionValoresForm({
	userId,
	initialData,
	cityOptions,
	companyValueOptions,
}: InformacionValoresFormProps) {
	const [isGeneratingSuggestions, setIsGeneratingSuggestions] = React.useState(false)
	const [valueSuggestions, setValueSuggestions] = React.useState<string[]>([])

	const defaultValues = React.useMemo<InformacionValoresFormValues>(
		() => ({
			name: initialData.name,
			logo: initialData.logo,
			contact_email: initialData.contact_email,
			country: initialData.country,
			state: initialData.state,
			city: initialData.city,
			address: initialData.address,
			description: initialData.description,
			mision: initialData.mision,
			values: initialData.values,
		}),
		[initialData]
	)

	const form = useForm<InformacionValoresFormValues>({
		defaultValues,
	})

	React.useEffect(() => {
		form.reset(defaultValues)
	}, [defaultValues, form])

	const description = form.watch("description")
	const mission = form.watch("mision")
	const companyValues = form.watch("values")
	const canSuggestValues = description.trim().length > 0 && mission.trim().length > 0

	const addSuggestionToValues = React.useCallback(
		(value: string) => {
			const currentValues = form.getValues("values")
			const exists = currentValues.some(
				(currentValue) => normalizeValue(currentValue) === normalizeValue(value)
			)

			if (exists) {
				return
			}

			form.setValue("values", [...currentValues, value], { shouldDirty: true })
		},
		[form]
	)

	const handleSuggestCompanyValues = async () => {
		setIsGeneratingSuggestions(true)

		try {
			const suggestions = await getCompanyValuesSuggestionsFromDummyApi({
				description,
				mission,
			})

			setValueSuggestions(suggestions)
		} finally {
			setIsGeneratingSuggestions(false)
		}
	}

	const onSubmit = (values: InformacionValoresFormValues) => {
		const payload = {
			userId,
			name: values.name,
			logo: values.logo,
			contact_email: values.contact_email,
			country: values.country,
			state: values.state,
			city: values.city,
			address: values.address,
			description: values.description,
			mision: values.mision,
			values: values.values,
		}

		console.log("Payload para backend:", payload)
	}

	return (
		<section className="mx-auto w-full max-w-5xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Información y Valores</h1>
				<p className="text-sm text-muted-foreground">
					Actualiza la información principal de la empresa y sus valores culturales.
				</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Información de la empresa</CardTitle>
							<CardDescription>Completa los datos base del perfil corporativo.</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nombre</FormLabel>
											<FormControl>
												<Input placeholder="Nombre de la empresa" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="logo"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Logo</FormLabel>
											<FormControl>
												<Input placeholder="URL del logo" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="contact_email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email de contacto</FormLabel>
										<FormControl>
											<Input type="email" placeholder="contacto@empresa.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid gap-4 md:grid-cols-3">
								<FormField
									control={form.control}
									name="country"
									render={({ field }) => (
										<FormItem>
											<FormLabel>País</FormLabel>
											<FormControl>
												<Input {...field} disabled />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="state"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Estado</FormLabel>
											<FormControl>
												<Input {...field} disabled />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="city"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Ciudad</FormLabel>
											<Select value={field.value} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Selecciona una ciudad" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{cityOptions.map((cityOption) => (
														<SelectItem key={cityOption} value={cityOption}>
															{cityOption}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="address"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Dirección</FormLabel>
										<FormControl>
											<Input placeholder="Dirección de la empresa" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Descripción</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Describe brevemente la empresa"
													className="min-h-28"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="mision"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Misión</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Define la misión de la empresa"
													className="min-h-28"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Valores de la empresa</CardTitle>
							<CardDescription>
								Puedes sugerir valores desde descripción y misión, y luego ajustar manualmente.
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
							<div>
								<Button
									type="button"
									variant="outline"
									onClick={handleSuggestCompanyValues}
									disabled={!canSuggestValues || isGeneratingSuggestions}
								>
									<Sparkles className="size-4" />
									{isGeneratingSuggestions
										? "Generando sugerencias..."
										: "Sugerir valores de la empresa"}
								</Button>
							</div>

							{!canSuggestValues ? (
								<p className="text-sm text-muted-foreground">
									Completa los campos de descripción y misión para habilitar esta sección.
								</p>
							) : null}

							<div className={canSuggestValues ? "space-y-4" : "pointer-events-none space-y-4 opacity-60"}>
								<MultiDatalistField
									label="Valores"
									placeholder="Selecciona o escribe un valor"
									options={companyValueOptions}
									selectedValues={companyValues}
									onChangeValues={(values) => form.setValue("values", dedupe(values), { shouldDirty: true })}
									suggestionItems={valueSuggestions}
									onAddSuggestion={addSuggestionToValues}
									disabled={!canSuggestValues}
								/>
							</div>
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
