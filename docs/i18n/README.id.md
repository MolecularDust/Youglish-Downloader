<!-- languages:start -->
<div align="center">

<details>
<summary><b>🌐 Language · Idioma · Langue · Sprache · Язык · 语言 · 言語 · 언어 · भाषा · لغة</b></summary>
<br>

<table>
  <tr>
    <td align="center"><a href="../../README.md">English</a></td>
    <td align="center"><a href="README.ar.md">العربية</a></td>
    <td align="center"><a href="README.bn.md">বাংলা</a></td>
    <td align="center"><a href="README.zh-Hans.md">简体中文</a></td>
    <td align="center"><a href="README.fil.md">Filipino</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.fr.md">Français</a></td>
    <td align="center"><a href="README.de.md">Deutsch</a></td>
    <td align="center"><a href="README.hi.md">हिन्दी</a></td>
    <td align="center"><b>Bahasa Indonesia</b></td>
    <td align="center"><a href="README.it.md">Italiano</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.ja.md">日本語</a></td>
    <td align="center"><a href="README.ko.md">한국어</a></td>
    <td align="center"><a href="README.fa.md">فارسی</a></td>
    <td align="center"><a href="README.pt-BR.md">Português (Brasil)</a></td>
    <td align="center"><a href="README.ru.md">Русский</a></td>
  </tr>
  <tr>
    <td align="center"><a href="README.es.md">Español</a></td>
    <td align="center"><a href="README.te.md">తెలుగు</a></td>
    <td align="center"><a href="README.th.md">ไทย</a></td>
    <td align="center"><a href="README.tr.md">Türkçe</a></td>
    <td align="center"><a href="README.vi.md">Tiếng Việt</a></td>
  </tr>
</table>

</details>

</div>
<!-- languages:end -->

# YouGlish Downloader

### 🎧 Dengarkan. Potong. Simpan momennya.

**Temukan kata atau frasa apa pun dalam ucapan nyata, lalu simpan klip yang tepat.** YouGlish Downloader memadukan pencarian pelafalan YouGlish dengan pemotong klip di desktop, sehingga Anda bisa mencari frasa dalam bahasa dan aksen pilihan Anda, mendengar bagaimana orang benar-benar mengucapkannya dalam konteks, dan mengunduh momen yang Anda butuhkan saja.

- 🎓 **Pembelajar bahasa:** dengarkan orang sungguhan mengucapkannya dalam percakapan nyata, bukan sekadar rekaman buku teks.
- 👩‍🏫 **Guru:** buat klip contoh siap putar untuk kelas, disesuaikan dengan pelajaran Anda.
- 🔎 **Siapa pun yang mencari frasa:** temukan di mana frasa itu diucapkan di YouTube, dalam bahasa yang Anda pilih, dan simpan momen itu saja.

Unduh hanya konten yang Anda miliki atau yang Anda punya izin untuk mengunduhnya.

![Aplikasi YouGlish Downloader: cari frasa, potong klip, dan tambahkan ke antrean unduhan](../images/app-preview.webp)

Fork desktop dari TubeCutter untuk mencari contoh ucapan secara manual dengan widget YouGlish resmi. Proyek ini memiliki pengenal aplikasi dan preferensi sendiri.

## Unduh

