const LABELS = {
  REGISTERED: 'REGISTERED ✅',
  NOT_REGISTERED: 'NOT REGISTERED ❌',
  UNKNOWN: 'UNKNOWN ⚠️'
}

export function formatReport(results, { invalid = [], duplicates = 0 } = {}) {
  const counts = { REGISTERED: 0, NOT_REGISTERED: 0, UNKNOWN: 0 }
  for (const result of results) counts[result.status]++
  const lines = [
    '╭━━━「 WA DETECTOR 」━━━',
    `┃ Total diperiksa : ${results.length}`,
    `┃ Terdaftar       : ${counts.REGISTERED}`,
    `┃ Tidak terdaftar : ${counts.NOT_REGISTERED}`,
    `┃ Tidak pasti     : ${counts.UNKNOWN}`,
    `┃ Duplikat dilewati: ${duplicates}`,
    `┃ Nomor tidak valid: ${invalid.length}`,
    '╰━━━━━━━━━━━━━━━━━━━━'
  ]
  for (const status of Object.keys(LABELS)) {
    lines.push('', `「 ${LABELS[status]} 」`)
    const group = results.filter(result => result.status === status)
    lines.push(...(group.length ? group.map(({ number }) => `├─ ${number}`) : ['╰─ (kosong)']))
    lines.push(`╰─ Total: ${group.length}`)
  }
  if (invalid.length) {
    const shown = invalid.slice(0, 12).map(value => value.slice(0, 32)).join(', ')
    const remainder = invalid.length > 12 ? `, dan ${invalid.length - 12} lainnya` : ''
    lines.push('', `Nomor tidak valid (tidak diperiksa): ${shown}${remainder}`)
  }
  return splitMessage(lines.join('\n'))
}

export function splitMessage(text, maxLength = 3500) {
  const chunks = []
  let current = ''
  for (const line of text.split('\n')) {
    if (current && current.length + line.length + 1 > maxLength) {
      chunks.push(current)
      current = ''
    }
    current += (current ? '\n' : '') + line
  }
  if (current) chunks.push(current)
  return chunks
}
