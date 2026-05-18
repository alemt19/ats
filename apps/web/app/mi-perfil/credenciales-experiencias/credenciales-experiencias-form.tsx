"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "react/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { MultiDatalistField, type CompetenciasValoresInitialData, type ExperienceFormValue } from "../competencias-valores/competencias-valores-form"

type CredencialesExperienciasFormValues = {
  credentials: string[]
  experiences: ExperienceFormValue[]
}

type CredencialesExperienciasFormProps = {
  initialData: CompetenciasValoresInitialData
  credentialOptions: string[]
}

function getTodayIso() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export default function CredencialesExperienciasForm({
  initialData,
  credentialOptions,
}: CredencialesExperienciasFormProps) {
  const todayIso = React.useMemo(() => getTodayIso(), [])
  const form = useForm<CredencialesExperienciasFormValues>({
    defaultValues: {
      credentials: initialData.credentials ?? [],
      experiences: initialData.experiences ?? [],
    },
  })

  const { fields: experienceFields, append, remove } = useFieldArray({
    control: form.control,
    name: "experiences",
  })

  const onSubmit = async (values: CredencialesExperienciasFormValues) => {
    const validExperiences = values.experiences.filter(
      (experience) =>
        experience.position.trim().length > 0 ||
        experience.company_name.trim().length > 0 ||
        experience.start_date.trim().length > 0 ||
        experience.end_date.trim().length > 0
    )

    try {
      const response = await fetch("/api/candidates/me/credenciales-experiencias", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          credentials: JSON.stringify(values.credentials ?? []),
          experiences: JSON.stringify(validExperiences),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message ?? "No se pudieron guardar los cambios")
      }

      toast.success("Credenciales y experiencias actualizadas")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron guardar los cambios"
      toast.error(message)
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <div className="space-y-3">
        
        <div>
          <h1 className="text-2xl font-semibold">Credenciales profesionales y experiencias</h1>
          <p className="text-sm text-foreground/70">
            Registra tus credenciales y tu historial laboral. Ambos campos son opcionales.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
            <CardHeader className="space-y-1">
              <CardTitle>Credenciales profesionales</CardTitle>
              <CardDescription>
                Añade certificaciones, credenciales o títulos que quieras mostrar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiDatalistField
                fieldName="credentials"
                label="Credenciales profesionales"
                placeholder="AWS SAA, Scrum Master, PMP..."
                options={credentialOptions}
                selectedValues={form.watch("credentials")}
                onChangeValues={(values) => form.setValue("credentials", values, { shouldDirty: true })}
              />
            </CardContent>
          </Card>

          <Card className="gradient-border rounded-3xl bg-card/90 shadow-soft">
            <CardHeader className="space-y-1">
              <CardTitle>Experiencias</CardTitle>
              <CardDescription>
                Agrega tantas experiencias laborales como necesites. Si continúan vigentes, deja la fecha final vacía.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-border/70 bg-background/70 hover:bg-muted/80"
                  onClick={() =>
                    append({
                      position: "",
                      company_name: "",
                      start_date: "",
                      end_date: "",
                    })
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Agregar experiencia
                </Button>
              </div>

              {experienceFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No has registrado experiencias todavía.</p>
              ) : (
                <div className="space-y-4">
                  {experienceFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground/85">Experiencia #{index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Completa los campos y respeta el orden cronológico.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Eliminar
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`experiences.${index}.position`}
                          rules={{
                            validate: (value) =>
                              !experienceFields[index] || value.trim().length > 0 || "El cargo es obligatorio",
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground/85">
                                Cargo desempeñado
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Product Manager" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`experiences.${index}.company_name`}
                          rules={{
                            validate: (value) =>
                              !experienceFields[index] || value.trim().length > 0 || "La empresa u organización es obligatoria",
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground/85">
                                Empresa u organización
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: ACME Corp" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`experiences.${index}.start_date`}
                          rules={{
                            validate: (value) => {
                              if (!value.trim()) {
                                return "La fecha de inicio es obligatoria"
                              }

                              if (value > todayIso) {
                                return "La fecha de inicio no puede ser futura"
                              }

                              const endDate = form.getValues(`experiences.${index}.end_date`)
                              if (endDate && value > endDate) {
                                return "La fecha de inicio no puede ser mayor que la fecha de fin"
                              }

                              return true
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground/85">
                                Fecha de inicio
                              </FormLabel>
                              <FormControl>
                                <Input type="date" max={todayIso} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`experiences.${index}.end_date`}
                          rules={{
                            validate: (value) => {
                              if (!value.trim()) {
                                return true
                              }

                              if (value > todayIso) {
                                return "La fecha de fin no puede ser futura"
                              }

                              const startDate = form.getValues(`experiences.${index}.start_date`)
                              if (startDate && value < startDate) {
                                return "La fecha de fin no puede ser menor que la fecha de inicio"
                              }

                              return true
                            },
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-foreground/85">
                                Fecha de fin
                              </FormLabel>
                              <FormControl>
                                <Input type="date" max={todayIso} {...field} placeholder="Dejar vacío si sigue vigente" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <CardFooter className="justify-end px-0">
            <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full px-5">
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </section>
  )
}
