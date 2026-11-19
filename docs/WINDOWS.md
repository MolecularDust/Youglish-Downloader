# Windows builds and portable use

Windows x64 and ARM64 are supported on the shared codebase. The portable ZIP and optional NSIS installer build on Windows 11 x64 and ARM64.

## Status

Tested on Windows 11 ARM64 and x64:

- All 40 native Rust unit tests pass on `aarch64-pc-windows-msvc` and `x86_64-pc-windows-msvc`.
- Portable ZIP and NSIS setup installer packages build cleanly for both architectures with pinned media sidecars and bundled app-local MSVC CRT DLLs.
- On Windows 11 x64: Anonymous metadata, caption lookup, and remote segment downloads pass, including a Fast Cut download through the native queue; Opera cookie extraction and a precise segment download pass when Opera is closed.

Not yet tested: authenticated caption retrieval, private or account-restricted videos, a clean Windows VM without development tools, a real USB FAT/exFAT volume, the GUI overwrite dialog, subtitle embedding, and installing or uninstalling the NSIS build. The binaries are unsigned.

Two earlier failures were resolved:

- An apparent HTTP 429 was a misclassified FFmpeg exit code (`4294957242`, which is -10054, a connection reset). Only explicit HTTP status markers are now treated as HTTP errors.
- Remote segment downloads reset because yt-dlp's FFmpeg step didn't receive the Windows manual proxy that metadata requests used. The app now forwards an unambiguous manual HTTP proxy explicitly.
- Look Up took about 23 s in a normal desktop session, but 4 s from a shell with proxy variables set. With only `--proxy`, part of yt-dlp's pipeline connected directly and waited for timeouts. The app now also passes the proxy to yt-dlp as `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY`, and Look Up takes about 6 s.

## Development prerequisites

Use Node.js 24 LTS (or Node.js 22+ ARM64 on Windows ARM64), Rust with the `x86_64-pc-windows-msvc` or `aarch64-pc-windows-msvc` toolchain, Visual Studio C++ Build Tools (Desktop C++ workload, MSVC and Windows SDK, including ARM64 build tools if targeting ARM64), and system WebView2. The launch script discovers the usual user Cargo installation even when a shell's PATH predates Rust installation. Tauri prerequisites: https://v2.tauri.app/start/prerequisites/#windows .

From the repository root:

```powershell
npm ci
node scripts/install-tools.mjs
npm run prepare:sidecars
npm run build
npm test
npm run lint
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop
```

The scripts dispatch to Windows implementations on win32; the Apple Silicon installer, sidecar signing, and macOS packaging are unchanged. Both Windows x64 and ARM64 are supported natively; other architectures are rejected explicitly.

## Portable ZIP (preferred)

```powershell
npm run package:portable
```

Output: `dist-portable/YouGlish-Downloader-Windows-Portable.zip` (x64) or `dist-portable/YouGlish-Downloader-Windows-Portable-ARM64.zip` (ARM64).

Extract the entire ZIP into any writable directory, then run `YouGlish Downloader.exe`. No installation, administrator token, Node.js, Rust, or separately installed media tools are needed. Windows 11 (x64 or ARM64) and the system WebView2 runtime are required; the portable build never installs WebView2. Extract before running; do not launch from inside the ZIP.

The ZIP includes the app, yt-dlp.exe, ffmpeg.exe, ffprobe.exe, deno.exe, the certificate store, licenses and notices, exact tool versions and hashes, and app-local Microsoft CRT DLLs. Build inputs are pinned and verified against upstream SHA-256 digests. ZIP entries are sorted with fixed timestamps, and each build stages fresh files, so an earlier runtime Data folder is never included. Byte-for-byte reproducibility across different compiler installations is not claimed.

`portable.marker` next to the executable enables portable data paths:

- `Data/settings.json`: application settings, including selected paths and browser choice.
- `Data/Cache/captions`: per-request temporary caption metadata, removed after each request.
- `Data/WebView2`: embedded WebView browsing and session data.
- `Data/Temp` and `Data/Deno`: media-process temporary files and the Deno cache.
- `Data/Diagnostics/media.jsonl`: safe media diagnostics, rotated at about 1 MiB into `media.previous.jsonl`.
- Downloads and their staging folders use the selected download destination. Publishing also works on filesystems without hard links, such as exFAT/FAT USB storage.

Move the whole app folder, including Data, with the app closed. Saved absolute download and imported-cookie paths may need to be selected again after a drive-letter change. A nonwritable portable directory is reported rather than requesting elevation. Windows and WebView2 may still keep system-level runtime and diagnostic state; this is not a claim of zero OS writes.

External browser profiles and credentials stay in the browser's normal OS locations. Choosing a browser only authorizes yt-dlp's existing cookie extraction; cookies are never copied into settings. Close all browser windows and background processes before extraction. A database-copy failure (for example, a sharing violation) is reported separately from a decryption failure. Chromium's Windows cookie encryption can prevent extraction; import a Netscape cookies file if needed. Cookie decryption and OS security protections are never bypassed.

Diagnostics contain only allowlisted codes, flags, and tool version labels. They never contain raw output, URLs, cookies, paths, proxy addresses, or IP addresses.

## Native behavior

Windows media processes use Job Objects with kill-on-close ownership. Processes start suspended, are assigned to the job, and then resume. Descendants stay owned for cancellation and exit cleanup. Pause and resume suspend and resume job-member processes through the native Windows API. The running process is kept, so a long pause can still expire server connections. These controls don't persist across app restarts.

Windows resolves `.exe` media tools next to the app, bundled certificates under resources, and common per-user and system browser executable locations. Completed files are revealed in Explorer. macOS keeps Unix process groups and Finder reveal. Filename validation also rejects Windows reserved device names and invalid characters.

## Setup installer (recommended for users)

```powershell
npm run package:windows-installer
```

This creates `dist-installer/YouGlish-Downloader-Setup_0.1.0_x64.exe` (on x64) or `dist-installer/YouGlish-Downloader-Setup_0.1.0_arm64.exe` (on ARM64). The setup asks the user to choose one of two options:

- **Install normally:** installs to `%LOCALAPPDATA%\Programs\YouGlish Downloader` with a Start menu shortcut and an entry in Apps & features. No administrator rights are needed. Uninstalling removes the program but not the user's settings and caches in AppData.
- **Portable:** copies the program into `Documents\YouGlish Downloader Portable` (or a folder the user chooses). It writes `portable.marker`, so settings and caches stay beside the program. Nothing is added to the Start menu or registry.

Silent options for scripted installs: `Setup.exe /S` installs normally, and `Setup.exe /S /PORTABLE=1 /D=<folder>` makes a portable copy in that folder.

The setup doesn't install WebView2. Windows 11 includes it; a machine without it needs the runtime installed first.

## Portable ZIP (alternative)

```powershell
npm run package:portable
```

This creates `dist-portable/YouGlish-Downloader-Windows-Portable.zip` (x64) or `dist-portable/YouGlish-Downloader-Windows-Portable-ARM64.zip` (ARM64). Extract it anywhere writable and run the program. It contains the same files as the setup's portable option.

## Redistribution

The binaries are unsigned evaluation builds. Public redistribution still requires the complete corresponding source and license notices for the bundled GPL tools, as described in [DEPENDENCIES.md](DEPENDENCIES.md).
