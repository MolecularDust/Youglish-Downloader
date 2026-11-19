import { existsSync, mkdirSync, rmSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildRelease, run, stagePayload } from "./windows-payload.mjs";
if (process.platform !== "win32" || !["x64", "arm64"].includes(process.arch))
  throw Error("Build on Windows x64 or ARM64.");
const makensis = join(
  process.env.LOCALAPPDATA ?? "",
  "tauri",
  "NSIS",
  "makensis.exe",
);
if (!existsSync(makensis))
  throw Error(
    `makensis not found at ${makensis}. Run npm run package:windows once so Tauri downloads NSIS.`,
  );
buildRelease();
const payload = resolve(".tools/installer/payload");
rmSync(payload, { recursive: true, force: true });
mkdirSync(payload, { recursive: true });
stagePayload(payload);
const version = "0.1.0";
const outDir = resolve("dist-installer");
mkdirSync(outDir, { recursive: true });
const outFile = join(
  outDir,
  `YouGlish-Downloader-Setup_${version}_${process.arch}.exe`,
);
if (existsSync(outFile)) unlinkSync(outFile);
run(makensis, [
  `/DPAYLOAD=${payload}`,
  `/DOUTFILE=${outFile}`,
  `/DICON=${resolve("src-tauri/icons/icon.ico")}`,
  `/DVERSION=${version}`,
  resolve("scripts/installer/YouGlishSetup.nsi"),
]);
console.log(`Created setup with install and portable options: ${outFile}`);
