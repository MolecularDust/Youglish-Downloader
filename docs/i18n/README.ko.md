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
    <td align="center"><b>한국어</b></td>
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

### 🎧 들어보고, 잘라서, 그 순간을 남기세요.

**실제 말하기에서 어떤 단어나 구절이든 찾아, 정확한 클립을 저장하세요.** YouGlish Downloader는 YouGlish 발음 검색과 데스크톱 클리퍼를 결합합니다. 원하는 언어와 억양으로 구절을 검색하고, 사람들이 문맥 속에서 실제로 어떻게 말하는지 듣고, 필요한 순간만 다운로드할 수 있습니다.

- 🎓 **언어 학습자:** 교과서 녹음이 아니라 실제 대화에서 실제 사람들이 그 말을 하는 것을 들어 보세요.
- 👩‍🏫 **교사:** 수업에 맞춰 바로 재생할 수 있는 예문 클립을 만드세요.
- 🔎 **구절을 찾는 모든 사람:** 선택한 언어로 그 구절이 YouTube 어디에서 말해지는지 찾고, 그 순간만 보관하세요.

본인이 소유하거나 다운로드 허락을 받은 콘텐츠만 다운로드하세요.

![YouGlish Downloader 앱: 구절을 검색하고, 클립을 자르고, 다운로드 대기열에 추가하는 모습](../images/app-preview.webp)

공식 YouGlish 위젯으로 말하기 예문을 직접 찾기 위한 TubeCutter의 데스크톱 포크입니다. 이 프로젝트는 고유한 앱 식별자와 환경설정을 가집니다.

## 다운로드

