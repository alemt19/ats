"use client"

import * as React from "react"
import { useForm, type FieldPath } from "react-hook-form"

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
  userId: string
  categories: CulturePreferenceCategory[]
  initialSelections: Record<string, string>
}

function buildDefaultSelections(
  categories: CulturePreferenceCategory[],
  initialSelections: Record<string, string>
) {
  return categories.reduce<Record<string, string>>((acc, category) => {
    const fallbackValue = category.values[0]?.technical_name ?? ""
    acc[category.technical_name] =
      initialSelections[category.technical_name] ?? fallbackValue
    return acc
  }, {})
}

export default function PreferenciasCulturalesForm({
  userId,
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

  const onSubmit = (values: CulturePreferenceFormValues) => {
    const payload = {
      userId,
      preferences: values.preferences,
    }

    console.log("Payload para backend:", payload)
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Preferencias culturales</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona las opciones que mejor describen tu entorno laboral ideal.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {categories.map((category) => {
            const fieldName = `preferences.${category.technical_name}` as FieldPath<
              CulturePreferenceFormValues
            >

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
                        Elige la opcion que mejor se alinee con tu estilo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm text-muted-foreground">
                          Seleccion unica
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
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
                                      isSelected &&
                                        "border-primary/70 ring-1 ring-primary/20"
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
            <Button type="submit">Guardar cambios</Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
