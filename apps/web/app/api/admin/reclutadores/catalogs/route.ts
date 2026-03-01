import { NextResponse } from "next/server"

import { getRecruitersCatalogsServer } from "../../../../admin/(public)/reclutadores/recruiters-admin-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const catalogs = await getRecruitersCatalogsServer()
  return NextResponse.json(catalogs)
}
