import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const arches = {
  x64: { target: "x86_64-pc-windows-msvc", suffix: "" },
  arm64: { target: "aarch64-pc-windows-msvc", suffix: "-arm64" },
};
const arch = arches[process.arch];
if (process.platform !== "win32" || !arch)
  throw Error("Windows tool installer targets Windows x64 and ARM64 only.");
const { target, suffix } = arch;
mkdirSync("src-tauri/binaries", { recursive: true });
const manifest = [];
for (const name of ["yt-dlp", "ffmpeg", "ffprobe", "deno"]) {
  const src = `.tools/bin/${name}.exe`,
    dst = `src-tauri/binaries/${name}-${target}.exe`;
  const r = spawnSync(src, [name.startsWith("ff") ? "-version" : "--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) throw Error(`Cannot execute ${name}: ${r.stderr}`);
  copyFileSync(src, dst);
  manifest.push({
    name,
    target,
    sha256: createHash("sha256").update(readFileSync(src)).digest("hex"),
    version: r.stdout.split("\n")[0].trim(),
  });
}
writeFileSync(
  `docs/tool-manifest-windows${suffix}.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
