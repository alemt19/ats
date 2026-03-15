import Link from "next/link"
import { Suspense } from "react"
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  Network,
  ShieldCheck,
  UserPlus,
} from "lucide-react"

import { AspectRatio } from "../../react/components/ui/aspect-ratio"
import { Badge } from "../../react/components/ui/badge"
import { Button } from "../../react/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../react/components/ui/card"
import LatestOffersSection from "./components/latest-offers-section"
import LatestOffersSectionSkeleton from "./components/latest-offers-section-skeleton"

const processSteps = [
  {
    title: "Crea tu cuenta",
    description: "Configura tu perfil en minutos y define hacia donde quieres crecer.",
    icon: UserPlus,
  },
  {
    title: "Potencia tu perfil",
    description: "Muestra habilidades tecnicas, blandas y preferencia de entorno laboral.",
    icon: BrainCircuit,
  },
  {
    title: "Postula con contexto",
    description: "Recibe vacantes alineadas a tu potencial y aplica con informacion clara.",
    icon: Network,
  },
]

export default function PublicPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,color-mix(in_oklab,var(--accent)_30%,transparent)_0%,transparent_44%),radial-gradient(circle_at_86%_0%,color-mix(in_oklab,var(--primary)_32%,transparent)_0%,transparent_52%)]" />
        <div className="absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-primary/22 blur-3xl animate-drift" />
        <div className="absolute -left-24 bottom-12 -z-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-drift" />

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-18 pb-16 sm:px-6 sm:pt-22 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-26 lg:pb-22">
          <div className="space-y-7 animate-fade-up">
            <Badge className="animate-pulse-soft rounded-full border-primary/45 bg-primary/14 px-4 py-1 text-[0.72rem] tracking-[0.1em] text-primary uppercase">
              Neo ATS Experience
            </Badge>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl leading-[0.9] font-semibold sm:text-5xl lg:text-7xl">
                El talento correcto, en el momento correcto
              </h1>
              <p className="max-w-xl text-base sm:text-lg">
                Disenamos una experiencia de postulacion clara, veloz y humana para que cada decision profesional tenga mas contexto y menos friccion.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="group rounded-full px-8 shadow-elevated transition-transform duration-[240ms] hover:-translate-y-0.5"
              >
                <Link href="/ofertas" className="gap-2">
                  Explorar ofertas
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-[240ms] group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-foreground/28 bg-card/80 px-8 text-foreground transition-colors duration-[240ms] hover:border-primary/40 hover:bg-muted/90 hover:text-foreground"
              >
                <Link href="#como-funciona">Ver flujo de seleccion</Link>
              </Button>
            </div>

            <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card/75 p-3 backdrop-blur-sm interactive-lift hover:interactive-lift-hover">
                <p className="text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">Tiempo de filtro</p>
                <p className="mt-1 text-lg font-semibold">-42%</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/75 p-3 backdrop-blur-sm interactive-lift hover:interactive-lift-hover">
                <p className="text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">Precision</p>
                <p className="mt-1 text-lg font-semibold">+68%</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-border/70 bg-card/75 p-3 backdrop-blur-sm interactive-lift hover:interactive-lift-hover sm:col-span-1">
                <p className="text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">Experiencia</p>
                <p className="mt-1 text-lg font-semibold">9.2/10</p>
              </div>
            </div>
          </div>

          <Card className="gradient-border animate-fade-in overflow-hidden rounded-3xl bg-card/95 shadow-elevated">
            <CardHeader className="space-y-4 pb-2">
              <Badge className="w-fit rounded-full bg-accent text-accent-foreground">Command Center</Badge>
              <CardTitle className="text-3xl leading-tight sm:text-4xl">
                Candidaturas con senal real, no solo palabras clave
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3">
                  <Gauge aria-hidden="true" className="size-5 text-primary" />
                  <p className="text-sm text-foreground/90">Scoring de perfil por compatibilidad y madurez profesional.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3">
                  <ShieldCheck aria-hidden="true" className="size-5 text-accent" />
                  <p className="text-sm text-foreground/90">Proceso mas justo con criterios visibles para cada postulacion.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 p-3">
                  <CheckCircle2 aria-hidden="true" className="size-5 text-primary" />
                  <p className="text-sm text-foreground/90">Feedback util para mejorar tu proximo paso profesional.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/45 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Sesiones activas hoy</p>
                <p className="mt-2 text-3xl font-semibold">1,248</p>
                <p className="text-sm text-muted-foreground">+18% vs semana anterior</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-b border-border/65 bg-card/60 py-6">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:px-6">
          {[
            "Empresas con criterios transparentes",
            "Postulaciones con progreso visible",
            "Decisiones guiadas por datos y contexto",
          ].map((item, index) => (
            <article
              key={item}
              className="animate-fade-up rounded-2xl border border-border/70 bg-background/82 px-4 py-3 shadow-soft interactive-lift hover:interactive-lift-hover"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <p className="text-sm font-medium">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="section-space bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 rounded-full border-primary/35 bg-primary/10 text-primary">
              Proceso guiado
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Un flujo simple y medible</h2>
            <p className="mt-4 text-base sm:text-lg">
              Cada paso reduce incertidumbre para que avances con claridad desde el primer clic.
            </p>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {processSteps.map((step, index) => {
              const Icon = step.icon

              return (
                <li
                  key={step.title}
                  className="relative rounded-3xl border border-border/75 bg-card/90 p-6 shadow-soft interactive-lift hover:interactive-lift-hover"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/14 text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-2xl text-muted-foreground/65">0{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.description}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section id="beneficios" className="section-space bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 rounded-full border-accent/35 bg-accent/12 text-accent">
              Valor diferencial
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Una experiencia que se siente premium</h2>
            <p className="mt-4 text-base sm:text-lg">
              Redisenamos el camino de seleccion para que el talento tenga visibilidad, contexto y oportunidades reales.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
            <article className="surface-glass rounded-3xl p-5 interactive-lift hover:interactive-lift-hover lg:col-span-7">
              <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-2xl">
                <img
                  src="/images/potential.png"
                  alt="Candidato demostrando potencial"
                  width={1600}
                  height={900}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
              </AspectRatio>
              <h3 className="mt-4 text-2xl font-semibold">Evaluacion integral</h3>
              <p className="mt-2 text-muted-foreground">
                Valoramos habilidades tecnicas, blandas y compatibilidad cultural para decisiones mas justas.
              </p>
            </article>

            <article className="surface-glass rounded-3xl p-5 interactive-lift hover:interactive-lift-hover lg:col-span-5">
              <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-2xl">
                <img
                  src="/images/balance.webp"
                  alt="Proceso de seleccion equilibrado"
                  width={1600}
                  height={1200}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
              </AspectRatio>
              <h3 className="mt-4 text-2xl font-semibold">Proceso sin sesgos</h3>
              <p className="mt-2 text-muted-foreground">
                Disenamos cada etapa para dar visibilidad al valor real de tu perfil profesional.
              </p>
            </article>

            <article className="surface-glass rounded-3xl p-5 interactive-lift hover:interactive-lift-hover lg:col-span-12">
              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div>
                  <h3 className="text-2xl font-semibold">Conexiones de calidad con empresas reales</h3>
                  <p className="mt-2 text-muted-foreground">
                    Te acercamos a organizaciones innovadoras en Venezuela con vacantes de alto impacto y rutas de crecimiento visibles.
                  </p>
                  <Button asChild variant="outline" className="mt-5 rounded-full border-primary/35 bg-primary/8">
                    <Link href="/ofertas" className="gap-2">
                      Ver oportunidades
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </div>

                <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-2xl">
                  <img
                    src="/images/connection.jpg"
                    alt="Conexion entre talento y empresas"
                    width={1200}
                    height={900}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </AspectRatio>
              </div>
            </article>
          </div>
        </div>
      </section>

      <Suspense fallback={<LatestOffersSectionSkeleton />}>
        <LatestOffersSection />
      </Suspense>
    </main>
  )
}



