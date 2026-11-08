if (process.platform === 'win32') { await import('./install-tools-windows.mjs'); process.exit(0); }
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw Error("Tool installer currently targets macOS ARM64.");
mkdirSync(".tools/bin", { recursive: true });
const tools = JSON.parse(
  readFileSync(new URL("../docs/tool-downloads.json", import.meta.url), "utf8"),
);
for (const tool of tools) {
  console.log(`Downloading ${tool.name}`);
  const response = await fetch(tool.url);
  if (!response.ok) throw Error(`HTTP ${response.status}: ${tool.name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== tool.sha256)
    throw Error(
      `Checksum mismatch for ${tool.name}. Refusing to use changed upstream content.`,
    );
  if (tool.dir) {
    // Unpacked (onedir) build: starts in ~0.2 s instead of unpacking itself on every launch.
    const archive = `.tools/${tool.name}.zip`;
    writeFileSync(archive, bytes);
    rmSync(`.tools/${tool.dir}`, { recursive: true, force: true });
    const r = spawnSync("unzip", ["-q", "-o", archive, "-d", `.tools/${tool.dir}`], {
      stdio: "inherit",
    });
    if (r.status) throw Error("Extraction failed");
    chmodSync(`.tools/${tool.dir}/${tool.executable}`, 0o755);
    continue;
  }
  if (tool.zip) {
    const archive = `.tools/${tool.name}.zip`;
    writeFileSync(archive, bytes);
    const r = spawnSync("unzip", ["-o", archive, "-d", ".tools/bin"], {
      stdio: "inherit",
    });
    if (r.status) throw Error("Extraction failed");
  } else writeFileSync(`.tools/bin/${tool.name}`, bytes);
  chmodSync(`.tools/bin/${tool.name}`, 0o755);
}
