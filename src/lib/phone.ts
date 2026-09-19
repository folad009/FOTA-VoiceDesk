const NIGERIAN_MOBILE_PREFIXES = new Set([
  "701",
  "702",
  "703",
  "704",
  "705",
  "706",
  "707",
  "708",
  "709",
  "802",
  "803",
  "804",
  "805",
  "806",
  "807",
  "808",
  "809",
  "810",
  "811",
  "812",
  "813",
  "814",
  "815",
  "816",
  "817",
  "818",
  "819",
  "901",
  "902",
  "903",
  "904",
  "905",
  "906",
  "907",
  "908",
  "909",
  "911",
  "912",
  "913",
  "914",
  "915",
  "916",
  "917",
  "918",
  "919",
])

export function parseNigerianPhone(input: string): string | null {
  const compact = compactPhoneInput(input)
  if (!compact) {
    return null
  }

  let candidate = compact
  if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`
  }
  if (/^0[789]\d{9}$/.test(candidate)) {
    candidate = `+234${candidate.slice(1)}`
  } else if (/^[789]\d{9}$/.test(candidate)) {
    candidate = `+234${candidate}`
  } else if (/^2340?\d{10}$/.test(candidate)) {
    candidate = `+${candidate}`
  }

  if (/^\+2340\d{10}$/.test(candidate)) {
    candidate = `+234${candidate.slice(5)}`
  }

  return isValidNigerianE164(candidate) ? candidate : null
}

export function isValidNigerianE164(value: string): boolean {
  const match = /^\+234(\d{10})$/.exec(value)
  if (!match?.[1]) {
    return false
  }
  return NIGERIAN_MOBILE_PREFIXES.has(match[1].slice(0, 3))
}

export function maskPhone(value: string): string {
  if (!isValidNigerianE164(value)) {
    return "Invalid number"
  }
  const nsn = value.slice(4)
  return `+234 ${nsn.slice(0, 3)} *** ${nsn.slice(-4)}`
}

export function formatNationalNigerianPhone(value: string): string {
  if (!isValidNigerianE164(value)) {
    return value
  }
  const nsn = value.slice(4)
  return `0${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`
}

function compactPhoneInput(input: string): string {
  return input.replace(/[^\d+]/g, "")
}
