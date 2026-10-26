import test from 'node:test'
import assert from 'node:assert/strict'
import { parseNumbers, isDetectCommand } from '../src/utils/phone.js'
import { classifyLookup, detectNumbers } from '../src/commands/detect.js'
import { formatReport, splitMessage } from '../src/utils/formatter.js'

test('parser membersihkan nomor, membuang duplikat dan mengidentifikasi invalid', () => {
  const parsed = parseNumbers('/detect\n+62812345678, 62812345678\nabc')
  assert.deepEqual(parsed.numbers, ['62812345678'])
  assert.equal(parsed.duplicates, 1)
  assert.deepEqual(parsed.invalid, ['abc'])
})

test('command harus cocok pada awal pesan', () => {
  assert.equal(isDetectCommand(' /detect\n62812345678'), true)
  assert.equal(isDetectCommand('hello /detect'), false)
})

test('classifier hanya menerima respons eksplisit untuk nomor yang diminta', () => {
  assert.equal(classifyLookup([{ jid: '62812345678@s.whatsapp.net', exists: true }], '62812345678'), 'REGISTERED')
  assert.equal(classifyLookup([{ jid: '62812345678@s.whatsapp.net', exists: false }], '62812345678'), 'NOT_REGISTERED')
  assert.equal(classifyLookup([], '62812345678'), 'UNKNOWN')
  assert.equal(classifyLookup([{ jid: '62812345678@s.whatsapp.net' }], '62812345678'), 'UNKNOWN')
  assert.equal(classifyLookup([{ jid: '62800000000@s.whatsapp.net', exists: false }], '62812345678'), 'UNKNOWN')
})

test('detector serial mengklasifikasi kegagalan sebagai UNKNOWN', async () => {
  const sock = { onWhatsApp: async n => n === '62812345678' ? [{ jid: `${n}@s.whatsapp.net`, exists: true }] : [] }
  const result = await detectNumbers(sock, ['62812345678', '62812345679'], { delayMs: 500 })
  assert.deepEqual(result.map(item => item.status), ['REGISTERED', 'UNKNOWN'])
})

test('API hilang menghasilkan error khusus, bukan status palsu', async () => {
  await assert.rejects(detectNumbers({}, ['62812345678']), { code: 'API_UNAVAILABLE' })
})

test('formatter menjaga statistik berdasarkan hasil aktual dan memecah pesan panjang', () => {
  const report = formatReport([
    { number: '62812345678', status: 'REGISTERED' },
    { number: '62812345679', status: 'UNKNOWN' }
  ])
  assert.match(report[0], /Terdaftar\s+: 1/)
  assert.match(report[0], /Tidak pasti\s+: 1/)
  assert.equal(splitMessage('one\ntwo\nthree', 7).length, 2)
})
