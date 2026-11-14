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
    <td align="center"><a href="README.id.md">Bahasa Indonesia</a></td>
    <td align="center"><b>Italiano</b></td>
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

### 🎧 Ascoltalo. Taglialo. Tieni il momento.

**Trova qualsiasi parola o frase nel parlato reale, poi salva la clip esatta.** YouGlish Downloader unisce la ricerca di pronuncia di YouGlish a un ritagliatore per desktop: cerca una frase nella lingua e nell’accento che scegli, ascolta come la dicono davvero le persone nel contesto e scarica solo il momento che ti serve.

- 🎓 **Chi impara le lingue:** ascolta persone vere che la dicono in conversazioni vere, non solo registrazioni da manuale.
- 👩‍🏫 **Insegnanti:** crea clip di esempio pronte da riprodurre, adatte alla tua lezione.
- 🔎 **Chiunque cerchi una frase:** scopri dove viene pronunciata su YouTube, nella lingua che scegli, e conserva solo quel momento.

Scarica solo contenuti di cui sei proprietario o per cui hai il permesso di scaricarli.

![App YouGlish Downloader: cerca una frase, ritaglia la clip e aggiungila alla coda di download](../images/app-preview.webp)

Un fork desktop di TubeCutter per trovare manualmente esempi di parlato con il widget ufficiale di YouGlish. Questo progetto ha il proprio identificativo dell’app e le proprie preferenze.

## Download

- **Windows:** [Scarica l’ultima versione](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Scegli un’installazione normale o una copia portatile.
- **macOS (Apple silicon):** [Scarica la versione per macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Configura l’accesso a YouTube

1. Apri l’app e fai clic su **Account & Settings**.
2. In **YouGlish playback account**, fai clic su **1. Sign in to Google ↗**, poi su **2. Connect YouTube ↗**, e scegli il tuo canale se richiesto. Chiudi la finestra dell’account quando hai finito. **Check playback ↗** riproduce un video di esempio per verificare che funzioni.
3. In **Subtitle and download authentication**, scegli **App’s YouTube session** per **Download authentication**.

Sei pronto a usare YouGlish Downloader.

Per usare invece un browser in cui hai già effettuato l’accesso, scegli quel browser in **Download authentication**. Su Windows, chiudi quel browser prima di cercare: i browser basati su Chromium bloccano il file dei cookie mentre sono in esecuzione, quindi la sessione propria dell’app è la scelta affidabile. Usa solo il tuo account. Non importare né condividere i cookie di altri.

Puoi anche mantenere **Anonymous**, ma i controlli anti-bot di YouTube sono più severi per l’accesso anonimo e alcuni video non funzioneranno.

## Utilizzo

Apri `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` dopo la compilazione, oppure avvia `npm run desktop` per lo sviluppo.

1. Inserisci la frase di ricerca, la lingua e l’accento facoltativo, poi cerca. L’inglese con tutti gli accenti è l’impostazione predefinita.
2. Sfoglia e ascolta in YouGlish. La didascalia dell’esempio scelto riempie File Name e resta lì durante la riproduzione.
3. Modifica File Name con una frase dai sottotitoli del video. Fai clic su **Look Up** o premi Invio. Modificare il campo o uscirne non avvia la ricerca. Il pulsante mostra uno spinner finché la corrispondenza non riesce o fallisce. Questo testo è anche il nome del file di output (il contenitore aggiunge l’estensione).
4. I sottotitoli forniti hanno la precedenza. Come alternativa si usano solo le didascalie automatiche originali, non tradotte. La corrispondenza ignora maiuscole, punteggiatura e stile dell’apostrofo; copre i cue adiacenti ed elimina il testo scorrevole sovrapposto.
5. Alla scelta del video, In/Out sono impostati prima a zero e alla durata completa. Una corrispondenza imposta In/Out ai confini del segmento di sottotitoli che la contiene, senza padding. Più corrispondenze richiedono di scegliere un’occorrenza. Senza corrispondenze gli orari esistenti restano invariati. Sono confini di segmenti di sottotitoli, non un allineamento acustico a livello di parola.
6. Usa le piccole frecce per modificare uno dei confini o la durata di esattamente un secondo. **Reset** ripristina l’intero video e cancella gli input non validi e gli errori di convalida. I confini non validi vengono rifiutati. Puoi anche digitare direttamente i timestamp, digitare una Length (la durata della clip con padding mostrata nel campo; Out si adegua di conseguenza), trascinare la timeline o usare **Preview selection**.
7. **Preview selection** sostituisce temporaneamente l’area del widget con il lettore YouTube incorporato per un posizionamento preciso. **Back to YouGlish results** torna alla navigazione. **Set In** e **Set Out** richiedono questa anteprima, perché YouGlish non espone una posizione assoluta documentata.
8. Le impostazioni di download sono inizialmente compresse. La risoluzione predefinita è la più alta disponibile fino a 1080p. Al momento del download, una richiesta a 1080p consente anche risoluzioni sorgente inferiori disponibili. Le altre risoluzioni scelte restano esatte.
9. Scegli una cartella di destinazione e aggiungi la selezione alla coda di download sequenziale ereditata. **Precise Cut**, pausa/ripresa/annulla/riprova, incorporamento dei sottotitoli e visualizzazione nel Finder restano disponibili.

**Account & Settings** è anonimo per impostazione predefinita. I browser supportati installati vengono rilevati nelle normali posizioni delle app di macOS. Sceglierne uno consente a yt-dlp di leggere il suo archivio di cookie locale per sottotitoli e download; i cookie non vengono iniettati in YouGlish né salvati nelle impostazioni. Il widget usa la propria sessione WebView. Le preferenze dell’app e l’identità della coda sono separate da TubeCutter.

## Lingua

L’interfaccia dell’app è disponibile in inglese e in altre 19 lingue: arabo, bengalese, cinese (semplificato), filippino, francese, tedesco, hindi, indonesiano, italiano, giapponese, coreano, persiano, portoghese (Brasile), russo, spagnolo, telugu, thai, turco e vietnamita. Segue per impostazione predefinita la lingua del sistema. Per sceglierne un’altra apri **Account & Settings → Language**; la scelta vale subito ed è ricordata. Arabo e persiano sono impaginati da destra a sinistra.

Le traduzioni si trovano in `src/locales/<code>.json`, e il testo inglese è la chiave. Per aggiungere o correggere una traduzione, vedi le [note sulla localizzazione](../LOCALIZATION.md).

## Sviluppo

Le note di compilazione sono solo in inglese: vedi il [README in inglese](../../README.md#development).
