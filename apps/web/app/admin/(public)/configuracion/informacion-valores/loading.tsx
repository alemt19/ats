import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function InformacionValoresLoading() {
	return (
		<section className="mx-auto w-full max-w-5xl space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-72" />
				<Skeleton className="h-4 w-96" />
			</div>

			<Card>
				<CardHeader className="space-y-2">
					<Skeleton className="h-6 w-60" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
					<Skeleton className="h-10 w-full" />
					<div className="grid gap-4 md:grid-cols-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
					<Skeleton className="h-10 w-full" />
					<div className="grid gap-4 md:grid-cols-2">
						<Skeleton className="h-28 w-full" />
						<Skeleton className="h-28 w-full" />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="space-y-2">
					<Skeleton className="h-6 w-52" />
					<Skeleton className="h-4 w-80" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-24 w-full" />
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Skeleton className="h-10 w-36" />
			</div>
		</section>
	)
}
