export const LEGAL_AGE = 18

function formatIsoDate(date: Date) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getMaximumBirthDateIso(minimumAge = LEGAL_AGE, referenceDate = new Date()) {
  const cutoffDate = new Date(
    referenceDate.getFullYear() - minimumAge,
    referenceDate.getMonth(),
    referenceDate.getDate()
  )

  return formatIsoDate(cutoffDate)
}

export function isAtLeastMinimumAge(
  birthDateIso: string,
  minimumAge = LEGAL_AGE,
  referenceDate = new Date()
) {
  const normalizedBirthDate = birthDateIso.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
    return false
  }

  return normalizedBirthDate <= getMaximumBirthDateIso(minimumAge, referenceDate)
}