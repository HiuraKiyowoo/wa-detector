import 'dotenv/config'

const positiveInt = (name, fallback, min = 1, max = 1000) => {
  const parsed = Number.parseInt(process.env[name] ?? String(fallback), 10)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

export const config = Object.freeze({
  authDir: process.env.AUTH_DIR || './auth_info',
  maxNumbers: positiveInt('MAX_NUMBERS', 30, 1, 100),
  delayMs: positiveInt('CHECK_DELAY_MS', 1500, 500, 60000),
  requestTimeoutMs: positiveInt('CHECK_TIMEOUT_MS', 15000, 1000, 120000),
  allowedSenders: (process.env.ALLOWED_SENDERS || '')
    .split(',').map(value => value.replace(/\D/g, '')).filter(Boolean),
  maxUsesPerMinute: positiveInt('MAX_COMMANDS_PER_MINUTE', 3, 1, 60)
})
