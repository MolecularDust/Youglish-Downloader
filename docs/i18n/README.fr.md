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
    <td align="center"><b>Français</b></td>
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

### 🎧 Écoutez-le. Découpez-le. Gardez le moment.

**Trouvez n’importe quel mot ou expression dans une parole réelle, puis enregistrez l’extrait exact.** YouGlish Downloader associe la recherche de prononciation YouGlish à un outil de découpage sur ordinateur : cherchez une expression dans la langue et l’accent de votre choix, écoutez comment les gens la disent réellement en contexte, et téléchargez seulement le moment dont vous avez besoin.

- 🎓 **Apprenants des langues :** entendez de vraies personnes la dire dans de vraies conversations, et pas seulement dans des enregistrements de manuel.
- 👩‍🏫 **Enseignants :** créez des extraits d’exemple prêts à lire, adaptés à votre cours.
- 🔎 **Toute personne qui cherche une expression :** trouvez où elle est prononcée sur YouTube, dans la langue choisie, et gardez ce seul moment.

Ne téléchargez que du contenu que vous possédez ou pour lequel vous avez l’autorisation.

![Application YouGlish Downloader : rechercher une expression, découper l’extrait et l’ajouter à la file de téléchargement](../images/app-preview.webp)

Une version bureau de TubeCutter pour trouver manuellement des exemples de parole avec le widget officiel de YouGlish. Ce projet a son propre identifiant d’application et ses propres préférences.

## Téléchargement

- **Windows :** [Télécharger la dernière version](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Choisissez une installation classique ou une copie portable.
- **macOS (Apple silicon) :** [Télécharger la version macOS](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## Configurer l’accès à YouTube

1. Ouvrez l’application et cliquez sur **Account & Settings**.
2. Sous **YouGlish playback account**, cliquez sur **1. Sign in to Google ↗**, puis sur **2. Connect YouTube ↗**, et choisissez votre chaîne si on vous le demande. Fermez la fenêtre du compte lorsque vous avez terminé. **Check playback ↗** lance une vidéo d’exemple pour vérifier que tout fonctionne.
3. Sous **Subtitle and download authentication**, choisissez **App’s YouTube session** pour **Download authentication**.

Vous êtes prêt à utiliser YouGlish Downloader.

Pour utiliser plutôt un navigateur dans lequel vous êtes déjà connecté, choisissez-le sous **Download authentication**. Sous Windows, fermez ce navigateur avant de chercher : les navigateurs Chromium verrouillent leur fichier de cookies pendant leur exécution, donc la session propre à l’application est le choix fiable. Utilisez uniquement votre propre compte. N’importez ni ne partagez les cookies de quelqu’un d’autre.

Vous pouvez aussi garder **Anonymous**, mais les contrôles anti-robots de YouTube sont plus stricts pour l’accès anonyme, et certaines vidéos échoueront.

## Utilisation

Ouvrez `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` après la compilation, ou lancez `npm run desktop` pour le développement.

1. Saisissez une expression, la langue et l’accent facultatif, puis lancez la recherche. L’anglais avec tous les accents est la valeur par défaut.
2. Parcourez et écoutez dans YouGlish. La légende de l’échantillon choisi remplit File Name et y reste pendant la lecture.
3. Modifiez File Name pour y mettre une expression tirée des sous-titres de la vidéo. Cliquez sur **Look Up** ou appuyez sur Entrée. Modifier le champ ou en sortir ne lance pas de recherche. Le bouton affiche un indicateur jusqu’à la réussite ou l’échec de la correspondance. Ce texte sert aussi de nom de fichier de sortie (le conteneur ajoute l’extension).
4. Les sous-titres fournis sont prioritaires. Seules les légendes automatiques originales, non traduites, servent de solution de repli. La correspondance ignore la casse, la ponctuation et le style des apostrophes ; elle couvre les répliques adjacentes et supprime le texte défilant qui se chevauche.
5. Lors du choix de la vidéo, In/Out sont d’abord réglés sur zéro et sur la durée complète. Une correspondance règle In/Out sur les bornes du segment de sous-titres qui la contient, sans marge. Plusieurs correspondances exigent de choisir une occurrence. Sans correspondance, les horaires existants restent inchangés. Ce sont des bornes de segments de sous-titres, pas un alignement acoustique au niveau du mot.
6. Utilisez les petites flèches pour modifier l’une des bornes ou la durée d’exactement une seconde. **Reset** restaure la vidéo entière et efface les saisies invalides et les erreurs de validation. Les bornes invalides sont refusées. Vous pouvez aussi saisir directement les horodatages, saisir une Length (la durée de l’extrait avec marge affichée dans le champ ; Out s’ajuste en conséquence), faire glisser la timeline, ou utiliser **Preview selection**.
7. **Preview selection** remplace temporairement la zone du widget par le lecteur YouTube intégré, pour un positionnement précis. **Back to YouGlish results** revient à la navigation. **Set In** et **Set Out** exigent cet aperçu, car YouGlish n’expose pas de position absolue documentée.
8. Les paramètres de téléchargement sont repliés au départ. La résolution par défaut est la plus haute disponible jusqu’à 1080p. Au moment du téléchargement, une demande en 1080p accepte aussi des résolutions source inférieures disponibles. Les autres résolutions choisies restent exactes.
9. Choisissez un dossier de destination et ajoutez la sélection à la file de téléchargement séquentielle héritée. **Precise Cut**, pause, reprise, annulation, nouvelle tentative, intégration des sous-titres et affichage dans le Finder sont conservés.

**Account & Settings** est anonyme par défaut. Les navigateurs pris en charge installés sont détectés dans les emplacements d’applications habituels de macOS. En en choisissant un, yt-dlp peut lire son magasin de cookies local pour les sous-titres et les téléchargements ; les cookies ne sont ni injectés dans YouGlish ni enregistrés dans les réglages. Le widget utilise sa propre session WebView. Les préférences de l’application et l’identité de la file sont distinctes de TubeCutter.

## Langue

L’interface de l’application est disponible en anglais et dans 19 autres langues : arabe, bengali, chinois (simplifié), filipino, français, allemand, hindi, indonésien, italien, japonais, coréen, persan, portugais (Brésil), russe, espagnol, télougou, thaï, turc et vietnamien. Elle suit la langue du système par défaut. Pour en choisir une autre, ouvrez **Account & Settings → Language** ; le choix s’applique immédiatement et est mémorisé. L’arabe et le persan s’affichent de droite à gauche.

Les traductions sont dans `src/locales/<code>.json`, et le texte anglais sert de clé. Consultez les [notes de localisation](../LOCALIZATION.md) pour savoir comment ajouter ou corriger une traduction.

## Développement

Les notes de compilation ne sont qu’en anglais : voir le [README anglais](../../README.md#development).
