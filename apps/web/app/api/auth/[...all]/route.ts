const backendApiUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function buildTargetUrl(
	request: Request,
	params: Promise<{ all?: string[] }>
) {
	const resolvedParams = await params
	const path = (resolvedParams.all ?? []).join("/")
	const search = new URL(request.url).search
	const normalizedPath = path ? `/${path}` : ""

	return `${backendApiUrl}/api/auth${normalizedPath}${search}`
}

export async function GET(
	request: Request,
	context: { params: Promise<{ all?: string[] }> }
) {
	const targetUrl = await buildTargetUrl(request, context.params)

	const response = await fetch(targetUrl, {
		method: "GET",
		headers: {
			...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie") as string } : {}),
			...(request.headers.get("authorization")
				? { authorization: request.headers.get("authorization") as string }
				: {}),
		},
		cache: "no-store",
	})

	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	})
}

export async function POST(
	request: Request,
	context: { params: Promise<{ all?: string[] }> }
) {
	const targetUrl = await buildTargetUrl(request, context.params)

	const response = await fetch(targetUrl, {
		method: "POST",
		headers: {
			...(request.headers.get("content-type")
				? { "content-type": request.headers.get("content-type") as string }
				: {}),
			...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie") as string } : {}),
			...(request.headers.get("authorization")
				? { authorization: request.headers.get("authorization") as string }
				: {}),
		},
		body: await request.arrayBuffer(),
		cache: "no-store",
	})

	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	})
}
