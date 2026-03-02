import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSession } from "../../../auth"
import LoginClientPage from "./login-client"

export default async function LoginPage() {
	const session = await getSession()
	const cookieStore = await cookies()
	const sessionScope = cookieStore.get("ats_scope")?.value

	if (session?.user && sessionScope === "candidate") {
		redirect("/")
	}

	return <LoginClientPage />
}
