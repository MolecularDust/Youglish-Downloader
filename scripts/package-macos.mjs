import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw Error("This packaging workflow currently targets macOS Apple Silicon.");
function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (r.status !== 0) throw Error(`${cmd} failed (${r.status})`);
  return r;
}
run(process.execPath, ["scripts/prepare-sidecars.mjs"]);
run(process.execPath, [
  "scripts/desktop.mjs",
  "build",
  "--bundles",
  "app",
  "--config",
  "src-tauri/tauri.bundle.conf.json",
]);
const app = resolve("src-tauri/target/release/bundle/macos/YouGlish Downloader.app");
run(process.execPath, ["scripts/embed-yt-dlp.mjs", app]);
const binaries = join(app, "Contents/MacOS");
const ytDlp = join(app, "Contents/Resources/yt-dlp/yt-dlp_macos");
const pathOf = (name) => (name === "yt-dlp" ? ytDlp : join(binaries, name));
// Approved by the user on 2026-10-20. Never apply this entitlement to the main app.
run("codesign", [
  "--force",
  "--options",
  "runtime",
  "--entitlements",
  "src-tauri/yt-dlp.entitlements.plist",
  "--sign",
  "-",
  ytDlp,
]);
// Deliberately omit --deep: retain the other executables' existing restrictions.
run("codesign", ["--force", "--options", "runtime", "--sign", "-", app]);
run("codesign", ["--verify", "--deep", "--strict", app]);
for (const name of [
  "video-downloader",
  "yt-dlp",
  "ffmpeg",
  "ffprobe",
  "deno",
]) {
  const details = spawnSync(
    "codesign",
    ["-dv", "--verbose=2", pathOf(name)],
    { encoding: "utf8" },
  );
  if (
    details.status !== 0 ||
    !/flags=.*runtime/.test(details.stdout + details.stderr)
  )
    throw Error(`Hardened runtime is missing from ${name}`);
  const r = spawnSync(
    "codesign",
    ["-d", "--entitlements", ":-", pathOf(name)],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw Error(`Cannot inspect ${name}'s signature`);
  const text = r.stdout + r.stderr;
  const exception = text.includes(
    "<key>com.apple.security.cs.disable-library-validation</key>",
  );
  if (exception !== (name === "yt-dlp"))
    throw Error(`Unexpected library validation entitlement on ${name}`);
  if (
    /<key>com.apple.security.cs.allow-(jit|unsigned-executable-memory)<\/key>/.test(
      text,
    )
  )
    throw Error(`Unexpected JIT entitlement on ${name}`);
}
run(ytDlp, ["--version"]);
run(
  join(binaries, "deno"),
  ["eval", 'console.log("Signed interpreter runtime: OK")'],
  { env: { ...process.env, DENO_V8_FLAGS: "--jitless" } },
);
mkdirSync(".tools", { recursive: true });
const temporary = mkdtempSync(resolve(".tools/package-"));
const staging = join(temporary, "image");
mkdirSync(staging);
cpSync(app, join(staging, "YouGlish Downloader.app"), {
  recursive: true,
  verbatimSymlinks: true,
});
run("codesign", [
  "--verify",
  "--deep",
  "--strict",
  join(staging, "YouGlish Downloader.app"),
]);
symlinkSync("/Applications", join(staging, "Applications"));
const image = join(temporary, "YouGlish Downloader_0.1.0_aarch64.dmg");
run("hdiutil", [
  "create",
  "-volname",
  "TubeCutter",
  "-srcfolder",
  staging,
  "-format",
  "UDZO",
  image,
]);
run("hdiutil", ["verify", image]);
const destination = resolve("src-tauri/target/release/bundle/dmg");
mkdirSync(destination, { recursive: true });
const finalImage = join(destination, "YouGlish Downloader_0.1.0_aarch64.dmg");
renameSync(image, finalImage);
const hashes = {
  target: "aarch64-apple-darwin",
  signing: "ad-hoc hardened runtime",
  libraryValidationException: "yt-dlp only; user-approved",
  deno: "JIT disabled",
  files: {},
};
for (const name of ["video-downloader", "yt-dlp", "ffmpeg", "ffprobe", "deno"])
  hashes.files[name] = createHash("sha256")
    .update(readFileSync(pathOf(name)))
    .digest("hex");
hashes.files["YouGlish Downloader_0.1.0_aarch64.dmg"] = createHash("sha256")
  .update(readFileSync(finalImage))
  .digest("hex");
writeFileSync(
  "docs/release-artifacts.json",
  JSON.stringify(hashes, null, 2) + "\n",
);
console.log(`Verified app: ${app}\nVerified DMG: ${finalImage}`);
