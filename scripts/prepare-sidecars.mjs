if (process.platform === 'win32') { await import('./prepare-sidecars-windows.mjs'); process.exit(0); }
import {
  cpSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
  readdirSync,
  rmSync,
  copyFileSync,
  mkdirSync,
  chmodSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw Error(
    "This preparation script currently supports macOS Apple Silicon only.",
  );
mkdirSync("src-tauri/binaries", { recursive: true });
const manifest = [];
// yt-dlp ships as an unpacked folder bundled as a resource. Every Mach-O in it must carry a valid ad-hoc signature.
const ytDlpSource = ".tools/yt-dlp-dir";
const ytDlpTarget = "src-tauri/yt-dlp-macos";
function machO(path) {
  const fd = openSync(path, "r");
  const magic = Buffer.alloc(4);
  const n = readSync(fd, magic, 0, 4, 0);
  closeSync(fd);
  return (
    n === 4 &&
    ["feedface", "feedfacf", "cefaedfe", "cffaedfe", "cafebabe", "bebafeca"].includes(
      magic.toString("hex"),
    )
  );
}
function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}
if (!existsSync(`${ytDlpSource}/yt-dlp_macos`))
  throw Error("Unpacked yt-dlp is missing. Run node scripts/install-tools.mjs");
rmSync(ytDlpTarget, { recursive: true, force: true });
cpSync(ytDlpSource, ytDlpTarget, { recursive: true, verbatimSymlinks: true });
for (const file of files(ytDlpTarget)) {
  if (!machO(file)) continue;
  // Upstream ships every Mach-O ad-hoc signed. Keep valid signatures (re-signing framework
  // members individually fails); sign only what is missing or invalid.
  // Files inside a .framework keep upstream's signature: they cannot be verified or re-signed
  // individually, but they load correctly.
  if (file.includes(".framework/")) continue;
  if (spawnSync("codesign", ["--verify", file]).status === 0) continue;
  const signed = spawnSync("codesign", ["--force", "--sign", "-", file], {
    encoding: "utf8",
  });
  if (signed.status !== 0) throw Error(signed.stderr);
}
{
  const exe = `${ytDlpTarget}/yt-dlp_macos`;
  const deps = spawnSync("otool", ["-L", exe], { encoding: "utf8" });
  if (deps.status !== 0 || /\/opt\/homebrew|\/usr\/local/.test(deps.stdout))
    throw Error("yt-dlp has non-system dynamic dependencies");
  const version = spawnSync(exe, ["--version"], { encoding: "utf8" });
  if (version.status !== 0) throw Error("Cannot execute yt-dlp");
  manifest.push({
    name: "yt-dlp",
    target: "aarch64-apple-darwin",
    sha256: createHash("sha256").update(readFileSync(exe)).digest("hex"),
    version: version.stdout.split("\n")[0],
  });
}
for (const name of ["ffmpeg", "ffprobe", "deno"]) {
  const src = `.tools/bin/${name}`,
    dst = `src-tauri/binaries/${name}-aarch64-apple-darwin`;
  const deps = spawnSync("otool", ["-L", src], { encoding: "utf8" });
  if (deps.status !== 0) throw Error(`Cannot inspect ${name}`);
  if (/\/opt\/homebrew|\/usr\/local/.test(deps.stdout))
    throw Error(`${name} has non-system dynamic dependencies`);
  copyFileSync(src, dst);
  chmodSync(dst, 0o755);
  const result = spawnSync("codesign", ["--force", "--sign", "-", dst], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw Error(result.stderr);
  const version = spawnSync(
    src,
    [name === "ffmpeg" || name === "ffprobe" ? "-version" : "--version"],
    { encoding: "utf8" },
  );
  if (version.status !== 0) throw Error(`Cannot execute ${name}`);
  manifest.push({
    name,
    target: "aarch64-apple-darwin",
    sha256: createHash("sha256").update(readFileSync(dst)).digest("hex"),
    version: version.stdout.split("\n")[0],
  });
}
writeFileSync(
  "docs/tool-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Prepared ad-hoc signed macOS tools (yt-dlp unpacked folder, FFmpeg, FFprobe, Deno).");
