import { redirect } from "next/navigation"
import { getSession } from "../../../auth"
import LoginClientPage from "./login-client"

export default async function LoginPage() {
	const session = await getSession()

	if (session?.user) {
		redirect("/")
	}

	return <LoginClientPage />
}
