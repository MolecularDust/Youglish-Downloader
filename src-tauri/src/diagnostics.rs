use crate::model::Settings;
use serde::Serialize;
use std::{
    io::Write,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
static DIRECTORY: OnceLock<PathBuf> = OnceLock::new();
static LOCK: Mutex<()> = Mutex::new(());
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Stage {
    QueueRejected,
    Invocation,
    Analysis,
    CaptionMetadata,
    Captions,
    Download,
    PostProcess,
}

// Only explicit HTTP markers are accepted. Never interpret process exit codes,
// URL query values, file names, percentages, or arbitrary digit substrings as HTTP.
pub fn http_statuses(text: &str) -> Vec<u16> {
    let mut result = Vec::new();
    for line in text.lines() {
        let lower = line.to_ascii_lowercase();
        let prefix = lower
            .split("https://")
            .next()
            .unwrap_or("")
            .split("http://")
            .next()
            .unwrap_or("");
        for marker in [
            "http error ",
            "http error: ",
            "http/1.0 ",
            "http/1.1 ",
            "http/2 ",
            "http/2.0 ",
        ] {
            if let Some((_, tail)) = prefix.split_once(marker) {
                let digits = tail
                    .chars()
                    .take_while(char::is_ascii_digit)
                    .collect::<String>();
                if digits.len() == 3 {
                    if let Ok(code) = digits.parse::<u16>() {
                        if (100..600).contains(&code) && !result.contains(&code) {
                            result.push(code);
                        }
                    }
                }
            }
        }
    }
    result
}
pub fn connection_reset(text: &str) -> bool {
    let t = text.to_ascii_lowercase();
    t.contains("-10054") || t.contains("connection reset") || ffmpeg_exit(text) == Some(-10054)
}
pub fn ffmpeg_exit(text: &str) -> Option<i64> {
    let lower = text.to_ascii_lowercase();
    let tail = lower.split_once("ffmpeg exited with code ")?.1;
    let token = tail
        .chars()
        .take_while(|c| c.is_ascii_digit() || *c == '-')
        .collect::<String>();
    let n = token.parse::<i64>().ok()?;
    Some(if n > i32::MAX as i64 && n <= u32::MAX as i64 {
        n - (1i64 << 32)
    } else {
        n
    })
}
#[derive(Serialize)]
struct Record {
    schema: u8,
    build: &'static str,
    deno_jit: bool,
    yt_dlp_cache: bool,
    duration_ms: Option<u64>,
    phases: Vec<crate::timing::Phase>,
    unix_seconds: u64,
    stage: Stage,
    authentication: &'static str,
    platform: &'static str,
    proxy_source: &'static str,
    deno_available: bool,
    yt_dlp_version: Option<String>,
    deno_version: Option<String>,
    exit_code: Option<i32>,
    http_statuses: Vec<u16>,
    ffmpeg_exit: Option<i64>,
    connection_reset: bool,
    certificate_failure: bool,
    cookie_access_failure: bool,
    cookie_database_copy_failure: bool,
    cookie_decryption_failure: bool,
}
pub fn initialize(directory: PathBuf) {
    let _ = DIRECTORY.set(directory);
}
fn record(stage: Stage, s: &Settings, code: Option<i32>, stderr: &str) -> Record {
    let t = stderr.to_ascii_lowercase();
    Record {
        schema: 2,
        build: env!("YG_BUILD"),
        deno_jit: crate::platform::deno_jit(),
        yt_dlp_cache: crate::platform::cache_dir().is_some(),
        duration_ms: None,
        phases: Vec::new(),
        unix_seconds: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        stage,
        authentication: if !s.browser.is_empty() {
            "browser"
        } else if !s.cookies_file.is_empty() {
            "cookie_file"
        } else {
            "anonymous"
        },
        platform: std::env::consts::OS,
        proxy_source: crate::network::proxy_source(),
        deno_available: crate::platform::binary("deno").is_ok(),
        yt_dlp_version: tool_version("yt-dlp"),
        deno_version: tool_version("deno"),
        exit_code: code,
        http_statuses: http_statuses(stderr),
        ffmpeg_exit: ffmpeg_exit(stderr),
        connection_reset: connection_reset(stderr),
        certificate_failure: t.contains("certificate verify failed"),
        cookie_database_copy_failure: t.contains("could not copy") && t.contains("cookie"),
        cookie_decryption_failure: t.contains("failed to decrypt")
            || t.contains("cookie decryption failed"),
        cookie_access_failure: t.contains("failed to decrypt")
            || t.contains("cookie decryption failed")
            || (t.contains("could not copy") && t.contains("cookie")),
    }
}
pub fn log(stage: Stage, s: &Settings, code: Option<i32>, stderr: &str) {
    write(record(stage, s, code, stderr));
}
/// Like `log`, with the run's total duration and the timed phases seen on its output.
pub fn log_timed(
    stage: Stage,
    s: &Settings,
    code: Option<i32>,
    stderr: &str,
    trace: &crate::timing::Trace,
) {
    let mut entry = record(stage, s, code, stderr);
    let (duration, phases) = trace.finish();
    entry.duration_ms = Some(duration);
    entry.phases = phases;
    write(entry);
}
fn write(entry: Record) {
    let Some(directory) = DIRECTORY.get() else {
        return;
    };
    let Ok(_lock) = LOCK.lock() else { return };
    let _ = write_record(directory, &entry);
}
fn write_record(directory: &std::path::Path, entry: &Record) -> std::io::Result<()> {
    std::fs::create_dir_all(directory)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(directory, std::fs::Permissions::from_mode(0o700))?;
    }
    let path = directory.join("media.jsonl");
    if std::fs::metadata(&path).is_ok_and(|m| m.len() > 1_048_576) {
        let previous = directory.join("media.previous.jsonl");
        if previous.exists() {
            std::fs::remove_file(&previous)?;
        }
        std::fs::rename(&path, previous)?;
    }
    let mut options = std::fs::OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path)?;
    serde_json::to_writer(&mut file, entry)?;
    file.write_all(b"\n")
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn distinguishes_http_status_from_windows_process_status_and_secrets() {
        assert_eq!(
            ffmpeg_exit("ERROR: ffmpeg exited with code 4294957242"),
            Some(-10054)
        );
        assert!(connection_reset(
            "ERROR: ffmpeg exited with code 4294957242"
        ));
        assert!(http_statuses("ERROR: ffmpeg exited with code 4294957242").is_empty());
        assert!(http_statuses("https://example.com/429?token=HTTP Error 429").is_empty());
        assert_eq!(
            http_statuses("ERROR: HTTP Error 429: Too Many Requests"),
            vec![429]
        );
        assert_eq!(http_statuses("[https] HTTP error 403 Forbidden"), vec![403]);
        assert!(http_statuses("HTTP Error 4294957242").is_empty());
    }
    #[test]
    fn allowlist_never_serializes_sensitive_input() {
        let s = Settings {
            session_file: None,
            browser: "SECRET_BROWSER".into(),
            cookies_file: "SECRET_PATH".into(),
            destination: "SECRET_DESTINATION".into(),
            appearance: String::new(),
        };
        let value=serde_json::to_string(&record(Stage::Download,&s,Some(1),"Cookie: SECRET_COOKIE Authorization: SECRET_TOKEN https://user:password@example.com/?token=SECRET_URL IP 1.2.3.4 /Users/SECRET_PATH HTTP Error 429")).unwrap();
        for secret in ["SECRET", "password", "example.com", "1.2.3.4", "/Users/"] {
            assert!(!value.contains(secret), "{secret}");
        }
        assert!(value.contains("browser"));
    }
}

