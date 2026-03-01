import { Card, CardContent, CardHeader } from "react/components/ui/card"
import { Skeleton } from "react/components/ui/skeleton"

export default function PreferenciasCulturalesLoading() {
	return (
		<section className="mx-auto w-full max-w-5xl space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-8 w-80" />
				<Skeleton className="h-4 w-[30rem]" />
			</div>

			<Card>
				<CardHeader className="space-y-2">
					<Skeleton className="h-6 w-56" />
					<Skeleton className="h-4 w-80" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, categoryIndex) => (
						<Card key={categoryIndex}>
							<CardHeader className="space-y-2">
								<Skeleton className="h-6 w-52" />
								<Skeleton className="h-4 w-72" />
							</CardHeader>
							<CardContent className="grid gap-4 sm:grid-cols-2">
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-28 w-full" />
							</CardContent>
						</Card>
					))}
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Skeleton className="h-10 w-36" />
			</div>
		</section>
	)
}
