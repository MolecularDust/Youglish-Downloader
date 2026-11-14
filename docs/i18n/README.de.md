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
    <td align="center"><b>Deutsch</b></td>
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

### 🎧 Hören. Schneiden. Den Moment behalten.

**Finden Sie jedes Wort oder jede Wendung in echter Sprache und speichern Sie genau diesen Ausschnitt.** YouGlish Downloader verbindet die YouGlish-Aussprachesuche mit einem Desktop-Schneidewerkzeug: Suchen Sie eine Wendung in der gewünschten Sprache und mit dem gewünschten Akzent, hören Sie, wie Menschen sie im Kontext tatsächlich sagen, und laden Sie genau den Moment herunter, den Sie brauchen.

- 🎓 **Sprachlernende:** Hören Sie echte Menschen in echten Gesprächen und nicht nur Lehrbuchaufnahmen.
- 👩‍🏫 **Lehrkräfte:** Erstellen Sie sofort abspielbare Beispielclips, zugeschnitten auf Ihre Unterrichtsstunde.
- 🔎 **Alle, die eine Wendung suchen:** Finden Sie auf YouTube, wo eine Wendung in der gewählten Sprache vorkommt, und behalten Sie genau diesen Moment.

Laden Sie nur Inhalte herunter, die Ihnen gehören oder für die Sie eine Erlaubnis haben.

![YouGlish-Downloader-App: eine Wendung suchen, den Clip zuschneiden und zur Download-Warteschlange hinzufügen](../images/app-preview.webp)

Eine Desktop-Variante von TubeCutter zum manuellen Finden von Sprachbeispielen mit dem offiziellen YouGlish-Widget. Dieses Projekt hat eigene App-Kennung und Einstellungen.

## Herunterladen