fn tool_version(name: &str) -> Option<String> {
    #[cfg(all(windows, target_arch = "aarch64"))]
    let manifest = include_str!("../../docs/tool-manifest-windows-arm64.json");
    #[cfg(all(windows, not(target_arch = "aarch64")))]
    let manifest = include_str!("../../docs/tool-manifest-windows.json");
    #[cfg(not(windows))]
    let manifest = include_str!("../../docs/tool-manifest.json");
    let value: serde_json::Value = serde_json::from_str(manifest).ok()?;
    value.as_array()?.iter().find(|v| v["name"] == name)?["version"]
        .as_str()
        .map(str::to_string)
}

#[cfg(test)]
mod disk_tests {
    use super::*;
    #[test]
    fn writes_allowlisted_json_and_rotates_without_raw_diagnostics() {
        let dir =
            std::env::temp_dir().join(format!("youglish-diagnostics-{}", uuid::Uuid::new_v4()));
        let entry = record(
            Stage::Download,
            &Settings::default(),
            Some(1),
            "Cookie: SECRET https://host/?token=SECRET ERROR: ffmpeg exited with code 4294957242",
        );
        write_record(&dir, &entry).unwrap();
        let path = dir.join("media.jsonl");
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(!content.contains("SECRET"));
        assert!(!content.contains("https://"));
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["ffmpeg_exit"], -10054);
        assert_eq!(parsed["authentication"], "anonymous");
        std::fs::OpenOptions::new()
            .write(true)
            .open(&path)
            .unwrap()
            .set_len(1_048_577)
            .unwrap();
        write_record(&dir, &entry).unwrap();
        assert!(dir.join("media.previous.jsonl").exists());
        assert!(std::fs::metadata(&path).unwrap().len() < 4096);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
