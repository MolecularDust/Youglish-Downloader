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
    <td align="center"><a href="README.es.md">Español</a></td>
    <td align="center"><a href="README.te.md">తెలుగు</a></td>
    <td align="center"><a href="README.th.md">ไทย</a></td>
    <td align="center"><b>Türkçe</b></td>
    <td align="center"><a href="README.vi.md">Tiếng Việt</a></td>
  </tr>
</table>

</details>

</div>
<!-- languages:end -->

# YouGlish Downloader

### 🎧 Dinleyin. Kırpın. Anı saklayın.

**Gerçek konuşmada herhangi bir kelimeyi veya ifadeyi bulun, sonra tam klibi kaydedin.** YouGlish Downloader, YouGlish’in telaffuz aramasını bir masaüstü kırpma aracıyla birleştirir: seçtiğiniz dil ve aksanda bir ifade arayın, insanların bağlam içinde onu gerçekte nasıl söylediğini dinleyin ve yalnızca ihtiyacınız olan anı indirin.

- 🎓 **Dil öğrenenler:** ders kitabı kayıtları yerine gerçek sohbetlerde gerçek insanların bunu söylediğini dinleyin.
- 👩‍🏫 **Öğretmenler:** dersinize uygun, hemen oynatılabilir örnek klipler hazırlayın.
- 🔎 **Bir ifade arayan herkes:** seçtiğiniz dilde bu ifadenin YouTube’da nerede söylendiğini bulun ve yalnızca o anı saklayın.

Yalnızca size ait olan veya indirme izniniz bulunan içerikleri indirin.

![YouGlish Downloader uygulaması: bir ifade arayın, klibi kırpın ve indirme kuyruğuna ekleyin](../images/app-preview.webp)

Resmi YouGlish bileşeriyle konuşma örneklerini elle bulmak için TubeCutter’ın masaüstü çatalı. Bu projenin kendi uygulama kimliği ve tercihleri vardır.

## İndirme

