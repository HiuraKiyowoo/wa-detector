const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/

export function parseNumbers(text) {
  const body = text.replace(/^\s*\/detect\b/i, '')
  const tokens = body.split(/[\s,;]+/).map(token => token.trim()).filter(Boolean)
  const valid = []
  const invalid = []
  const seen = new Set()
  let duplicates = 0

  for (const token of tokens) {
    const normalized = token.replace(/[().-]/g, '')
    if (!PHONE_PATTERN.test(normalized)) {
      invalid.push(token)
      continue
    }
    const number = normalized.replace(/^\+/, '')
    if (seen.has(number)) {
      duplicates++
      continue
    }
    seen.add(number)
    valid.push(number)
  }
  return { numbers: valid, invalid, duplicates }
}

export function isDetectCommand(text) {
  return /^\s*\/detect(?:\s|$)/i.test(text)
}
