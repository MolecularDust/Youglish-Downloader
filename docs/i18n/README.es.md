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
    <td align="center"><b>Español</b></td>
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

### 🎧 Escúchalo. Recórtalo. Guarda el momento.

**Encuentra cualquier palabra o frase en habla real y guarda el clip exacto.** YouGlish Downloader combina la búsqueda de pronunciación de YouGlish con un recortador de escritorio: busca una frase en el idioma y el acento que elijas, escucha cómo la dice la gente realmente en contexto y descarga solo el momento que necesitas.

- 🎓 **Estudiantes de idiomas:** escucha a personas reales decirla en conversaciones reales, no solo en grabaciones de libros de texto.
- 👩‍🏫 **Profesores:** crea clips de ejemplo listos para reproducir, adaptados a tu clase.
- 🔎 **Cualquiera que busque una frase:** encuentra dónde se dice en YouTube, en el idioma que elijas, y guarda solo ese momento.

Descarga solo contenido que te pertenezca o para el que tengas permiso.

![App YouGlish Downloader: buscar una frase, recortar el clip y añadirlo a la cola de descargas](../images/app-preview.webp)

Una versión de escritorio de TubeCutter para buscar manualmente ejemplos de habla con el widget oficial de YouGlish. Este proyecto tiene su propio identificador de aplicación y sus propias preferencias.

## Descarga

- **Windows:** [Descarga la última versión](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Elige una instalación normal o una copia portátil.
- **macOS (Apple silicon):** [Descarga la versión para macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Configura el acceso a YouTube

1. Abre la aplicación y haz clic en **Account & Settings**.
2. En **YouGlish playback account**, haz clic en **1. Sign in to Google ↗** y luego en **2. Connect YouTube ↗**, y elige tu canal si se te pide. Cierra la ventana de la cuenta cuando termines. **Check playback ↗** reproduce un video de ejemplo para confirmar que funciona.
3. En **Subtitle and download authentication**, elige **App’s YouTube session** para **Download authentication**.

Ya puedes usar YouGlish Downloader.

Para usar un navegador en el que ya tengas la sesión iniciada, elígelo en **Download authentication**. En Windows, cierra ese navegador antes de buscar: los navegadores basados en Chromium bloquean su archivo de cookies mientras están abiertos, por eso la sesión propia de la aplicación es la opción fiable allí. Usa solo tu propia cuenta. No importes ni compartas cookies de otras personas.

También puedes dejar **Anonymous**, pero las comprobaciones antibots de YouTube son más estrictas con el acceso anónimo y algunos videos fallarán.

## Uso

Abre `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` después de compilar, o ejecuta `npm run desktop` para desarrollo.

1. Escribe la frase de búsqueda, el idioma y, opcionalmente, el acento, y busca. Por defecto es inglés con todos los acentos.
2. Navega y escucha en YouGlish. El subtítulo de la muestra seleccionada rellena File Name y se mantiene mientras continúa la reproducción.
3. Cambia File Name por una frase de los subtítulos del video. Haz clic en **Look Up** o pulsa Intro. Editar el campo o salir de él no inicia la búsqueda. El botón muestra un indicador hasta que la coincidencia tenga éxito o falle. Este texto también es el nombre del archivo de salida (el contenedor añade la extensión).
4. Los subtítulos proporcionados tienen prioridad. Solo se usan como alternativa los subtítulos automáticos originales sin traducir. La coincidencia ignora mayúsculas y minúsculas, la puntuación y el estilo del apóstrofo; abarca cues contiguos y suprime el texto desplazable superpuesto.
5. Al elegir el video, In/Out se fijan primero en cero y en la duración completa. Una coincidencia fija In/Out en los límites del segmento de subtítulos que la contiene, sin relleno. Varias coincidencias exigen elegir una aparición. Sin coincidencias, los tiempos existentes no cambian. Son límites de segmentos de subtítulos, no una alineación acústica a nivel de palabra.
6. Usa las flechas pequeñas para cambiar uno de los límites o la duración exactamente en un segundo. **Reset** restaura el video completo y borra las entradas no válidas y los errores de validación. Los límites no válidos se rechazan. También puedes escribir las marcas de tiempo directamente, escribir una Length (la duración del clip con relleno que se muestra en el campo; Out se ajusta en consecuencia), arrastrar la línea de tiempo o usar **Preview selection**.
7. **Preview selection** cambia temporalmente el área del widget por el reproductor de YouTube integrado para un posicionamiento preciso. **Back to YouGlish results** vuelve a la exploración. **Set In** y **Set Out** requieren esta vista previa porque YouGlish no expone una posición absoluta documentada.
8. La configuración de descarga empieza plegada. La resolución predeterminada es la más alta disponible hasta 1080p. Al descargar, una solicitud de 1080p también admite resoluciones de origen inferiores disponibles. Las demás resoluciones elegidas siguen siendo exactas.
9. Elige una carpeta de destino y añade la selección a la cola de descarga secuencial heredada. Se mantienen **Precise Cut**, pausar/reanudar/cancelar/reintentar, incrustar subtítulos y mostrar en el Finder.

**Account & Settings** es anónimo por defecto. Los navegadores compatibles instalados se detectan en las ubicaciones habituales de aplicaciones de macOS. Al elegir uno, yt-dlp puede leer su almacén local de cookies para subtítulos y descargas; las cookies no se inyectan en YouGlish ni se guardan en la configuración. El widget usa su propia sesión de WebView. Las preferencias de la aplicación y la identidad de la cola son independientes de TubeCutter.

## Idioma

La interfaz de la aplicación está disponible en inglés y en otros 19 idiomas: árabe, bengalí, chino (simplificado), filipino, francés, alemán, hindi, indonesio, italiano, japonés, coreano, persa, portugués (Brasil), ruso, español, telugu, tailandés, turco y vietnamita. Por defecto sigue el idioma del sistema. Para elegir otro, abre **Account & Settings → Language**; la elección se aplica al instante y se recuerda. El árabe y el persa se muestran de derecha a izquierda.

Las traducciones están en `src/locales/<code>.json`, y el texto en inglés es la clave. Para añadir o corregir una traducción, consulta las [notas de localización](../LOCALIZATION.md).

## Desarrollo

Las notas de compilación están solo en inglés: consulta el [README en inglés](../../README.md#development).
