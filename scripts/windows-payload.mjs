import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Shared by the portable ZIP and the setup installer so both ship the same app files.

export function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (r.status !== 0) throw Error(`${cmd} failed (${r.status})`);
}

export function buildRelease() {
  run(process.execPath, ["scripts/install-tools.mjs"]);
  run(process.execPath, ["scripts/prepare-sidecars.mjs"]);
  run(process.execPath, [
    "scripts/desktop.mjs",
    "build",
    "--no-bundle",
    "--config",
    "src-tauri/tauri.windows.conf.json",
  ]);
}

// Copies everything the app needs into `stage`. The portable marker is added by callers, not here,
// so a regular install never looks like a portable copy.
export function stagePayload(stage) {
  copyFileSync(
    "src-tauri/target/release/video-downloader.exe",
    join(stage, "YouGlish Downloader.exe"),
  );
  for (const name of ["yt-dlp", "ffmpeg", "ffprobe", "deno"])
    copyFileSync(`.tools/bin/${name}.exe`, join(stage, `${name}.exe`));
  mkdirSync(join(stage, "resources"), { recursive: true });
  copyFileSync(
    "src-tauri/resources/cacert.pem",
    join(stage, "resources/cacert.pem"),
  );
  cpSync("LICENSES", join(stage, "LICENSES"), { recursive: true });
  for (const name of [
    "DEPENDENCIES.md",
    "WINDOWS.md",
    "tool-manifest-windows.json",
    "tool-downloads-windows.json",
  ])
    copyFileSync(`docs/${name}`, join(stage, name));
  copyFileSync("LICENSE", join(stage, "LICENSE"));
  // Ship the Microsoft redistributable app-local CRT, so no runtime installer/admin is needed.
  const ps = `$ErrorActionPreference='Stop'
$vswhere=Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft Visual Studio/Installer/vswhere.exe'
$vs=& $vswhere -latest -products * -property installationPath
$crt=Get-ChildItem (Join-Path $vs 'VC/Redist/MSVC') -Filter 'Microsoft.VC*.CRT' -Directory -Recurse | Where-Object FullName -match '[\\\\/]x64[\\\\/]' | Sort-Object FullName -Descending | Select-Object -First 1
if(!$crt){throw 'Cannot locate redistributable x64 CRT'}
Copy-Item (Join-Path $crt.FullName '*.dll') -Destination $env:YG_STAGE`;
  run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
    env: { ...process.env, YG_STAGE: stage },
  });
}