- **Windows:** [최신 릴리스 다운로드](https://github.com/MolecularDust/Youglish-Downloader/releases/latest). 일반 설치 또는 포터블 복사본을 선택하세요.
- **macOS (Apple silicon):** [macOS 릴리스 다운로드](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos).

## YouTube 접근 설정

1. 앱을 열고 **Account & Settings**를 클릭하세요.
2. **YouGlish playback account**에서 **1. Sign in to Google ↗**, 그다음 **2. Connect YouTube ↗**를 클릭하고, 요청되면 채널을 선택하세요. 끝나면 계정 창을 닫으세요. **Check playback ↗**은 샘플 동영상을 재생해 제대로 작동하는지 확인합니다.
3. **Subtitle and download authentication**에서 **Download authentication**에 대해 **App’s YouTube session**을 선택하세요.

이제 YouGlish Downloader를 사용할 준비가 되었습니다.

이미 로그인되어 있는 브라우저를 대신 쓰려면 **Download authentication**에서 그 브라우저를 선택하세요. Windows에서는 검색 전에 그 브라우저를 닫으세요. Chromium 계열 브라우저는 실행 중에 쿠키 파일을 잠그므로, Windows에서는 앱 자체 세션이 신뢰할 수 있는 선택입니다. 본인 계정만 사용하고, 다른 사람의 쿠키를 가져오거나 공유하지 마세요.

**Anonymous**를 그대로 두어도 되지만, 익명 접근에는 YouTube의 봇 방지 검사가 더 엄격하게 적용되어 일부 동영상이 실패할 수 있습니다.

## 사용법

빌드 후 `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app`을 열거나, 개발용으로 `npm run desktop`를 실행하세요.

1. 검색 구절, 언어, 선택 사항인 억양을 입력하고 검색하세요. 기본값은 모든 억양의 영어입니다.
2. YouGlish에서 둘러보고 들어보세요. 선택한 샘플의 자막이 File Name을 채우며, 재생하는 동안 그대로 남습니다.
3. File Name을 동영상 자막에 있는 구절로 바꾸세요. **Look Up**을 클릭하거나 Enter를 누르세요. 필드를 편집하거나 벗어나도 조회가 시작되지 않습니다. 일치 여부가 확인될 때까지 버튼에 스피너가 표시됩니다. 이 텍스트는 출력 파일 이름이기도 합니다(확장자는 컨테이너가 붙입니다).
4. 제공된 자막이 우선합니다. 번역되지 않은 원본 자동 자막만 대체로 사용됩니다. 일치 검사는 대소문자, 문장 부호, 아포스트로피 표기를 무시하며, 인접한 자막 큐에 걸쳐 있고 겹치는 롤링 텍스트를 제거합니다.
5. 동영상을 고르면 In/Out은 처음에 0과 전체 길이로 설정됩니다. 일치 항목이 하나면 In/Out은 그것을 포함하는 자막 구간의 경계로 설정되며, 여백은 없습니다. 여러 개면 한 곳을 골라야 합니다. 일치 항목이 없으면 기존 시간은 바뀌지 않습니다. 이는 자막 구간의 경계이며, 단어 단위의 음향 정렬이 아닙니다.
6. 작은 화살표로 어느 한 경계나 길이를 정확히 1초씩 바꾸세요. **Reset**은 전체 동영상을 되돌리고 잘못된 입력과 검증 오류를 지웁니다. 잘못된 경계는 거부됩니다. 시간을 직접 입력하거나, Length를 입력하거나(필드에 표시되는 여백 포함 클립 길이입니다. Out이 그에 맞춰 조정됩니다), 타임라인을 끌거나, **Preview selection**을 사용할 수 있습니다.
7. **Preview selection**은 정확한 탐색을 위해 위젯 영역을 임시로 내장 YouTube 플레이어로 바꿉니다. **Back to YouGlish results**를 누르면 다시 둘러보기로 돌아갑니다. **Set In**과 **Set Out**은 YouGlish가 문서화된 절대 재생 위치를 제공하지 않으므로 이 미리보기가 필요합니다.
8. 다운로드 설정은 처음에 접혀 있습니다. 기본 해상도는 1080p 이하에서 사용 가능한 가장 높은 해상도입니다. 다운로드할 때 1080p 요청은 사용 가능한 더 낮은 원본 해상도도 허용합니다. 그 밖에 선택한 해상도는 그대로 정확히 유지됩니다.
9. 대상 폴더를 고르고 선택 영역을 기존의 순차 다운로드 대기열에 추가하세요. **Precise Cut**, 일시 정지/재개/취소/재시도, 자막 삽입, Finder에서 보기가 그대로 제공됩니다.

**Account & Settings**는 기본적으로 익명입니다. 지원되는 설치된 브라우저는 macOS의 일반적인 앱 위치에서 찾습니다. 하나를 고르면 yt-dlp는 자막과 다운로드를 위해 그 브라우저의 로컬 쿠키 저장소를 읽을 수 있습니다. 쿠키는 YouGlish에 주입되지 않으며 설정에 저장되지 않습니다. 위젯은 자체 WebView 세션을 사용합니다. 앱 환경설정과 대기열 식별자는 TubeCutter와 별개입니다.

## 언어

앱 인터페이스는 영어와 그 밖의 19개 언어로 제공됩니다: 아랍어, 벵골어, 중국어(간체), 필리핀어, 프랑스어, 독일어, 힌디어, 인도네시아어, 이탈리아어, 일본어, 한국어, 페르시아어, 포르투갈어(브라질), 러시아어, 스페인어, 텔루구어, 태국어, 터키어, 베트남어. 기본적으로 시스템 언어를 따릅니다. 다른 언어를 고르려면 **Account & Settings → Language**를 여세요. 선택은 즉시 적용되고 기억됩니다. 아랍어와 페르시아어는 오른쪽에서 왼쪽으로 배치됩니다.

번역은 `src/locales/<code>.json`에 있으며, 영어 문장이 키 역할을 합니다. 번역을 추가하거나 고치는 방법은 [현지화 안내](../LOCALIZATION.md)를 참고하세요.

## 개발

빌드 안내는 영어로만 제공됩니다: [영어 README](../../README.md#development)를 보세요.
