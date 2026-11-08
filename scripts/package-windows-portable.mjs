import { spawnSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
if (process.platform !== "win32" || process.arch !== "x64")
  throw Error("Build on Windows x64.");
function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (r.status !== 0) throw Error(`${cmd} failed (${r.status})`);
}
run(process.execPath, ["scripts/install-tools.mjs"]);
run(process.execPath, ["scripts/prepare-sidecars.mjs"]);
run(process.execPath, [
  "scripts/desktop.mjs",
  "build",
  "--no-bundle",
  "--config",
  "src-tauri/tauri.windows.conf.json",
]);
mkdirSync("dist-portable", { recursive: true });
const stage = join(
  mkdtempSync(resolve(".tools/portable-stage-")),
  "YouGlish Downloader",
);
const zipPath = resolve(
  "dist-portable/YouGlish-Downloader-Windows-Portable.zip",
);
if (existsSync(zipPath)) unlinkSync(zipPath);
mkdirSync(stage, { recursive: true });
copyFileSync(
  "src-tauri/target/release/video-downloader.exe",
  join(stage, "YouGlish Downloader.exe"),
);
for (const name of ["yt-dlp", "ffmpeg", "ffprobe", "deno"])
  copyFileSync(`.tools/bin/${name}.exe`, join(stage, `${name}.exe`));
mkdirSync(join(stage, "resources"));
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
writeFileSync(
  join(stage, "portable.marker"),
  "YouGlish portable data mode v1\n",
);
writeFileSync(
  join(stage, "README.txt"),
  "Extract the entire ZIP to a writable directory, then run YouGlish Downloader.exe.\r\nWindows 11 x64 with system WebView2 is required. No Node.js or Rust installation is needed.\r\nSettings, WebView2 data, and caches are in Data beside the executable. Downloads use your selected destination.\r\nBrowser cookies stay in browser profiles; imported cookies remain at their chosen location.\r\nClose the app before ejecting USB storage. Do not run from within the ZIP.\r\nThis unsigned build may trigger Windows reputation prompts.\r\n",
);
// Ship the Microsoft redistributable app-local CRT, so no runtime installer/admin is needed.
const ps = `$ErrorActionPreference='Stop'
$vswhere=Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft Visual Studio/Installer/vswhere.exe'
$vs=& $vswhere -latest -products * -property installationPath
$crt=Get-ChildItem (Join-Path $vs 'VC/Redist/MSVC') -Filter 'Microsoft.VC*.CRT' -Directory -Recurse | Where-Object FullName -match '[\\\\/]x64[\\\\/]' | Sort-Object FullName -Descending | Select-Object -First 1
if(!$crt){throw 'Cannot locate redistributable x64 CRT'}
Copy-Item (Join-Path $crt.FullName '*.dll') -Destination $env:YG_STAGE
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream=[IO.File]::Open($env:YG_ZIP,[IO.FileMode]::CreateNew)
$zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try { Get-ChildItem -LiteralPath $env:YG_STAGE -File -Recurse | Sort-Object FullName | ForEach-Object {
$name='YouGlish Downloader/'+$_.FullName.Substring($env:YG_STAGE.Length+1).Replace([char]92,[char]47)
$entry=$zip.CreateEntry($name,[IO.Compression.CompressionLevel]::Optimal)
$entry.LastWriteTime=[DateTimeOffset]::new(2020,1,1,0,0,0,[TimeSpan]::Zero)
$inputStream=$_.OpenRead();$outputStream=$entry.Open();try{$inputStream.CopyTo($outputStream)}finally{$inputStream.Dispose();$outputStream.Dispose()}
} } finally {$zip.Dispose();$stream.Dispose()}`;
run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
  env: {
    ...process.env,
    YG_STAGE: stage,
    YG_ZIP: resolve("dist-portable/YouGlish-Downloader-Windows-Portable.zip"),
  },
});
console.log("Created dist-portable/YouGlish-Downloader-Windows-Portable.zip");
