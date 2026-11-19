import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
const arches = {
  x64: { target: "x86_64-pc-windows-msvc", suffix: "" },
  arm64: { target: "aarch64-pc-windows-msvc", suffix: "-arm64" },
};
const arch = arches[process.arch];
if (process.platform !== "win32" || !arch)
  throw Error("Windows tool installer targets Windows x64 and ARM64 only.");
function copyVerified(src, dst) {
  if (
    existsSync(dst) &&
    createHash("sha256").update(readFileSync(src)).digest("hex") ===
      createHash("sha256").update(readFileSync(dst)).digest("hex")
  )
    return;
  copyFileSync(src, dst);
}
const tools = JSON.parse(
  readFileSync(
    new URL(
      `../docs/tool-downloads-windows${arch.suffix}.json`,
      import.meta.url,
    ),
    "utf8",
  ),
);
mkdirSync(".tools/bin", { recursive: true });
function find(dir, name) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isFile() && e.name === name) return p;
    if (e.isDirectory()) {
      const found = find(p, name);
      if (found) return found;
    }
  }
}
for (const tool of tools) {
  const archive = resolve(".tools", tool.asset);
  if (
    !existsSync(archive) ||
    createHash("sha256").update(readFileSync(archive)).digest("hex") !==
      tool.sha256
  ) {
    console.log(`Downloading ${tool.name}`);
    const r = await fetch(tool.url);
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    writeFileSync(archive, Buffer.from(await r.arrayBuffer()));
  }
  if (
    createHash("sha256").update(readFileSync(archive)).digest("hex") !==
    tool.sha256
  )
    throw Error(`Checksum mismatch: ${tool.name}`);
  if (tool.archive) {
    const dest = resolve(
      ".tools/extracted",
      tool.name + "-" + tool.sha256.slice(0, 12),
    );
    mkdirSync(dest, { recursive: true });
    const r = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Expand-Archive -LiteralPath $env:YG_ARCHIVE -DestinationPath $env:YG_EXTRACT -Force",
      ],
      {
        stdio: "inherit",
        env: { ...process.env, YG_ARCHIVE: archive, YG_EXTRACT: dest },
      },
    );
    if (r.status !== 0) throw Error("Extraction failed");
    for (const name of tool.name === "ffmpeg"
      ? ["ffmpeg", "ffprobe"]
      : ["deno"]) {
      const src = find(dest, `${name}.exe`);
      if (!src) throw Error(`Missing ${name}`);
      copyVerified(src, `.tools/bin/${name}.exe`);
    }
  } else copyVerified(archive, `.tools/bin/${tool.name}.exe`);
}
console.log(`Verified and installed Windows ${process.arch} media tools.`);
