import { redirect } from "next/navigation"

import { getSession } from "../../auth"
import LayoutClient from "./layout-client"

export default async function Layout({ children }: Readonly<{
    children: React.ReactNode
}>) {
    const session = await getSession()

    if (!session?.user) {
        redirect("/login")
    }

    return <LayoutClient>{children}</LayoutClient>
}