- **Windows:** [Neueste Version herunterladen](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Wählen Sie eine reguläre Installation oder eine portable Kopie.
- **macOS (Apple silicon):** [macOS-Version herunterladen](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## YouTube-Zugriff einrichten

1. Öffnen Sie die App und klicken Sie auf **Account & Settings**.
2. Klicken Sie unter **YouGlish playback account** auf **1. Sign in to Google ↗** und dann auf **2. Connect YouTube ↗**, und wählen Sie bei Bedarf Ihren Kanal. Schließen Sie das Kontofenster, wenn Sie fertig sind. **Check playback ↗** spielt ein Beispielvideo ab, um die Funktion zu prüfen.
3. Wählen Sie unter **Subtitle and download authentication** für **Download authentication** die Option **App’s YouTube session**.

Sie können YouGlish Downloader jetzt verwenden.

Wenn Sie stattdessen einen Browser verwenden möchten, in dem Sie bereits angemeldet sind, wählen Sie ihn unter **Download authentication**. Schließen Sie unter Windows diesen Browser vor der Suche: Chromium-Browser sperren ihre Cookie-Datei, solange sie laufen, daher ist die eigene Sitzung der App dort die verlässliche Wahl. Verwenden Sie nur Ihr eigenes Konto. Importieren oder teilen Sie keine Cookies anderer Personen.

Sie können auch **Anonymous** beibehalten, aber die Anti-Bot-Prüfungen von YouTube sind für anonyme Zugriffe strenger, und einige Videos schlagen fehl.

## Verwendung

Öffnen Sie `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` nach dem Erstellen, oder starten Sie `npm run desktop` zur Entwicklung.

1. Geben Sie eine Suchwendung, die Sprache und optional den Akzent ein und suchen Sie. Standard ist Englisch mit allen Akzenten.
2. Blättern Sie in YouGlish und hören Sie zu. Die Bildunterschrift des gewählten Beispiels füllt File Name aus und bleibt während der Wiedergabe dort.
3. Ändern Sie File Name zu einer Wendung aus den Untertiteln des Videos. Klicken Sie auf **Look Up** oder drücken Sie die Eingabetaste. Bearbeiten oder Verlassen des Feldes startet keine Suche. Die Schaltfläche zeigt einen Spinner, bis der Abgleich gelingt oder fehlschlägt. Dieser Text ist auch der Name der Ausgabedatei (der Container ergänzt die Erweiterung).
4. Mitgelieferte Untertitel haben Vorrang. Nur originale, nicht übersetzte automatische Untertitel dienen als Ersatz. Beim Abgleich werden Groß-/Kleinschreibung, Satzzeichen und Apostroph-Stil ignoriert; er umfasst benachbarte Untertitelabschnitte und unterdrückt überlappenden laufenden Text.
5. Bei der Videoauswahl werden In/Out zunächst auf null und die volle Videodauer gesetzt. Ein Treffer setzt In/Out auf die Grenzen des enthaltenden Untertitelsegments, ohne Auffüllung. Mehrere Treffer erfordern die Auswahl eines Vorkommens. Ohne Treffer bleiben die bestehenden Zeiten unverändert. Dies sind Untertitelsegmentgrenzen, keine Ausrichtung auf Wortebene.
6. Mit den kleinen Pfeilen ändern Sie eine der Grenzen oder die Länge um genau eine Sekunde. **Reset** stellt das gesamte Video wieder her und löscht ungültige Eingaben und Prüffehler. Ungültige Grenzen werden abgelehnt. Sie können auch Zeitstempel direkt bearbeiten, eine Length eingeben (die im Feld angezeigte Länge des aufgefüllten Clips; Out wird entsprechend angepasst), die Zeitleiste ziehen oder **Preview selection** verwenden.
7. **Preview selection** wechselt den Widget-Bereich vorübergehend zum eingebetteten YouTube-Player, für präzises Springen. **Back to YouGlish results** kehrt zum Durchsuchen zurück. **Set In** und **Set Out** benötigen diese Vorschau, weil YouGlish keine dokumentierte absolute Abspielposition bereitstellt.
8. Die Download-Einstellungen sind zunächst eingeklappt. Die Standardauflösung ist die höchste verfügbare bis 1080p. Beim Herunterladen erlaubt eine 1080p-Anfrage auch niedrigere verfügbare Quellauflösungen. Andere gewählte Auflösungen bleiben exakt.
9. Wählen Sie einen Zielordner und fügen Sie die Auswahl der geerbten sequentiellen Download-Warteschlange hinzu. **Precise Cut**, Pausieren/Fortsetzen/Abbrechen/Wiederholen, Untertitel-Einbettung und das Anzeigen im Finder bleiben erhalten.

**Account & Settings** ist standardmäßig anonym. Unterstützte installierte Browser werden an den üblichen macOS-Programmorten erkannt. Wenn Sie einen wählen, kann yt-dlp dessen lokalen Cookie-Speicher für Untertitel und Downloads lesen; Cookies werden weder in YouGlish eingespeist noch in den Einstellungen gespeichert. Das Widget verwendet seine eigene WebView-Sitzung. App-Einstellungen und Warteschlangen-Identität sind von TubeCutter getrennt.

## Sprache

Die Oberfläche der App gibt es auf Englisch und in 19 weiteren Sprachen: Arabisch, Bengalisch, Chinesisch (vereinfacht), Filipino, Französisch, Deutsch, Hindi, Indonesisch, Italienisch, Japanisch, Koreanisch, Persisch, Portugiesisch (Brasilien), Russisch, Spanisch, Telugu, Thai, Türkisch und Vietnamesisch. Standardmäßig folgt sie der Systemsprache. Eine andere wählen Sie unter **Account & Settings → Language**; die Auswahl gilt sofort und wird gespeichert. Arabisch und Persisch werden von rechts nach links dargestellt.

Die Übersetzungen liegen in `src/locales/<code>.json`, der englische Text dient als Schlüssel. Wie Sie eine Übersetzung hinzufügen oder korrigieren, steht in den [Hinweisen zur Lokalisierung](../LOCALIZATION.md).

## Entwicklung

Die Build-Hinweise sind nur auf Englisch: siehe [englisches README](../../README.md#development).
