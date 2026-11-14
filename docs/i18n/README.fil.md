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
    <td align="center"><b>Filipino</b></td>
  </tr>
  <tr>
    <td align="center"><a href="README.fr.md">Français</a></td>
    <td align="center"><a href="README.de.md">Deutsch</a></td>
    <td align="center"><a href="README.hi.md">हिन्दी</a></td>
    <td align="center"><a href="README.id.md">Bahasa Indonesia</a></td>
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

### 🎧 Pakinggan. Putulin. Itago ang sandali.

**Hanapin ang anumang salita o parirala sa totoong pananalita, saka i-save ang eksaktong clip.** Pinagsasama ng YouGlish Downloader ang paghahanap ng pagbigkas sa YouGlish at isang desktop clipper, kaya maghanap ka ng parirala sa wika at accent na pipiliin mo, marinig kung paano talaga ito sinasabi ng mga tao sa konteksto, at mag-download ng eksaktong sandaling kailangan mo.

- 🎓 **Mga nag-aaral ng wika:** pakinggan ang totoong tao na nagsasabi nito sa totoong usapan, hindi lang sa mga recording ng aklat.
- 👩‍🏫 **Mga guro:** gumawa ng mga handang i-play na halimbawang clip para sa klase, ayon sa iyong aralin.
- 🔎 **Sinumang naghahanap ng parirala:** hanapin kung saan binibigkas ang parirala sa YouTube, sa wikang pipiliin mo, at itago ang sandaling iyon.

Mag-download lamang ng nilalamang pagmamay-ari mo o may pahintulot kang i-download.

![App ng YouGlish Downloader: maghanap ng parirala, putulin ang clip, at idagdag ito sa download queue](../images/app-preview.webp)

Isang desktop fork ng TubeCutter para sa manu-manong paghahanap ng mga halimbawa ng pananalita gamit ang opisyal na YouGlish widget. May sariling app identifier at mga kagustuhan ang proyektong ito.

## Pag-download

- **Windows:** [I-download ang pinakabagong release](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Pumili ng regular na install o portable na kopya.
- **macOS (Apple silicon):** [I-download ang macOS release](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## I-set up ang access sa YouTube

1. Buksan ang app at i-click ang **Account & Settings**.
2. Sa ilalim ng **YouGlish playback account**, i-click ang **1. Sign in to Google ↗**, saka **2. Connect YouTube ↗**, at piliin ang iyong channel kung hihingin. Isara ang account window kapag tapos ka na. Ang **Check playback ↗** ay nagpapatakbo ng sample video para makumpirmang gumagana ito.
3. Sa ilalim ng **Subtitle and download authentication**, piliin ang **App’s YouTube session** para sa **Download authentication**.

Handa ka nang gamitin ang YouGlish Downloader.

Kung gusto mong gumamit ng browser na naka-sign in ka na, piliin ito sa ilalim ng **Download authentication**. Sa Windows, isara ang browser na iyon bago maghanap: nilolock ng mga Chromium browser ang cookie file habang tumatakbo, kaya ang sariling session ng app ang maaasahang pagpipilian doon. Gamitin lamang ang sarili mong account. Huwag mag-import o magbahagi ng cookies ng iba.

Puwede mo ring panatilihin ang **Anonymous**, pero mas mahigpit ang anti-bot checks ng YouTube sa anonymous access, at may ilang video na hindi gagana.

## Paggamit

Buksan ang `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` pagkatapos mag-build, o patakbuhin ang `npm run desktop` para sa development.

1. Ilagay ang search phrase, wika, at opsyonal na accent, saka Search. Ang English na may lahat ng accent ang default.
2. Mag-browse at makinig sa YouGlish. Ang caption ng napiling sample ay pumupuno sa File Name at nananatili habang tumatakbo ang playback.
3. I-edit ang File Name para maging parirala mula sa subtitles ng video. I-click ang **Look Up** o pindutin ang Enter. Hindi nagsisimula ang lookup sa pag-edit o pag-alis sa field. Ipinapakita ng button ang spinner hanggang magtagumpay o mabigo ang pagtutugma. Ito rin ang pangalan ng output file (idinadagdag ng container ang extension).
4. Mas inuuna ang ibinigay na subtitles. Original at hindi isinaling automatic captions lamang ang ginagamit bilang alternatibo. Binabalewala ng pagtutugma ang case, bantas, at istilo ng apostrophe; sumasaklaw ito sa magkakatabing cue at inaalis ang nagkakapatong na rolling text.
5. Sa pagpili ng video, nakatakda sa zero at buong haba ng video ang In/Out. Kapag isa ang tugma, itinatakda nito ang In/Out sa hangganan ng subtitle segment, walang padding. Kapag marami, kailangang pumili ng isa. Kapag walang tugma, nananatili ang kasalukuyang timing. Mga hangganan ng subtitle segment ang mga ito, hindi word-level na acoustic alignment.
6. Gamitin ang maliliit na arrow para baguhin ang alinmang hangganan o ang haba nang eksaktong isang segundo. Ibinabalik ng **Reset** ang buong video at binubura ang di-wastong input at mga error sa pagpapatunay. Tinatanggihan ang mga di-wastong hangganan. Puwede ka pa ring mag-type ng timestamp, mag-type ng Length (ang haba ng padded clip na nakikita sa field; isinasaayos ang Out ayon dito), mag-drag sa timeline, o gumamit ng **Preview selection**.
7. Pansamantalang inilipat ng **Preview selection** ang widget area sa naka-embed na YouTube player para sa tumpak na seeking. Ibinabalik ka ng **Back to YouGlish results** sa pagba-browse. Kailangan ng **Set In** at **Set Out** ang preview na ito dahil hindi naglalantad ang YouGlish ng dokumentadong absolute playhead time.
8. Nakatiklop sa simula ang Download settings. Ang default na resolution ay ang pinakamataas na available na hanggang 1080p. Sa oras ng pag-download, pinapayagan din ng 1080p request ang mas mababang available na source resolution. Nananatiling eksakto ang iba pang piniling resolution.
9. Pumili ng destination folder at idagdag ang napiling bahagi sa minanang sunud-sunod na download queue. Nananatili ang Precise Cut, pause/resume/cancel/retry, subtitle embedding, at pagpapakita sa Finder.

Nakatakda sa anonymous bilang default ang Account & Settings. Nakikita ang mga suportadong naka-install na browser sa karaniwang lokasyon ng app sa macOS. Kapag pumili ka ng isa, puwedeng basahin ng yt-dlp ang lokal nitong cookie store para sa subtitles at downloads; hindi inilalagay ang cookies sa YouGlish o itinatago sa settings. Gumagamit ang widget ng sarili nitong WebView session. Hiwalay sa TubeCutter ang mga kagustuhan ng app at pagkakakilanlan ng queue.

## Wika

Available ang interface ng app sa English at 19 pang wika: Arabic, Bengali, Chinese (Simplified), Filipino, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Persian, Portuguese (Brazil), Russian, Spanish, Telugu, Thai, Turkish, at Vietnamese. Sinusunod nito ang wika ng system bilang default. Para pumili ng iba, buksan ang **Account & Settings → Language**; agad itong nagkakabisa at naaalala. Kanan-pakaliwa ang layout ng Arabic at Persian.

Nasa `src/locales/<code>.json` ang mga pagsasalin, at ang English na teksto ang susi. Tingnan ang [mga tala sa lokalisasyon](../LOCALIZATION.md) para malaman kung paano magdagdag o magwasto ng pagsasalin.

## Development

Nasa English lamang ang mga tala sa build: tingnan ang [English README](../../README.md#development).
