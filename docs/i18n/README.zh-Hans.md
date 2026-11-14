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
    <td align="center"><b>简体中文</b></td>
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
    <td align="center"><a href="README.tr.md">Türkçe</a></td>
    <td align="center"><a href="README.vi.md">Tiếng Việt</a></td>
  </tr>
</table>

</details>

</div>
<!-- languages:end -->

# YouGlish Downloader

### 🎧 听见它。剪下它。留住那一刻。

**在真实语音中找到任何词语或短语，然后保存确切的片段。** YouGlish Downloader 将 YouGlish 发音搜索与桌面剪辑工具结合起来：用你选择的语言和口音搜索短语，听人们在语境中的真实说法，并只下载你需要的那一刻。

- 🎓 **语言学习者：** 听真实的人在真实对话中说它，而不只是教科书录音。
- 👩‍🏫 **教师：** 为课堂制作可直接播放、贴合课程的示例片段。
- 🔎 **寻找某个短语的人：** 找到 YouTube 上这个短语出现的位置，使用你选择的语言，只保留那一刻。

只下载你拥有或已获得许可下载的内容。

![YouGlish Downloader 应用：搜索短语、剪裁片段并加入下载队列](../images/app-preview.webp)

TubeCutter 的桌面分支，用于借助 YouGlish 官方小组件手动查找语音示例。本项目有自己的应用标识符和偏好设置。

## 下载

- **Windows：** [下载最新版本](https://github.com/MolecularDust/Youglish-Downloader/releases/latest)。可选择常规安装或便携版。
- **macOS（Apple 芯片）：** [下载 macOS 版本](https://github.com/MolecularDust/Youglish-Downloader/releases/tag/v0.3.0-macos)。

## 设置 YouTube 访问

1. 打开应用并点击 **Account & Settings**。
2. 在 **YouGlish playback account** 下，点击 **1. Sign in to Google ↗**，然后点击 **2. Connect YouTube ↗**，如有提示请选择你的频道。完成后关闭账户窗口。**Check playback ↗** 会播放一段示例视频，确认一切正常。
3. 在 **Subtitle and download authentication** 下，为 **Download authentication** 选择 **App’s YouTube session**。

你现在可以使用 YouGlish Downloader 了。

如果你想改用已登录的浏览器，请在 **Download authentication** 中选择它。在 Windows 上，搜索前请先关闭该浏览器：基于 Chromium 的浏览器在运行时会锁定其 Cookie 文件，因此应用自己的会话在那里更可靠。只使用你自己的账户，不要导入或分享他人的 Cookie。

你也可以保持 **Anonymous**，但 YouTube 的反机器人检查对匿名访问更严格，部分视频可能会失败。

## 使用

构建后打开 `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app`，或运行 `npm run desktop` 进行开发。

1. 输入搜索短语、语言和可选的口音，然后搜索。默认为英语（所有口音）。
2. 在 YouGlish 中浏览和试听。所选示例的字幕会填入 File Name，并在播放时保持不变。
3. 将 File Name 改为该视频字幕中的一个短语。点击 **Look Up** 或按 Enter。编辑或离开该字段不会开始查找。按钮会显示加载动画，直到匹配成功或失败。此文本也是输出文件名（容器会添加扩展名）。
4. 优先使用随附字幕。仅在没有时才使用原始、未翻译的自动字幕。匹配时忽略大小写、标点和撇号样式；会跨越相邻字幕，并去除重叠的滚动文本。
5. 选择视频时，In/Out 默认为零和完整视频时长。一个匹配会将 In/Out 设为包含它的字幕段边界，不加填充。多个匹配需要选择一个出现位置。没有匹配时保持现有时间不变。这些是字幕段边界，而非词级别的语音对齐。
6. 使用微型箭头以恰好一秒为单位调整任一边界或长度。**Reset** 恢复整个视频，并清除无效输入和验证错误。无效的边界会被拒绝。你也可以直接编辑时间戳，输入 Length（字段中显示的填充后片段长度；Out 会相应调整），拖动时间轴，或使用 **Preview selection**。
7. **Preview selection** 会暂时把小组件区域切换为嵌入的 YouTube 播放器，以便精确定位。**Back to YouGlish results** 返回浏览。**Set In** 和 **Set Out** 需要此预览，因为 YouGlish 不提供已记录的绝对播放头时间。
8. 下载设置默认折叠。默认分辨率为不超过 1080p 的最高可用分辨率。下载时，1080p 请求还允许较低的可用源分辨率。其他所选分辨率保持精确。
9. 选择目标文件夹，并将所选片段加入继承的顺序下载队列。**Precise Cut**、暂停/继续/取消/重试、字幕嵌入以及在 Finder 中显示均予保留。

**Account & Settings** 默认为匿名。应用会在 macOS 常规应用位置中检测受支持的已安装浏览器。选择一个后，yt-dlp 可以读取其本地 Cookie 存储用于字幕和下载；Cookie 不会注入 YouGlish，也不会保存在设置中。小组件使用它自己的 WebView 会话。应用偏好和队列身份与 TubeCutter 分开。

## 语言

应用界面提供英语以及另外 19 种语言：阿拉伯语、孟加拉语、简体中文、菲律宾语、法语、德语、印地语、印度尼西亚语、意大利语、日语、韩语、波斯语、葡萄牙语（巴西）、俄语、西班牙语、泰卢固语、泰语、土耳其语和越南语。默认跟随系统语言。要选择其他语言，请打开 **Account & Settings → Language**；选择会立即生效并被记住。阿拉伯语和波斯语从右到左排版。

译文保存在 `src/locales/<code>.json` 中，英文文本即为键。如需添加或更正译文，请参阅[本地化说明](../LOCALIZATION.md)。

## 开发

构建说明仅提供英文：请参阅[英文 README](../../README.md#development)。
