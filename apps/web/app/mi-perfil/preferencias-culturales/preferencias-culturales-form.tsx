"use client"

import * as React from "react"
import { useForm, type FieldPath } from "react-hook-form"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "react/components/ui/form"
import { RadioGroup, RadioGroupItem } from "react/components/ui/radio-group"
import { cn } from "react/lib/utils"

export type CulturePreferenceOption = {
  technical_name: string
  display_name: string
  description: string
}

export type CulturePreferenceCategory = {
  technical_name: string
  display_name: string
  values: CulturePreferenceOption[]
}

export type CulturePreferenceFormValues = {
  preferences: Record<string, string>
}

type PreferenciasCulturalesFormProps = {
  categories: CulturePreferenceCategory[]
  initialSelections: Partial<Record<string, string | null>>
}

const apiBaseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

function buildDefaultSelections(
  categories: CulturePreferenceCategory[],
  initialSelections: Partial<Record<string, string | null>>
) {
  return categories.reduce<Record<string, string>>((acc, category) => {
    const initialValue = initialSelections[category.technical_name]
    acc[category.technical_name] =
      typeof initialValue === "string" &&
      category.values.some((value) => value.technical_name === initialValue)
        ? initialValue
        : ""

    return acc
  }, {})
}

function normalizeSelectionValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().toLowerCase()
}

function hasPreferenceChanges(
  categories: CulturePreferenceCategory[],
  currentPreferences: Record<string, string>,
  savedPreferences: Record<string, string>
) {
  return categories.some((category) => {
    const key = category.technical_name

    return (
      normalizeSelectionValue(currentPreferences[key]) !==
      normalizeSelectionValue(savedPreferences[key])
    )
  })
}

export default function PreferenciasCulturalesForm({
  categories,
  initialSelections,
}: PreferenciasCulturalesFormProps) {
  const defaultSelections = React.useMemo(
    () => buildDefaultSelections(categories, initialSelections),
    [categories, initialSelections]
  )

  const form = useForm<CulturePreferenceFormValues>({
    defaultValues: {
      preferences: defaultSelections,
    },
  })

  const savedPreferencesRef = React.useRef(defaultSelections)

  const onSubmit = async (values: CulturePreferenceFormValues) => {
    const preferencesEdited = hasPreferenceChanges(
      categories,
      values.preferences,
      savedPreferencesRef.current
    )

    const payload = {
      dress_code: values.preferences.dress_code || null,
      collaboration_style: values.preferences.collaboration_style || null,
      work_pace: values.preferences.work_pace || null,
      level_of_autonomy: values.preferences.level_of_autonomy || null,
      dealing_with_management: values.preferences.dealing_with_management || null,
      level_of_monitoring: values.preferences.level_of_monitoring || null,
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/candidates/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("No se pudieron guardar las preferencias")
      }

      toast.success("Preferencias culturales actualizadas")

      if (preferencesEdited) {
        toast.info("Si tienes postulaciones activas", {
          description:
            "Para que tus cambios en preferencias culturales se reflejen en los puntajes, debes volver a postular.",
        })
      }

      savedPreferencesRef.current = { ...values.preferences }
    } catch {
      toast.error("No se pudieron guardar los cambios")
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Preferencias culturales</h1>
        <p className="text-sm text-foreground/70">
          Selecciona las opciones que mejor describen tu entorno laboral ideal.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {categories.map((category) => {
            const fieldName = `preferences.${category.technical_name}` as FieldPath<
              CulturePreferenceFormValues
            >

            return (
              <FormField
                key={category.technical_name}
                control={form.control}
                name={fieldName}
                rules={{
                  required: `Selecciona una opción para ${category.display_name}`,
                }}
                render={({ field }) => (
                  <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
                    <CardHeader className="space-y-1">
                      <CardTitle>{category.display_name}</CardTitle>
                      <CardDescription>
                        Elige la opción que mejor se alinee con tu estilo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm text-foreground/70">
                          Selección única
                        </FormLabel>
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
                                      isSelected &&
                                        "border-primary/70 ring-1 ring-primary/25 bg-primary/5"
                                    )}
                                  >
                                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                                      <div className="space-y-1">
                                        <CardTitle className="text-base">
                                          {option.display_name}
                                        </CardTitle>
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

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-5">Guardar cambios</Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
