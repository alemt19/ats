import type {
  AdminOfferCandidate,
  AdminOfferDetail,
  CandidateStatusOption,
} from "./offer-detail-admin-types"

type ReportCompany = {
  name: string
  logo: string
}

type ReportCandidate = AdminOfferCandidate & {
  dni: string
}

type BuildOfferCandidatesReportPdfParams = {
  offerId: number
  count: number
  company: ReportCompany
  offer: AdminOfferDetail
  statusDisplayName: string
  candidateStatusOptions: CandidateStatusOption[]
  reportFilters: {
    technical: [number, number]
    soft: [number, number]
    culture: [number, number]
    final: [number, number]
  }
}

type CandidateApiResponse = {
  data: {
    id?: number
    dni?: string | null
  }
}

type PaginatedCandidatesResponse = {
  items?: AdminOfferCandidate[]
  total?: number
  page?: number
  pageSize?: number
}

type JobParameterOption = {
  technical_name: string
  display_name: string
}

type JobParameterGroup = {
  technical_name: string
  values: JobParameterOption[]
}

type ReportFilterRow = {
  label: string
  value: string
}

type ReportCandidateRow = {
  candidate: string
  candidateUrl: string
  dni: string
  technical: string
  soft: string
  culture: string
  final: string
  status: string
}

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"
const REPORT_PAGE_SIZE = 100
const JOB_PARAMETERS_PATH = "/data/job_parameters.json"

let jobParameterCache: JobParameterGroup[] | null = null

function formatIsoDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatSalary(value: number) {
  return new Intl.NumberFormat("es-VE", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatScoreRange(range: [number, number]) {
  return `${range[0]}% - ${range[1]}%`
}

function hasActiveReportFilter(range: [number, number]) {
  return range[0] !== 0 || range[1] !== 100
}

function buildReportFilterRows(reportFilters: BuildOfferCandidatesReportPdfParams["reportFilters"]): ReportFilterRow[] {
  const rows: ReportFilterRow[] = []

  if (hasActiveReportFilter(reportFilters.technical)) {
    rows.push({ label: "Puntuación técnica", value: formatScoreRange(reportFilters.technical) })
  }

  if (hasActiveReportFilter(reportFilters.soft)) {
    rows.push({ label: "Puntuación blanda", value: formatScoreRange(reportFilters.soft) })
  }

  if (hasActiveReportFilter(reportFilters.culture)) {
    rows.push({ label: "Alineación cultural", value: formatScoreRange(reportFilters.culture) })
  }

  if (hasActiveReportFilter(reportFilters.final)) {
    rows.push({ label: "Puntuación final", value: formatScoreRange(reportFilters.final) })
  }

  return rows
}

async function loadJobParameters() {
  if (jobParameterCache) {
    return jobParameterCache
  }

  const response = await fetch(JOB_PARAMETERS_PATH)
  if (!response.ok) {
    jobParameterCache = []
    return jobParameterCache
  }

  const payload = (await response.json().catch(() => [])) as JobParameterGroup[]
  jobParameterCache = Array.isArray(payload) ? payload : []
  return jobParameterCache
}

async function getJobParameterDisplayName(
  technicalName: string,
  fallback: string,
  parameterTechnicalName: "workplace_type" | "employment_type"
) {
  const parameters = await loadJobParameters()
  const parameter = parameters.find((item) => item.technical_name === parameterTechnicalName)

  return parameter?.values.find((item) => item.technical_name === technicalName)?.display_name ?? fallback
}

function resolveLogoUrl(logo: string) {
  const value = logo.trim()

  if (!value) {
    return ""
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  ) {
    return value
  }

  if (value.startsWith("/")) {
    return `${BACKEND_BASE_URL}${value}`
  }

  if (value.startsWith("uploads/")) {
    return `${BACKEND_BASE_URL}/${value}`
  }

  return `${BACKEND_BASE_URL}/uploads/company/${value}`
}

async function loadImageAsDataUrl(imageUrl: string) {
  if (!imageUrl) {
    return null
  }

  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function statusLabel(status: string, options: CandidateStatusOption[]) {
  return options.find((option) => option.technical_name === status)?.display_name ?? status
}

function extractReadableValue<T extends { name: string; is_mandatory?: boolean }>(
  items: T[] | undefined
) {
  if (!items?.length) {
    return ""
  }

  return items
    .map((item) => (item.is_mandatory ? `${item.name} (obligatoria)` : item.name))
    .join(", ")
}

async function fetchAllCandidates(
  offerId: number,
  reportFilters: BuildOfferCandidatesReportPdfParams["reportFilters"]
) {
  const allCandidates: AdminOfferCandidate[] = []
  let total = 0
  let page = 1

  while (allCandidates.length < total || page === 1) {
    const searchParams = new URLSearchParams({
      search: "",
      technical_min: String(reportFilters.technical[0]),
      technical_max: String(reportFilters.technical[1]),
      soft_min: String(reportFilters.soft[0]),
      soft_max: String(reportFilters.soft[1]),
      culture_min: String(reportFilters.culture[0]),
      culture_max: String(reportFilters.culture[1]),
      final_min: String(reportFilters.final[0]),
      final_max: String(reportFilters.final[1]),
      status: "all",
      page: String(page),
      pageSize: String(REPORT_PAGE_SIZE),
    })

    const response = await fetch(`/api/admin/ofertas/${offerId}/candidatos?${searchParams.toString()}`)
    if (!response.ok) {
      throw new Error("No se pudieron cargar las postulaciones para el reporte")
    }

    const payload = (await response.json()) as PaginatedCandidatesResponse
    const pageItems = Array.isArray(payload.items) ? payload.items : []

    allCandidates.push(...pageItems)
    total = typeof payload.total === "number" ? payload.total : allCandidates.length

    if (pageItems.length < REPORT_PAGE_SIZE) {
      break
    }

    page += 1
  }

  return allCandidates.slice(0, total)
}

async function fetchCandidateDni(candidateId: string) {
  const numericId = Number(candidateId)

  if (!Number.isFinite(numericId) || numericId <= 0) {
    return ""
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/candidates/${numericId}`)
    
    if (!response.ok) {
      return ""
    }

    const payload = (await response.json().catch(() => null)) as CandidateApiResponse | null
    const res = typeof payload?.data.dni === "string" ? payload.data.dni.trim() : ""; 
    return res
  } catch {
    return ""
  }
}

function buildSkillLine(items: Array<{ name: string; is_mandatory?: boolean }> | undefined) {
  return extractReadableValue(items)
}

function buildCandidateDetailUrl(offerId: number, applicationId: string) {
  return `${window.location.origin}/admin/ofertas/${offerId}/candidatos/${applicationId}`
}

export async function buildOfferCandidatesReportPdf({
  offerId,
  count,
  company,
  offer,
  statusDisplayName,
  candidateStatusOptions,
  reportFilters,
}: BuildOfferCandidatesReportPdfParams) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableModule.default

  const allCandidates = await fetchAllCandidates(offerId, reportFilters)
  const topCandidates = [...allCandidates]
    .sort((left, right) => {
      if (right.final_score !== left.final_score) {
        return right.final_score - left.final_score
      }

      if (right.technical_score !== left.technical_score) {
        return right.technical_score - left.technical_score
      }

      if (right.soft_score !== left.soft_score) {
        return right.soft_score - left.soft_score
      }

      return right.culture_score - left.culture_score
    })
    .slice(0, Math.max(1, count))

  if (!topCandidates.length) {
    throw new Error("No hay postulaciones para generar el reporte")
  }

  const candidateDetails = await Promise.all(
    topCandidates.map(async (candidate) => ({
      candidateId: candidate.candidate_id,
      dni: await fetchCandidateDni(candidate.candidate_id),
    }))
  )
  const dniByCandidateId = new Map(candidateDetails.map((entry) => [entry.candidateId, entry.dni]))
  const reportCandidateRows: ReportCandidateRow[] = topCandidates.map((candidate) => ({
    candidate: `${candidate.first_name} ${candidate.last_name}`.trim(),
    candidateUrl: buildCandidateDetailUrl(offerId, candidate.application_id),
    dni: dniByCandidateId.get(candidate.candidate_id) || "-",
    technical: formatPercent(candidate.technical_score),
    soft: formatPercent(candidate.soft_score),
    culture: formatPercent(candidate.culture_score),
    final: formatPercent(candidate.final_score),
    status: statusLabel(candidate.status, candidateStatusOptions),
  }))
  const workplaceTypeLabel = await getJobParameterDisplayName(
    offer.workplace_type,
    offer.workplace_type,
    "workplace_type"
  )
  const employmentTypeLabel = await getJobParameterDisplayName(
    offer.employment_type,
    offer.employment_type,
    "employment_type"
  )
  const dateLabel = formatIsoDateTime()
  const companyLogoUrl = resolveLogoUrl(company.logo)
  const companyLogoDataUrl = companyLogoUrl ? await loadImageAsDataUrl(companyLogoUrl) : null

  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2

  let cursorY = 18

  if (companyLogoDataUrl) {
    try {
      doc.addImage(companyLogoDataUrl, "PNG", marginX, 12, 26, 18)
    } catch {
      // If the logo format is not supported, continue without it.
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(company.name || "Empresa", companyLogoDataUrl ? marginX + 32 : marginX, 18)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.text(`Reporte generado: ${dateLabel}`, companyLogoDataUrl ? marginX + 32 : marginX, 24)

  cursorY = 34
  doc.setDrawColor(225, 229, 235)
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY)
  cursorY += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Reporte de postulaciones", marginX, cursorY)
  cursorY += 8

  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.text(`Oferta: ${offer.title}`, marginX, cursorY)
  cursorY += 6

  const offerSummaryRows = [
    ["Puesto", offer.position || "-"],
    ["Descripción", offer.description || "-"],
    ["Estado", `${statusDisplayName} (${offer.status})`],
    ["Salario", formatSalary(offer.salary)],
    ["Estado / Ciudad", [offer.state, offer.city].filter(Boolean).join(", ") || "-"],
    ["Dirección", offer.address || "-"],
    ["Modalidad de trabajo", workplaceTypeLabel || "-"],
    ["Tipo de empleo", employmentTypeLabel || "-"],
    ["Categoría", offer.category || "-"],
  ]

  if (offer.min_years_required != null) {
    offerSummaryRows.push(["Años mínimos requeridos", String(offer.min_years_required)])
  }

  offerSummaryRows.push(
    ["Pesos de evaluación", `Técnica ${formatPercent(offer.weight_technical * 100)}, Blanda ${formatPercent(offer.weight_soft * 100)}, Cultural ${formatPercent(offer.weight_culture * 100)}`],
  )

  const technicalSkills = buildSkillLine(offer.technical_skill_items)
  const softSkills = buildSkillLine(offer.soft_skill_items)
  const credentials = Array.isArray(offer.credentials) ? offer.credentials.filter((value) => value.trim().length > 0).join(", ") : ""

  if (technicalSkills) {
    offerSummaryRows.push(["Habilidades técnicas", technicalSkills])
  }

  if (softSkills) {
    offerSummaryRows.push(["Habilidades blandas", softSkills])
  }

  if (credentials) {
    offerSummaryRows.push(["Credenciales profesionales", credentials])
  }

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 13,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [242, 244, 248],
      textColor: [30, 41, 59],
      fontStyle: "bold",
    },
    body: offerSummaryRows,
    columns: [
      { header: "Dato", dataKey: "label" },
      { header: "Valor", dataKey: "value" },
    ],
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rowIndex = hookData.row.index
        if (hookData.column.index === 0) {
          hookData.cell.text = [offerSummaryRows[rowIndex]?.[0] ?? ""]
        } else if (hookData.column.index === 1) {
          hookData.cell.text = doc.splitTextToSize(String(offerSummaryRows[rowIndex]?.[1] ?? ""), contentWidth - 60)
        }
      }
    },
  })

  const afterSummaryY = (doc as typeof doc & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY

  const reportFilterRows = buildReportFilterRows(reportFilters)
  let tableStartY = afterSummaryY + 10

  if (reportFilterRows.length) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(17)
    doc.text("Filtros aplicados al reporte", marginX, tableStartY)

    autoTable(doc, {
      startY: tableStartY + 4,
      theme: "grid",
      margin: { left: marginX, right: marginX },
        styles: {
          font: "helvetica",
          fontSize: 13,
          cellPadding: 3,
          valign: "middle",
        },
      headStyles: {
        fillColor: [242, 244, 248],
        textColor: [30, 41, 59],
        fontStyle: "bold",
      },
      body: reportFilterRows,
      columns: [
        { header: "Filtro", dataKey: "label" },
        { header: "Rango", dataKey: "value" },
      ],
      didParseCell: (hookData) => {
        if (hookData.section === "body") {
          const rowIndex = hookData.row.index
          if (hookData.column.index === 0) {
            hookData.cell.text = [reportFilterRows[rowIndex]?.label ?? ""]
          } else if (hookData.column.index === 1) {
            hookData.cell.text = [reportFilterRows[rowIndex]?.value ?? ""]
          }
        }
      },
    })

    const afterFiltersY =
      (doc as typeof doc & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? tableStartY
    tableStartY = afterFiltersY + 10
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  doc.text(`Top ${topCandidates.length} postulaciones`, marginX, tableStartY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.text("Los nombres de candidato son enlaces al detalle de la postulación.", marginX, tableStartY + 5)
  autoTable(doc, {
    startY: tableStartY + 8,
    theme: "striped",
    margin: { left: marginX, right: marginX },
    styles: {
      font: "helvetica",
      fontSize: 12,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columns: [
      { header: "Candidato", dataKey: "candidate" },
      { header: "Cédula", dataKey: "dni" },
      { header: "Técnica", dataKey: "technical" },
      { header: "Blanda", dataKey: "soft" },
      { header: "Cultural", dataKey: "culture" },
      { header: "Final", dataKey: "final" },
      { header: "Estado", dataKey: "status" },
    ],
    body: reportCandidateRows,
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const rowIndex = hookData.row.index

        if (hookData.column.index === 0) {
          hookData.cell.text = [reportCandidateRows[rowIndex]?.candidate ?? ""]
          hookData.cell.styles.textColor = [37, 99, 235]
          hookData.cell.styles.fontStyle = "bold"
        } else if (hookData.column.index === 1) {
          hookData.cell.text = [reportCandidateRows[rowIndex]?.dni ?? ""]
        }
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 0) {
        const rowIndex = hookData.row.index
        const candidateUrl = reportCandidateRows[rowIndex]?.candidateUrl

        if (candidateUrl) {
          doc.link(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height, {
            url: candidateUrl,
          })
        }
      }
    },
  })

  doc.save(`postulaciones-${offerId}-${Date.now()}.pdf`)
}