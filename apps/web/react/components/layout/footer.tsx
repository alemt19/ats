import Link from "next/link"
import { Separator } from "../ui/separator"

type FooterProps = {
    companyName?: string
    logoSrc?: string
}

export default function Footer({ companyName = "Ats", logoSrc }: FooterProps) {
    return (
        <footer className="border-t border-neutral-200 bg-background/95">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
                <div className="max-w-xs space-y-2">
                    <Link href="/" className="flex items-center gap-3">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={`${companyName} logo`}
                                className="h-5 w-5 rounded-md object-contain"
                            />
                        ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-semibold">
                                {companyName.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <span className="text-base font-semibold tracking-tight">{companyName}</span>
                    </Link>

                    <p className="text-sm text-muted-foreground">
                        Conectando el talento venezolano con su futuro.
                    </p>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground text-center">
                    &copy; {new Date().getFullYear()} {companyName}. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}
