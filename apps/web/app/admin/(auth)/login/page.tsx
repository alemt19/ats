import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { getSession } from "../../../../auth"
import AdminLoginClientPage from "./login-client"

export default async function AdminLoginPage() {
	const session = await getSession()
	const cookieStore = await cookies()
	const sessionScope = cookieStore.get("ats_scope")?.value

	if (session?.user && sessionScope === "admin") {
		redirect("/admin/ofertas")
	}

	return <AdminLoginClientPage />
}
