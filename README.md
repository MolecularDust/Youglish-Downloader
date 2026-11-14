# YouGlish Downloader

### 🎧 Hear it. Trim it. Keep the moment.

**Find any word or phrase in real speech, then save the exact clip.** YouGlish Downloader pairs the YouGlish pronunciation search with a desktop clipper, so you can search a phrase in the language and accent you choose, hear how people actually say it in context, and download just the moment you need.

- 🎓 **Language learners:** hear real people say it in real conversations, not just textbook recordings.
- 👩‍🏫 **Teachers:** build ready-to-play example clips for class, tailored to your lesson.
- 🔎 **Anyone hunting a phrase:** find where a phrase is spoken on YouTube, in the language you pick, and keep just that moment.

The interface speaks 19 languages besides English. Download only content you own or have permission to download.

![YouGlish Downloader app: search a phrase, trim the clip, and add it to the download queue](docs/images/app-preview.webp)

A desktop fork of TubeCutter for manually finding speech examples with the official YouGlish widget. This project has its own app identifier and preferences.

## Use

Open `src-tauri/target/debug/bundle/macos/YouGlish Downloader.app` after building, or run `npm run desktop` for development.

1. Enter a search phrase, language, and optional accent, then Search. English with all accents is the default.
2. Browse and listen in YouGlish. Its selected sample caption fills File Name and stays there while playback continues.
3. Edit File Name to a phrase from that video's subtitles. Click **Look Up** or press Enter. Editing or leaving the field does not start a lookup. The button displays a spinner until matching succeeds or fails. This text is also the output filename (the container supplies the extension).
4. Supplied subtitles are preferred. Only original, untranslated automatic captions are used as fallback. Matching ignores case, punctuation, and apostrophe style; it spans adjacent cues and suppresses overlapping rolling text.
5. Video selection first defaults In/Out to zero and the full video duration. One lookup match sets In/Out to the containing subtitle segment boundaries, without padding. Multiple matches require choosing an occurrence; no match leaves the existing timings unchanged. These are subtitle boundaries, not word-level acoustic alignment.
6. Use the matching mini arrows to change either boundary or the length by exactly one second. Reset restores the whole video and clears invalid input text and validation errors. Invalid boundaries are rejected. You can still edit timestamps directly, type a Length (the padded clip length shown in the field; Out is adjusted to match), drag the timeline, or use Preview selection.
7. Preview selection temporarily switches the widget area to the inherited YouTube player for accurate seeking. Back to YouGlish results returns to browsing. Set In/Set Out require this preview because YouGlish does not expose a documented absolute playhead time.
8. Download settings are collapsed initially. The default resolution is the highest available at or below 1080p. At download time a 1080p request also permits lower available source resolutions. Other selected resolutions remain exact.
9. Choose a destination and add the selection to the inherited sequential download queue. Precise Cut, pause/resume/cancel/retry, subtitle embedding, and Finder reveal are retained.

Account & Settings defaults to anonymous. Installed supported browsers are detected in normal macOS application locations. Selecting one lets yt-dlp read its local cookie store for subtitles/downloads; cookies are not injected into YouGlish or stored in settings. The widget uses its own WebView session. App preferences and queue identity are separate from TubeCutter.

## Development

`npm run build`, `npm test`, and `npm run lint` check the frontend. `npm run desktop` launches the native development app. `node scripts/desktop.mjs build --debug --bundles app --config src-tauri/tauri.dev-bundle.conf.json` makes a local evaluation bundle.

The Rust toolchain version is pinned in `rust-toolchain.toml`; `rustup` installs it on first use. The `.app` includes yt-dlp, FFmpeg, FFprobe, Deno, and certificate resources. It is a local development build, not a notarized distribution release. Do not use the upstream release signing instructions or artifact hashes as verification of this fork. See `docs/PHONETIC_FORK_STATUS.md` for actual checks and limitations.

## Integration references

- YouGlish widget API: https://youglish.com/api/doc/js-api
- YouTube Terms: https://www.youtube.com/t/terms
- Google Privacy Policy: https://policies.google.com/privacy

YouGlish requires explicit permission for commercial API/widget use. No permission has been obtained or request sent. The widget remains attributed and its built-in controls remain visible. This fork does not automate search-result harvesting or make phonetic selection decisions.

## Working across Mac and Windows

Use GitHub as the shared source repository. Clone it on each computer, pull before starting work, and commit/push when finished. Downloads, cookies, local settings, dependencies, toolchains, and build output are intentionally excluded. Configure your download folder and authentication separately on each machine.

For a fresh checkout:

```sh
npm ci
npm run build
npm test
npm run lint
```

These commands check the shared frontend on either platform. Native builds also require Rust and the operating system dependencies described in [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

On an Apple Silicon Mac, fetch and prepare the pinned media tools before making a native bundle:

```sh
node scripts/install-tools.mjs
npm run prepare:sidecars
npm run desktop
```

Run native unit tests with `cargo test --manifest-path src-tauri/Cargo.toml`. Debug builds fall back to yt-dlp/FFmpeg found on `PATH` and print a warning when they do; release bundles use only the pinned sidecars.

**Windows:** build the portable ZIP with `npm run package:portable` (Windows 11 x64, system WebView2). It includes all four media tools and uses an application-local Data folder. An optional NSIS installer is available via `npm run package:windows`. See [Windows instructions](docs/WINDOWS.md) for status, tested behavior, and remaining limits. macOS packaging commands remain macOS-only.

## Agent collaboration

For concurrent development or an independent review, start with [collaboration instructions](docs/COLLABORATION.md) and [AGENTS.md](AGENTS.md). Each agent uses a separate branch and working folder. Return changes using the [handoff template](docs/HANDOFF_TEMPLATE.md).

## App-session cookies

With "App’s YouTube session" selected, a Netscape cookie file is written to `sessions/` inside the app’s private cache folder (mode 0600 on macOS) immediately before each Look Up, Analyze or download, and deleted when that yt-dlp run ends. Queued downloads hold no cookie file; they take a fresh snapshot when they start. Files left by a crash or force-quit are removed the next time the app starts, as are stale `.tubecutter-<pid>-*.partial` staging folders in the saved destination. Windows file protection relies on the user-profile folder’s default permissions and has not been tested.
