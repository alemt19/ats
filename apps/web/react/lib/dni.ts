export type DniPrefix = "V" | "E"

export const FOREIGN_DNI_MIN = 80_000_000
export const VENEZUELAN_DNI_MIN = 100_000
export const VENEZUELAN_DNI_MAX = 99_999_999

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function splitDni(rawValue?: string | null): { prefix: DniPrefix; number: string } {
  const raw = String(rawValue ?? "").trim().toUpperCase()

  if (!raw) {
    return { prefix: "V", number: "" }
  }

  const normalized = raw.replace(/[^A-Z0-9]/g, "")
  const firstChar = normalized[0]
  if (firstChar === "V" || firstChar === "E") {
    return {
      prefix: firstChar,
      number: onlyDigits(normalized.slice(1)),
    }
  }

  const number = onlyDigits(normalized)
  if (!number) {
    return { prefix: "V", number: "" }
  }

  const numericValue = Number.parseInt(number, 10)
  const inferredPrefix: DniPrefix = Number.isFinite(numericValue) && numericValue >= FOREIGN_DNI_MIN ? "E" : "V"

  return {
    prefix: inferredPrefix,
    number,
  }
}

export function buildDni(prefix: DniPrefix, numberValue: string): string {
  const digits = onlyDigits(numberValue)

  if (!digits) {
    return ""
  }

  return `${prefix}${digits}`
}

export function validateDni(prefix: DniPrefix, numberValue: string): string | null {
  const digits = onlyDigits(numberValue)

  if (!digits) {
    return "La cédula es obligatoria"
  }

  const numericValue = Number.parseInt(digits, 10)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "Ingresa una cédula válida"
  }

  if (prefix === "V") {
    if (numericValue < VENEZUELAN_DNI_MIN || numericValue > VENEZUELAN_DNI_MAX) {
      return "Para cédulas V, el número debe estar entre 100.000 y 99.999.999"
    }
  }

  if (prefix === "E" && numericValue < FOREIGN_DNI_MIN) {
    return "Para cédulas E, el número debe ser igual o mayor a 80.000.000"
  }

  return null
}

export function formatDniDisplay(rawValue?: string | null): string {
  const { prefix, number } = splitDni(rawValue)

  if (!number) {
    return "-"
  }

  return `${prefix}${number}`
}
