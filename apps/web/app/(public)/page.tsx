
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "../../react/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../react/components/ui/card"
import { AspectRatio } from "../../react/components/ui/aspect-ratio"
import { BrainCircuit, Network, UserPlus } from "lucide-react"
import LatestOffersSection from "./components/latest-offers-section"
import LatestOffersSectionSkeleton from "./components/latest-offers-section-skeleton"

export default function PublicPage() {
    return (
        <main>
            <section className="relative isolate overflow-hidden">
                <div
                    className="h-[60vh] min-h-[420px] w-full bg-cover bg-center md:h-[72vh] md:min-h-[520px]"
                    style={{ backgroundImage: "url('/images/banner-home.jpg')" }}
                />
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 flex items-center">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                        <div className="max-w-2xl space-y-4 text-white md:space-y-6">
                            <h1 className="text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl">
                                Tu Potencial es Nuestro Próximo Exito
                            </h1>
                            <p className="text-sm leading-relaxed text-white/95 sm:text-base md:text-lg">
                                Unete a un proceso de seleccion justo e innovador que valora tus habilidades reales
                            </p>
                            <Button asChild className="bg-blue-700 hover:bg-blue-800">
                                <Link href="/ofertas">Postulate Ahora</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="bg-muted/30 py-6 sm:py-8 lg:py-12 mt-10">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">
                            Cómo Funciona
                        </h2>
                        <p className="mt-4 text-base text-neutral-700 sm:text-lg">
                            Nuestro proceso está diseñado para ser simple, transparente y enfocado en tu talento.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3">
                        <Card className="rounded-2xl py-4 shadow-none">
                            <CardHeader className="items-center pb-0 text-center justify-center">
                                <UserPlus className="size-8 text-blue-700" />
                            </CardHeader>
                            <CardContent className="space-y-3 text-center">
                                <CardTitle className="text-xl leading-tight font-semibold text-neutral-800">
                                    1. Regístrate
                                </CardTitle>
                                <p className="text-muted-foreground">
                                    Crea tu cuenta en minutos con tu correo electronico.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl py-4 shadow-none">
                            <CardHeader className="items-center pb-0 text-center justify-center">
                                <BrainCircuit className="size-8 text-blue-700" />
                            </CardHeader>
                            <CardContent className="space-y-3 text-center">
                                <CardTitle className="text-xl leading-tight font-semibold text-neutral-800">
                                    2. Completa tu perfil
                                </CardTitle>
                                <p className="text-muted-foreground">
                                    Llena tu perfil con tus habilidades tecnicas, blandas, valores y preferencias culturales
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl py-4 shadow-none md:col-span-2 lg:col-span-1">
                            <CardHeader className="items-center pb-0 text-center justify-center">
                                <Network className="size-8 text-blue-700" />
                            </CardHeader>
                            <CardContent className="space-y-3 text-center">
                                <CardTitle className="text-xl leading-tight font-semibold text-neutral-800">
                                    3. Conéctate con oportunidades
                                </CardTitle>
                                <p className="text-muted-foreground">
                                    Te presentamos nuestras oportunidades laborales para que apliques a la tu consideres
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <section id="beneficios" className="bg-muted/30 py-6 sm:py-8 lg:py-12">
                <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">
                            Beneficios para el Candidato
                        </h2>
                        <p className="mt-4 text-base text-neutral-700 sm:text-lg">
                            Creemos en un proceso de selección que te valora y te impulsa a crecer.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-12 lg:grid-cols-3">
                        <article className="space-y-3">
                            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl">
                                <img
                                    src="/images/potential.png"
                                    alt="Candidato mostrando potencial"
                                    className="h-full w-full object-cover"
                                />
                            </AspectRatio>
                            <h3 className="text-2xl font-semibold text-neutral-800">Enfocado en el valor</h3>
                            <p className="text-muted-foreground">
                                Valoramos no solo tus habilidades tecnicas, sino tus habilidades blandas y ajuste cultural con nuestra organizacion
                            </p>
                        </article>

                        <article className="space-y-3">
                            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl">
                                <img
                                    src="/images/balance.webp"
                                    alt="Proceso justo y equilibrado"
                                    className="h-full w-full object-cover"
                                />
                            </AspectRatio>
                            <h3 className="text-2xl font-semibold text-neutral-800">Proceso justo y sin sesgos</h3>
                            <p className="text-muted-foreground">
                                Utilizamos tecnología para garantizar igualdad de oportunidades para todos.
                            </p>
                        </article>

                        <article className="space-y-3">
                            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl">
                                <img
                                    src="/images/connection.jpg"
                                    alt="Conexion profesional"
                                    className="h-full w-full object-cover"
                                />
                            </AspectRatio>
                            <h3 className="text-2xl font-semibold text-neutral-800">Conexión directa</h3>
                            <p className="text-muted-foreground">
                                Te conectamos con las mejores y más innovadoras empresas de Venezuela.
                            </p>
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