- **Windows:** [En son sürümü indirin](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). Normal kurulum veya taşınabilir kopya seçin.
- **macOS (Apple silicon):** [macOS sürümünü indirin](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## YouTube erişimini ayarlayın

1. Uygulamayı açın ve **Account & Settings** düğmesine tıklayın.
2. **YouGlish playback account** altında **1. Sign in to Google ↗** ve ardından **2. Connect YouTube ↗** düğmelerine tıklayın, istenirse kanalınızı seçin. Bitince hesap penceresini kapatın. **Check playback ↗** çalışıp çalışmadığını doğrulamak için bir örnek video oynatır.
3. **Subtitle and download authentication** altında **Download authentication** için **App’s YouTube session** seçin.

YouGlish Downloader’ı kullanmaya hazırsınız.

Zaten oturum açtığınız bir tarayıcıyı kullanmak istiyorsanız, onu **Download authentication** altında seçin. Windows’ta aramadan önce o tarayıcıyı kapatın: Chromium tabanlı tarayıcılar çalışırken çerez dosyalarını kilitler, bu yüzden orada uygulamanın kendi oturumu güvenilir seçimdir. Yalnızca kendi hesabınızı kullanın. Başkalarının çerezlerini içe aktarmayın veya paylaşmayın.

**Anonymous** olarak da kalabilirsiniz, ancak YouTube’un bot karşıtı denetimleri anonim erişim için daha katıdır ve bazı videolar başarısız olabilir.

## Kullanım

Derlemeden sonra `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` dosyasını açın veya geliştirme için `npm run desktop` komutunu çalıştırın.

1. Arama ifadesini, dili ve isteğe bağlı aksanı girin, sonra arayın. Varsayılan, tüm aksanlarla İngilizcedir.
2. YouGlish’te göz atın ve dinleyin. Seçilen örneğin altyazısı File Name alanını doldurur ve oynatma sürerken orada kalır.
3. File Name alanını videonun altyazılarındaki bir ifadeyle değiştirin. **Look Up** düğmesine tıklayın veya Enter’a basın. Alanı düzenlemek veya alandan çıkmak aramayı başlatmaz. Eşleştirme başarılı olana veya başarısız olana kadar düğme bir döndürücü gösterir. Bu metin çıktı dosyasının adı da olur (uzantıyı kap ekler).
4. Sağlanan altyazılar önceliklidir. Yalnızca çevrilmemiş özgün otomatik altyazılar yedek olarak kullanılır. Eşleştirme büyük-küçük harf, noktalama ve kesme işareti biçimini yok sayar; komşu altyazı parçalarını birleştirir ve üst üste binen kayan metni kaldırır.
5. Video seçilirken In/Out önce sıfıra ve videonun tam süresine ayarlanır. Tek bir eşleşme In/Out’u onu içeren altyazı bölümünün sınırlarına ayarlar; dolgu eklenmez. Birden fazla eşleşme varsa bir tekrarı seçmeniz gerekir. Eşleşme yoksa mevcut zamanlar değişmez. Bunlar altyazı bölümü sınırlarıdır, kelime düzeyinde ses hizalaması değildir.
6. Herhangi bir sınırı veya süreyi tam bir saniye değiştirmek için küçük okları kullanın. **Reset** tüm videoyu geri yükler ve geçersiz girişleri ve doğrulama hatalarını temizler. Geçersiz sınırlar reddedilir. Zamanları doğrudan yazabilir, Length yazabilirsiniz (alanda gösterilen dolgulu klip süresi; Out buna göre ayarlanır), zaman çizelgesini sürükleyebilir veya **Preview selection** kullanabilirsiniz.
7. **Preview selection**, hassas konumlandırma için bileşen alanını geçici olarak gömülü YouTube oynatıcısıyla değiştirir. **Back to YouGlish results** gezinmeye geri döner. **Set In** ve **Set Out** bu önizlemeyi gerektirir, çünkü YouGlish belgelenmiş mutlak bir oynatma konumu sunmaz.
8. İndirme ayarları başta daraltılmış olarak gelir. Varsayılan çözünürlük, 1080p’ye kadar kullanılabilir en yüksek çözünürlüktür. İndirme sırasında 1080p isteği, kullanılabilir daha düşük kaynak çözünürlüklerine de izin verir. Seçtiğiniz diğer çözünürlükler aynen kalır.
9. Bir hedef klasör seçin ve seçimi devralınmış sıralı indirme kuyruğuna ekleyin. **Precise Cut**, duraklat/devam et/iptal et/yeniden dene, altyazı gömme ve Finder’da gösterme işlevleri korunur.

**Account & Settings** varsayılan olarak anonimdir. Desteklenen, yüklü tarayıcılar macOS’in olağan uygulama konumlarında algılanır. Birini seçmek, yt-dlp’nin altyazılar ve indirmeler için o tarayıcının yerel çerez deposunu okumasına izin verir; çerezler YouGlish’e enjekte edilmez ve ayarlarda saklanmaz. Bileşen kendi WebView oturumunu kullanır. Uygulama tercihleri ve kuyruk kimliği TubeCutter’dan ayrıdır.

## Dil

Uygulama arayüzü İngilizce ve 19 dilde kullanılabilir: Arapça, Bengalce, Çince (Basitleştirilmiş), Filipince, Fransızca, Almanca, Hintçe, Endonezce, İtalyanca, Japonca, Korece, Farsça, Portekizce (Brezilya), Rusça, İspanyolca, Telugu, Tayca, Türkçe ve Vietnamca. Varsayılan olarak sistem dilini izler. Başka bir dil seçmek için **Account & Settings → Language** bölümünü açın; seçim hemen uygulanır ve hatırlanır. Arapça ve Farsça sağdan sola yerleştirilir.

Çeviriler `src/locales/<code>.json` içinde bulunur ve İngilizce metin anahtar işlevi görür. Bir çeviri eklemek veya düzeltmek için [yerelleştirme notlarına](../LOCALIZATION.md) bakın.

## Geliştirme

Derleme notları yalnızca İngilizcedir: [İngilizce README](../../README.md#development) bölümüne bakın.
