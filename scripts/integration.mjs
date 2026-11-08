import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const toolDir = resolve(process.env.MEDIA_BIN_DIR ?? ".tools/bin");
const out = resolve(process.env.MEDIA_TEST_DIR ?? ".tools/integration");
mkdirSync(out, { recursive: true });
const common = [
  "--ignore-config",
  "--no-playlist",
  "--no-cache-dir",
  "--js-runtimes",
  `deno:${join(toolDir, process.platform === "win32" ? "deno.exe" : "deno")}`,
  "--ffmpeg-location",
  toolDir,
  "--socket-timeout",
  "20",
  "--retries",
  "1",
  "--no-overwrites",
  "--no-quiet",
  "--newline",
  "--progress",
  "--progress-template",
  "download:PROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._downloaded_bytes_str)s|%(progress._eta_str)s",
  "--print",
  "after_move:FILE|%(filepath)s",
  "-f",
  "bv[height=144][vcodec~='^(avc1)']+ba/b[height=144][vcodec~='^(avc1)']",
  "--paths",
  out,
];
const video = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
async function run(name, args) {
  return await new Promise((finish, reject) => {
    const c = spawn(
      process.platform === "darwin" &&
        existsSync(join(toolDir, "../Resources/yt-dlp/yt-dlp_macos"))
        ? join(toolDir, "../Resources/yt-dlp/yt-dlp_macos")
        : join(toolDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"),
      [...common, ...args, "--", video],
      {
        env: {
          ...process.env,
          DENO_V8_FLAGS: "--jitless",
          SSL_CERT_FILE: resolve(
            process.env.MEDIA_CA_FILE ?? "src-tauri/resources/cacert.pem",
          ),
        },
      },
    );
    c.on("error", reject);
    let log = "";
    c.stdout.on("data", (d) => {
      log += d;
      process.stdout.write(d);
    });
    c.stderr.on("data", (d) => {
      log += d;
      process.stderr.write(d);
    });
    c.on("close", (code) => {
      writeFileSync(`${out}/${name}.log`, log);
      finish(code);
    });
  });
}
for (const [name, args] of [
  [
    "whole",
    [
      "--merge-output-format",
      "mp4",
      "--remux-video",
      "mp4",
      "-o",
      "whole.%(ext)s",
    ],
  ],
  [
    "fast",
    [
      "--merge-output-format",
      "mkv",
      "--remux-video",
      "mkv",
      "--download-sections",
      "*10-15",
      "--downloader-args",
      "ffmpeg_o:-progress pipe:1 -nostats",
      "-o",
      "fast.%(ext)s",
    ],
  ],
  [
    "precise",
    [
      "--merge-output-format",
      "mp4",
      "--remux-video",
      "mp4",
      "--download-sections",
      "*10-15",
      "--force-keyframes-at-cuts",
      "--downloader-args",
      "ffmpeg_o:-progress pipe:1 -nostats -c:v libx264 -crf 18 -c:a aac -f mp4",
      "-o",
      "precise.%(ext)s",
    ],
  ],
]) {
  const code = await run(name, args);
  console.log(`RESULT ${name}: ${code === 0 ? "PASS" : "FAIL"}`);
  if (code) process.exitCode = 1;
}