- **Windows:** [Unduh rilis terbaru](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Pilih instalasi biasa atau salinan portabel.
- **macOS (Apple silicon):** [Unduh rilis macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Siapkan akses YouTube

1. Buka aplikasi dan klik **Account & Settings**.
2. Di bawah **YouGlish playback account**, klik **1. Sign in to Google ↗**, lalu **2. Connect YouTube ↗**, dan pilih kanal Anda jika diminta. Tutup jendela akun setelah selesai. **Check playback ↗** memutar video contoh untuk memastikan semuanya berfungsi.
3. Di bawah **Subtitle and download authentication**, pilih **App’s YouTube session** untuk **Download authentication**.

Anda siap menggunakan YouGlish Downloader.

Untuk memakai peramban yang sudah Anda masuki, pilih peramban itu di bawah **Download authentication**. Di Windows, tutup peramban itu sebelum mencari: peramban berbasis Chromium mengunci berkas cookie-nya saat berjalan, jadi sesi aplikasi sendiri adalah pilihan yang andal di sana. Gunakan hanya akun Anda sendiri. Jangan mengimpor atau membagikan cookie milik orang lain.

Anda juga bisa tetap menggunakan **Anonymous**, tetapi pemeriksaan anti-bot YouTube lebih ketat untuk akses anonim, dan beberapa video akan gagal.

## Penggunaan

Buka `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` setelah membangun, atau jalankan `npm run desktop` untuk pengembangan.

1. Masukkan frasa pencarian, bahasa, dan aksen opsional, lalu Cari. Bahasa Inggris dengan semua aksen adalah bawaan.
2. Telusuri dan dengarkan di YouGlish. Keterangan sampel yang dipilih mengisi File Name dan tetap di sana selama pemutaran berjalan.
3. Ubah File Name menjadi frasa dari subtitle video. Klik **Look Up** atau tekan Enter. Mengedit atau meninggalkan kolom tidak memulai pencarian. Tombol menampilkan spinner sampai pencocokan berhasil atau gagal. Teks ini juga menjadi nama berkas keluaran (wadah menambahkan ekstensinya).
4. Subtitle yang disediakan diutamakan. Hanya keterangan otomatis asli yang tidak diterjemahkan yang dipakai sebagai cadangan. Pencocokan mengabaikan huruf besar-kecil, tanda baca, dan gaya apostrof; pencocokan mencakup cue yang berdampingan dan menghapus teks bergulir yang tumpang-tindih.
5. Saat memilih video, In/Out awalnya diatur ke nol dan durasi video penuh. Satu kecocokan mengatur In/Out ke batas segmen subtitle yang memuatnya, tanpa padding. Beberapa kecocokan mengharuskan memilih satu kemunculan. Tanpa kecocokan, waktu yang ada tidak berubah. Ini batas segmen subtitle, bukan penyelarasan akustik tingkat kata.
6. Gunakan panah kecil untuk mengubah salah satu batas atau panjang tepat satu detik. **Reset** mengembalikan seluruh video dan menghapus input tidak valid serta galat validasi. Batas yang tidak valid ditolak. Anda juga bisa mengetik stempel waktu langsung, mengetik Length (durasi klip berpadding yang ditampilkan di kolom; Out menyesuaikan), menyeret linimasa, atau memakai **Preview selection**.
7. **Preview selection** sementara mengganti area widget dengan pemutar YouTube bawaan untuk pencarian posisi yang akurat. **Back to YouGlish results** kembali ke penelusuran. **Set In** dan **Set Out** memerlukan pratinjau ini karena YouGlish tidak menyediakan posisi playhead absolut yang terdokumentasi.
8. Pengaturan unduhan awalnya diciutkan. Resolusi bawaan adalah yang tertinggi tersedia hingga 1080p. Saat mengunduh, permintaan 1080p juga mengizinkan resolusi sumber yang lebih rendah jika tersedia. Resolusi lain yang dipilih tetap tepat.
9. Pilih folder tujuan dan tambahkan pilihan ke antrean unduhan berurutan yang diwariskan. **Precise Cut**, jeda/lanjut/batal/coba lagi, penyematan subtitle, dan tampilkan di Finder tetap tersedia.

**Account & Settings** bawaannya anonim. Peramban yang didukung dan terpasang dikenali di lokasi aplikasi macOS yang biasa. Jika Anda memilih salah satu, yt-dlp dapat membaca penyimpanan cookie lokalnya untuk subtitle dan unduhan; cookie tidak disuntikkan ke YouGlish atau disimpan di pengaturan. Widget memakai sesi WebView-nya sendiri. Preferensi aplikasi dan identitas antrean terpisah dari TubeCutter.

## Bahasa

Antarmuka aplikasi tersedia dalam bahasa Inggris dan 19 bahasa lainnya: Arab, Bengali, Tionghoa (Sederhana), Filipino, Prancis, Jerman, Hindi, Indonesia, Italia, Jepang, Korea, Persia, Portugis (Brasil), Rusia, Spanyol, Telugu, Thai, Turki, dan Vietnam. Secara bawaan mengikuti bahasa sistem. Untuk memilih bahasa lain, buka **Account & Settings → Language**; pilihan langsung berlaku dan diingat. Bahasa Arab dan Persia ditata dari kanan ke kiri.

Terjemahan disimpan di `src/locales/<code>.json`, dan teks Inggris berfungsi sebagai kunci. Lihat [catatan lokalisasi](../LOCALIZATION.md) untuk cara menambah atau memperbaiki terjemahan.

## Pengembangan

Catatan build hanya dalam bahasa Inggris: lihat [README bahasa Inggris](../../README.md#development).
