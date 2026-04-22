"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "react/components/ui/button"
import { Input } from "react/components/ui/input"

type DashboardDateFiltersProps = {
	initialFrom?: string | null
	initialTo?: string | null
}

function getTodayIso() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, "0")
	const day = String(now.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

export default function DashboardDateFilters({ initialFrom, initialTo }: DashboardDateFiltersProps) {
	const router = useRouter()
	const pathname = usePathname()
	const todayIso = React.useMemo(() => getTodayIso(), [])
	const [from, setFrom] = React.useState(initialFrom ?? "")
	const [to, setTo] = React.useState(initialTo ?? "")
	const [error, setError] = React.useState<string | null>(null)

	const fromMax = to && to <= todayIso ? to : todayIso
	const toMin = from || undefined
	const toMax = todayIso

	const isFromFuture = from > todayIso
	const isToFuture = to > todayIso
	const isInvalidRange = Boolean(from && to && from > to)

	const canSubmit = Boolean(!isFromFuture && !isToFuture && !isInvalidRange)

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (from && from > todayIso) {
			setError("La fecha inicial no puede ser futura.")
			return
		}

		if (to && to > todayIso) {
			setError("La fecha final no puede ser futura.")
			return
		}

		if (from && to && from > to) {
			setError("La fecha inicial no puede ser mayor que la fecha final.")
			return
		}

		setError(null)

		const params = new URLSearchParams()
		if (from) params.set("from", from)
		if (to) params.set("to", to)

		const query = params.toString()
		router.push(query ? `${pathname}?${query}` : pathname)
	}

	return (
		<form
			className="w-full max-w-2xl grid grid-cols-1 items-end gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
			onSubmit={handleSubmit}
		>
			<div className="space-y-1">
				<label htmlFor="from" className="text-xs font-medium text-foreground/70">
					Fecha inicial
				</label>
				<Input
					id="from"
					type="date"
					value={from}
					max={fromMax}
					onChange={(event) => {
						const nextValue = event.target.value
						setFrom(nextValue)
						if (error) setError(null)
					}}
				/>
			</div>
			<div className="space-y-1">
				<label htmlFor="to" className="text-xs font-medium text-foreground/70">
					Fecha final
				</label>
				<Input
					id="to"
					type="date"
					value={to}
					min={toMin}
					max={toMax}
					onChange={(event) => {
						const nextValue = event.target.value
						setTo(nextValue)
						if (error) setError(null)
					}}
				/>
			</div>
			<div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
				<div className="flex gap-2">
					<Button type="submit" className="rounded-full" disabled={!canSubmit}>
						Aplicar
					</Button>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-border/70 bg-background/70 text-foreground/80 hover:border-primary/40"
						onClick={() => {
							setFrom("")
							setTo("")
							setError(null)
							router.push(pathname)
						}}
					>
						Limpiar
					</Button>
				</div>
				{error ? <p className="text-xs text-destructive">{error}</p> : null}
			</div>
		</form>
	)
}