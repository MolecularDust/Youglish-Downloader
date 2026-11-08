import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { buildRelease, run, stagePayload } from "./windows-payload.mjs";
if (process.platform !== "win32" || process.arch !== "x64")
  throw Error("Build on Windows x64.");
buildRelease();
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
stagePayload(stage);
writeFileSync(
  join(stage, "portable.marker"),
  "YouGlish portable data mode v1\n",
);
writeFileSync(
  join(stage, "README.txt"),
  "Extract the entire ZIP to a writable directory, then run YouGlish Downloader.exe.\r\nWindows 11 x64 with system WebView2 is required. No Node.js or Rust installation is needed.\r\nSettings, WebView2 data, and caches are in Data beside the executable. Downloads use your selected destination.\r\nBrowser cookies stay in browser profiles; imported cookies remain at their chosen location.\r\nClose the app before ejecting USB storage. Do not run from within the ZIP.\r\nThis unsigned build may trigger Windows reputation prompts.\r\n",
);
const ps = `$ErrorActionPreference='Stop'
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
    YG_ZIP: zipPath,
  },
});
console.log("Created dist-portable/YouGlish-Downloader-Windows-Portable.zip");
