import { setTimeout as sleep } from 'node:timers/promises'
import { config } from '../config.js'

export function classifyLookup(response, requestedNumber) {
  if (!Array.isArray(response)) return 'UNKNOWN'
  const item = response.find(entry => {
    const jidNumber = typeof entry?.jid === 'string' ? entry.jid.split('@')[0] : ''
    return jidNumber === requestedNumber
  })
  if (!item || typeof item.exists !== 'boolean') return 'UNKNOWN'
  return item.exists ? 'REGISTERED' : 'NOT_REGISTERED'
}

export async function detectNumbers(sock, numbers, { delayMs = config.delayMs, timeoutMs = config.requestTimeoutMs, signal } = {}) {
  const results = []
  for (let index = 0; index < numbers.length; index++) {
    if (signal?.aborted) {
      for (const number of numbers.slice(index)) results.push({ number, status: 'UNKNOWN' })
      break
    }
    const number = numbers[index]
    let status = 'UNKNOWN'
    try {
      if (typeof sock.onWhatsApp !== 'function') {
        const error = new Error('API onWhatsApp tidak tersedia pada socket Baileys ini.')
        error.code = 'API_UNAVAILABLE'
        throw error
      }
      let timeout
      const response = await Promise.race([
        sock.onWhatsApp(number),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(Object.assign(new Error('Pemeriksaan melewati batas waktu.'), { code: 'TIMEOUT' })), timeoutMs)
        })
      ]).finally(() => clearTimeout(timeout))
      status = classifyLookup(response, number)
    } catch (error) {
      if (error.code === 'API_UNAVAILABLE') throw error
      if (error.code === 'RATE_LIMIT' || /rate.?limit|too many|429/i.test(error.message || '')) {
        for (const pending of numbers.slice(index)) results.push({ number: pending, status: 'UNKNOWN' })
        break
      }
    }
    results.push({ number, status })
    if (index < numbers.length - 1) await sleep(delayMs, undefined, { signal }).catch(() => {})
  }
  return results
}

export function validateBatchSize(numbers) {
  return numbers.length <= config.maxNumbers
}
