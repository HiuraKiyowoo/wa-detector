import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import { Boom } from '@hapi/boom'
import { config } from './config.js'
import { isDetectCommand, parseNumbers } from './utils/phone.js'
import { detectNumbers } from './commands/detect.js'
import { formatReport } from './utils/formatter.js'

const logger = P({ level: process.env.LOG_LEVEL || 'warn' })
const usageBySender = new Map()
let activeSocket = null
let reconnectTimer = null
let connecting = false
let shuttingDown = false

function messageText(message) {
  const content = message.message
  return content?.conversation || content?.extendedTextMessage?.text || ''
}

function senderNumber(message) {
  const address = message.key.participant || message.key.remoteJid || ''
  return address.split('@')[0].split(':')[0].replace(/\D/g, '')
}

function allowUse(sender) {
  if (!config.allowedSenders.length || !config.allowedSenders.includes(sender)) return false
  const now = Date.now()
  const recent = (usageBySender.get(sender) || []).filter(time => now - time < 60_000)
  if (recent.length >= config.maxUsesPerMinute) return false
  recent.push(now)
  usageBySender.set(sender, recent)
  return true
}

async function connect() {
  if (connecting || shuttingDown) return
  connecting = true
  try {
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
    const { version } = await fetchLatestBaileysVersion()
    console.log(`Memakai versi WhatsApp Web ${version.join('.')}.`)
    const sock = makeWASocket({ auth: state, version, logger, printQRInTerminal: false, connectTimeoutMs: 30_000 })
    activeSocket = sock
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        console.log('Pindai QR berikut melalui WhatsApp > Perangkat tertaut:')
        qrcode.generate(qr, { small: true })
      }
      if (connection === 'open') console.log('Terhubung ke WhatsApp.')
      if (connection === 'close') {
        if (activeSocket === sock) activeSocket = null
        const disconnectError = lastDisconnect?.error
        const code = (disconnectError instanceof Boom ? disconnectError.output?.statusCode : disconnectError?.output?.statusCode)
        const detail = {
          statusCode: code,
          message: disconnectError?.message,
          reason: disconnectError?.data?.reason,
          location: disconnectError?.data?.location
        }
        console.error('Detail koneksi terputus:', JSON.stringify(detail))
        if (code === DisconnectReason.loggedOut) {
          console.error('Sesi telah logout. Data sesi dipertahankan; untuk login ulang, logout perangkat ini lalu hapus auth_info secara manual.')
          return
        }
        if (!shuttingDown && !reconnectTimer) {
          console.warn('Koneksi terputus; mencoba kembali dalam 5 detik.')
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null
            connect().catch(error => logger.error({ err: error }, 'Reconnect gagal'))
          }, 5000)
        }
      }
    })
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const message of messages) {
        if (!message.message || message.key.fromMe) continue
        const text = messageText(message)
        if (!isDetectCommand(text)) continue
        const chatId = message.key.remoteJid
        const sender = senderNumber(message)
        if (!allowUse(sender)) {
          await sock.sendMessage(chatId, { text: config.allowedSenders.length ? 'Akses ditolak atau batas penggunaan per menit tercapai.' : 'Command dinonaktifkan: atur ALLOWED_SENDERS pada .env terlebih dahulu.' }).catch(() => {})
          continue
        }
        const parsed = parseNumbers(text)
        if (parsed.numbers.length === 0) {
          await sock.sendMessage(chatId, { text: 'Tidak ada nomor valid. Kirim /detect lalu nomor format internasional.' }).catch(() => {})
          continue
        }
        if (parsed.numbers.length > config.maxNumbers) {
          await sock.sendMessage(chatId, { text: `Batas ${config.maxNumbers} nomor per permintaan. Kirim daftar yang lebih kecil.` }).catch(() => {})
          continue
        }
        await sock.sendMessage(chatId, { text: `Memeriksa ${parsed.numbers.length} nomor secara bertahap. Respons yang tidak tegas akan dilaporkan sebagai UNKNOWN.` }).catch(() => {})
        try {
          const results = await detectNumbers(sock, parsed.numbers)
          for (const part of formatReport(results, parsed)) await sock.sendMessage(chatId, { text: part })
        } catch (error) {
          const notice = error.code === 'API_UNAVAILABLE'
            ? 'Fitur pemeriksaan tidak tersedia: API onWhatsApp tidak ditemukan pada koneksi Baileys ini. Tidak ada hasil yang dibuat.'
            : 'Pemeriksaan gagal karena koneksi atau API tidak tersedia. Tidak ada nomor yang dianggap tidak terdaftar.'
          await sock.sendMessage(chatId, { text: notice }).catch(sendError => logger.warn({ err: sendError }, 'Gagal mengirim pesan kegagalan'))
          logger.warn({ err: error }, 'Pemeriksaan gagal')
        }
      }
    })
  } finally {
    connecting = false
  }
}

async function shutdown() {
  shuttingDown = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (activeSocket) activeSocket.end(new Error('Proses dihentikan'))
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
connect().catch(error => {
  logger.error({ err: error }, 'Gagal memulai bot')
  process.exitCode = 1
})
