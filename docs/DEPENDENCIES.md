# Architecture and dependencies

React 19 and TypeScript render the interface. Tauri 2 owns the WKWebView, Rust command bridge, application lifecycle and bundle. Vite builds static frontend assets. No Electron, remote app UI, shell plugin, or general-purpose command-execution API is exposed.

`src/domain.ts` contains URL and timestamp rules. `src/main.tsx` coordinates the real player, editor and queue. `src-tauri/src/model.rs` validates native requests independently. `platform.rs` resolves executable paths and handles process groups. `player.rs` serves the static IFrame API host on an ephemeral IPv4 loopback port. `lib.rs` implements metadata, settings, native dialogs and background download workers.

## Tools and licensing

- React / React DOM: MIT, https://github.com/facebook/react
- Tauri: MIT OR Apache-2.0, https://github.com/tauri-apps/tauri
- rfd native dialogs: MIT, https://github.com/PolyMeilex/rfd
- yt-dlp macOS unpacked (onedir) release `yt-dlp_macos.zip`, embedded in the app at `Contents/Resources/yt-dlp/` by `scripts/embed-yt-dlp.mjs`. It starts in about 0.2 s; the single-file build unpacked itself on every launch and took about 5 s. The upstream release includes Python; executable distribution contains additional dependencies and follows upstream bundled licensing (GPLv3+). https://github.com/yt-dlp/yt-dlp/blob/master/THIRD_PARTY_LICENSES.txt
- FFmpeg / FFprobe: static ARM64 release from https://ffmpeg.martin-riedl.de/ ; build enables GPL and version3, including x264/x265 and other libraries. Treat these builds as GPLv3+. Corresponding sources/build recipe must accompany public redistribution under applicable licenses. https://github.com/FFmpeg/FFmpeg and https://github.com/markus-perl/ffmpeg-build-script
- Deno: MIT with third-party notices, https://github.com/denoland/deno
- YouTube IFrame API is loaded from YouTube, subject to Google's API terms and required player behavior. Player controls remain unobstructed.

`tool-manifest.json` records the versions and SHA256 hashes of staged sidecars before the bundler applies its final signatures. `LICENSES` contains notices fetched from upstream. This local ad-hoc signed build is for development evaluation; public release still requires assembling complete corresponding source and third-party notices for the exact media binary builds, plus Developer ID signing and notarization. No claim of release licensing clearance is made.

## Player identity

The player uses the official IFrame API inside an HTTP page at `http://127.0.0.1:<random>/player`. That page sets `strict-origin-when-cross-origin` and supplies its real origin to YouTube. This avoids relying on the custom Tauri URL as a Referer. Parent/child messages require the expected iframe window, exact local origin and per-video random token. Native IPC is available only to the main application window, not the local player page.

References: https://developers.google.com/youtube/iframe_api_reference and https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity . Error 153 is shown explicitly; this approach must be tested in the packaged WKWebView, not inferred from browser success.

## Download behavior

yt-dlp receives structured arguments with `--ignore-config` and `--` before the normalized URL. Resolution filters use equality and explicit codec filters have no quality-degrading fallback. MKV preserves a wider range of streams; remux failures are reported. MP4 Original Compatible Audio selects original AAC. Best Audio retains yt-dlp's best source audio and can fail if the muxer cannot accept it. Audio-only places the original audio stream into the selected MP4/MKV container. No Audio requires a video-only source.

Sections use `--download-sections`. Fast Cut stream-copies and can land on keyframes. Precise Cut uses `--force-keyframes-at-cuts` with explicit FFmpeg output encoder settings: H.264/libx264, HEVC/libx265, AV1/libaom-av1 or VP9/libvpx-vp9, CRF 18 and AAC audio. Automatic Precise Cut uses H.264/AAC. There is no dimension scaling. FFprobe verifies duration, requested height, codec, and expected audio presence. A duration deviation is displayed, including a warning beyond 250 ms. A local stream-copy pass aligns Fast Cut to the first retained video packet so earlier audio does not create a leading gap. Audio-only Fast Cut rejects ambiguous timestamp layouts instead of guessing. This is a structural media check, not a perceptual lip-sync guarantee.

