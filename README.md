# WhatsApp Number Detector

Bot lokal Node.js + Baileys untuk memeriksa status nomor melalui `/detect`. Implementasi menggunakan `sock.onWhatsApp()` dari Baileys 6.7.23. Ini library tidak resmi dan dapat berubah sewaktu-waktu; gunakan secara bertanggung jawab. Tidak ada pesan yang dikirim ke nomor yang diperiksa.

## Instalasi di Termux

```sh
pkg update && pkg upgrade
pkg install nodejs
mkdir -p ~/wa-detector
cd ~/wa-detector
```

Salin seluruh isi proyek ini ke `~/wa-detector`, lalu:

```sh
npm install
cp .env.example .env
nano .env
npm test
npm start
```

Pindai QR yang tampil di terminal melalui WhatsApp > Perangkat tertaut > Tautkan perangkat. Sesi disimpan di `auth_info/`; jangan membagikan folder tersebut. Jika WhatsApp benar-benar logout, hapus folder sesi secara manual setelah memastikan logout, lalu jalankan kembali untuk QR baru.

## Pemakaian

Kirim `/detect` di chat pribadi bot diikuti daftar nomor format internasional tanpa awalan `00`, misalnya `6281234567890`. Pemisah baris, spasi, koma atau titik koma diterima. Command hanya diizinkan untuk nomor pengirim yang dicantumkan pada `ALLOWED_SENDERS` sebagai digit internasional. Jika tidak dikonfigurasi, command ditolak.

Hasil hanya menyatakan `REGISTERED` atau `NOT_REGISTERED` saat respons API memiliki nomor/JID yang cocok dan field `exists` boolean eksplisit. Respons hilang, tidak cocok, timeout, kegagalan koneksi, atau nilai status lain diklasifikasikan `UNKNOWN`, tidak disimpulkan tidak terdaftar. Catatan khusus Baileys 6.7.23: implementasi `onWhatsApp()` memfilter respons ke entri dengan `contact` bernilai truthy, sehingga biasanya tidak mengembalikan entri `exists: false`; akibatnya status `NOT_REGISTERED` tidak dapat dipastikan lewat API ini dan sebagian besar nomor yang tidak ada di respons menjadi `UNKNOWN`. Ini disengaja agar bot tidak mengarang hasil.

Pemeriksaan berjalan serial, dengan jeda dan batas jumlah nomor. Pembatasan otomatis WhatsApp dapat menyebabkan kegagalan atau pemutusan. Hentikan penggunaan jika muncul peringatan/pembatasan; bot tidak mencoba menghindarinya.

## Konfigurasi

Salin `.env.example` ke `.env`. `ALLOWED_SENDERS` wajib diatur sebagai daftar nomor pengirim dipisah koma. Sesuaikan `MAX_NUMBERS`, `CHECK_DELAY_MS`, `CHECK_TIMEOUT_MS`, dan `MAX_COMMANDS_PER_MINUTE` bila diperlukan. `.env` dan data sesi tidak boleh dimasukkan ke git.

## Batasan dan pemecahan masalah

API `onWhatsApp()` tidak merupakan kontrak resmi WhatsApp dan dapat dibatasi, berubah, atau tidak tersedia. Implementasi tidak mengirim otomatis ke nomor sasaran. Bila pemeriksaan API tidak ada di versi yang dijalankan, bot memberi pesan bahwa fitur tidak tersedia. Tidak ada jaminan operasi massal aman; gunakan batch kecil untuk tujuan yang sah dan patuhi aturan WhatsApp.

Gunakan Node.js 20 atau lebih baru. Baileys 6.7.23 mensyaratkan Node >=20. Bila sesi kadaluarsa, periksa terminal; jangan hapus data sesi untuk error koneksi sementara. Reconnect otomatis hanya untuk pemutusan non-logout dan hanya satu socket dibuat setiap saat.
