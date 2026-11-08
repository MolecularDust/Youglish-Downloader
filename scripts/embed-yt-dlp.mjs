// Copies the prepared, unpacked yt-dlp into a built macOS app bundle (Tauri's resource copier
// cannot handle its framework layout). Usage: node scripts/embed-yt-dlp.mjs <App.app> [--reseal]
import { cpSync, existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
const [app, flag] = process.argv.slice(2);
if (!app || !existsSync(join(app, "Contents")))
  throw Error("Pass the path of a built .app bundle.");
if (!existsSync("src-tauri/yt-dlp-macos/yt-dlp_macos"))
  throw Error("Run npm run prepare:sidecars first.");
const target = resolve(app, "Contents/Resources/yt-dlp");
rmSync(target, { recursive: true, force: true });
cpSync("src-tauri/yt-dlp-macos", target, { recursive: true, verbatimSymlinks: true });
if (flag === "--reseal") {
  // Adding files invalidates the app's seal. Re-seal without --deep so nested code keeps its own signature.
  const r = spawnSync("codesign", ["--force", "--sign", "-", resolve(app)], {
    stdio: "inherit",
  });
  if (r.status !== 0) throw Error("Re-sealing the app failed");
}
console.log(`Embedded yt-dlp into ${app}`);
