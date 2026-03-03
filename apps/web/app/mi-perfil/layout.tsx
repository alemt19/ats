import { redirect } from "next/navigation"

import { hasAuthAccess } from "../../auth"
import LayoutClient from "./layout-client"

export default async function Layout({ children }: Readonly<{
    children: React.ReactNode
}>) {
    const canAccessCandidateArea = await hasAuthAccess("candidate")
    console.log("canAccessCandidateArea", canAccessCandidateArea)
    if (!canAccessCandidateArea) {
        redirect("/login")
    }

    return <LayoutClient>{children}</LayoutClient>
}