A failed section is never automatically retried as a whole-video download. Some delivery formats still transfer more data than the requested interval; byte-range savings cannot be guaranteed by yt-dlp. No hidden transcoding is performed for ordinary downloads.

Unique output names and `--no-overwrites` protect existing files. Failed/canceled partial files remain for inspection. Pause/resume uses Unix process-group STOP/CONT, preserving the running process, not resumability across app restarts; server connections can expire during a long pause. Cancellation kills the entire process group and the parent is reaped. App exit cancels active downloads. Windows process-tree control and platform packaging remain future work.

Browser cookie access occurs only after the user explicitly chooses a session in Account & Settings. No custom Google login exists. Raw subprocess diagnostics are classified into safe errors and never sent to the UI or logged. Settings store paths and browser choice, not cookie content. Browser authentication is not exercised during anonymous integration tests.

The app bundles the Mozilla CA certificate store obtained from https://curl.se/ca/cacert.pem and passes it to media subprocesses via `SSL_CERT_FILE`. TLS certificate verification stays enabled. The packaging configuration requests ad-hoc signing of the outer macOS app as well as the standalone tools. These local signatures do not provide Developer ID trust or notarization.

Signed Deno is run with `DENO_V8_FLAGS=--jitless`. A JIT-enabled hardened binary failed the runtime smoke test; interpreter mode succeeded without adding any entitlements or weakening signing restrictions. This can make JavaScript challenge solving slower.

### Approved yt-dlp signing exception

On 20 October 2026, the user approved `com.apple.security.cs.disable-library-validation` only for yt-dlp, allowing its PyInstaller process to load bundled Python libraries with different signing identities. `scripts/package-macos.mjs` signs that executable with `src-tauri/yt-dlp.entitlements.plist`, then re-seals the main app without recursively re-signing the other executables. It verifies that the exception is absent from the main app, FFmpeg, FFprobe, and Deno, and that no JIT entitlement is present. Hardened runtime remains enabled. No system-wide setting, Keychain permission, or Gatekeeper exception is changed.

The packaging workflow verifies the signed yt-dlp and Deno runtimes before creating the DMG. Release media integration uses the exact packaged executables, bundled CA store, and JIT-disabled environment. `release-artifacts.json` records hashes after final signing; `release-media-test-results.json` records real output inspection and decode results. See `SIGNING_APPROVAL.md` for the scope and risk of the approved exception.

## Windows portable tools

Windows x64 uses the exact releases and upstream SHA-256 digests in tool-downloads-windows.json. Executable hashes and versions are in tool-manifest-windows.json. yt-dlp and Deno come from their upstream GitHub releases. FFmpeg and FFprobe come from the pinned BtbN autobuild autobuild-2026-11-13-12-43 (FFmpeg commit 88c46fce27, GPL variant, GPLv3+). Its source and build scripts are published at https://github.com/BtbN/FFmpeg-Builds/tree/autobuild-2026-11-13-12-43 . The GPL components pinned by those build scripts are x264 (https://code.videolan.org/videolan/x264.git at 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee), x265 (https://github.com/Multicorewareinc/x265.git at 5143a2a00ad0cc600831654a248b96ec7307eb4a), and the other scripts in scripts.d/ at that tag. The FFmpeg executables are distributed as separate processes. Their license is LICENSES/ffmpeg-windows.txt.

The portable build includes the app-local x64 Microsoft VC143 redistributable DLLs from the installed Visual Studio Build Tools redist directory. These are Microsoft runtime dependencies, not development tools. System Windows 11 DLLs and the installed WebView2 Runtime remain system dependencies.

Windows media processes start suspended, join a kill-on-close Job Object, then resume. Job membership includes media descendants. Pause/resume uses the Windows native process suspend/resume functions on job members; cancel terminates the job. The owning guard closes the job on failure, normal completion, or app exit. No shell command is used to execute media tools. File reveal uses Explorer with a structured argument.

Portable mode is enabled by portable.marker next to the executable. Settings, caption cache, media temp and Deno cache use Data there. WebView2's user-data directory is Data/WebView2. External browser profiles stay in the OS locations and imported cookie files stay at the selected paths. Cookies are never copied into settings. Chromium browser cookie encryption or locked profiles may prevent extraction; close the browser or explicitly import a Netscape cookies file. No elevation or encryption bypass is attempted.
