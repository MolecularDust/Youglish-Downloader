use serde::{Deserialize, Serialize};
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(skip)]
    pub session_file: Option<std::sync::Arc<crate::session::CookieFile>>,
    pub destination: String,
    pub browser: String,
    pub cookies_file: String,
    pub appearance: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request {
    pub url: String,
    pub title: String,
    #[serde(default)]
    pub file_name: Option<String>,
    pub destination: String,
    pub container: String,
    pub resolution: Option<u32>,
    pub codec: String,
    pub audio: String,
    pub mode: String,
    pub subtitle: String,
    pub section: Option<[f64; 2]>,
    pub precise: bool,
    pub duration: f64,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub title: String,
    pub state: String,
    /// Stage within a running download: "preparing", "transferring" or "finishing".
    pub phase: String,
    pub progress: f64,
    pub speed: String,
    pub bytes: String,
    pub eta: String,
    pub message: String,
    pub path: String,
    #[serde(skip)]
    pub pid: u32,
    #[serde(skip)]
    pub request: Request,
    #[serde(skip)]
    pub hidden: bool,
    #[serde(skip)]
    pub retried: bool,
}
pub fn normalize(input: &str) -> Result<String, String> {
    let u = url::Url::parse(input.trim()).map_err(|_| "Enter a valid YouTube URL")?;
    if !["https", "http"].contains(&u.scheme())
        || !u.username().is_empty()
        || u.password().is_some()
        || u.port().is_some()
    {
        return Err("Unsupported URL".into());
    }
    let id = match u.host_str().unwrap_or("") {
        "youtu.be" => u.path().trim_start_matches('/').to_string(),
        "youtube.com" | "www.youtube.com" | "m.youtube.com" => {
            if u.path() == "/watch" {
                u.query_pairs()
                    .find(|(k, _)| k == "v")
                    .map(|(_, v)| v.into_owned())
                    .unwrap_or_default()
            } else {
                u.path()
                    .strip_prefix("/shorts/")
                    .unwrap_or("")
                    .trim_end_matches('/')
                    .to_string()
            }
        }
        _ => return Err("Only YouTube video links are supported".into()),
    };
    if id.len() != 11
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        return Err("Invalid YouTube video ID".into());
    }
    Ok(format!("https://www.youtube.com/watch?v={id}"))
}
pub fn validate(r: &Request) -> Result<(), String> {
    normalize(&r.url)?;
    if let Some(name) = &r.file_name {
        output_file_name(name, &r.container)?;
    }
    if !["mp4", "mkv"].contains(&r.container.as_str())
        || !["auto", "h264", "hevc", "av1", "vp9"].contains(&r.codec.as_str())
        || !["best", "original", "none"].contains(&r.audio.as_str())
        || !["video", "audio"].contains(&r.mode.as_str())
    {
        return Err("Invalid output settings".into());
    }
    if !r.duration.is_finite() || r.duration <= 0. {
        return Err("A finite video duration is required".into());
    }
    if let Some([a, b]) = r.section {
        if !a.is_finite() || !b.is_finite() || a < 0. || a >= b || b > r.duration {
            return Err("Selection must satisfy 0 ≤ In < Out ≤ duration".into());
        }
    }
    if !r.subtitle.is_empty()
        && !r
            .subtitle
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err("Invalid subtitle language".into());
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn urls() {
        for s in [
            "https://youtu.be/BaW_jenozKc",
            "https://youtube.com/shorts/BaW_jenozKc",
            "https://www.youtube.com/watch?v=BaW_jenozKc&list=bad",
        ] {
            assert_eq!(
                normalize(s).unwrap(),
                "https://www.youtube.com/watch?v=BaW_jenozKc"
            )
        }
        for s in [
            "https://youtube.com.evil.com/watch?v=BaW_jenozKc",
            "file:///tmp/a",
            "https://user@youtube.com/watch?v=BaW_jenozKc",
            "https://youtu.be/--exec",
        ] {
            assert!(normalize(s).is_err())
        }
    }
}
#[cfg(test)]
mod selection_tests {
    use super::*;
    fn request() -> Request {
        Request {
            url: "https://youtu.be/aqz-KE-bpKQ".into(),
            title: "Test".into(),
            file_name: None,
            destination: "/tmp".into(),
            container: "mp4".into(),
            resolution: Some(1080),
            codec: "h264".into(),
            audio: "best".into(),
            mode: "video".into(),
            subtitle: String::new(),
            section: Some([1., 3.]),
            precise: true,
            duration: 10.,
        }
    }
    #[test]
    fn section_boundaries() {
        let mut r = request();
        assert!(validate(&r).is_ok());
        for bounds in [[-1., 3.], [3., 3.], [4., 3.], [1., 11.], [f64::NAN, 3.]] {
            r.section = Some(bounds);
            assert!(validate(&r).is_err());
        }
    }
    #[test]
    fn reject_command_injection_in_enums() {
        let mut r = request();
        r.codec = "h264; touch /tmp/injected".into();
        assert!(validate(&r).is_err());
        r = request();
        r.subtitle = "en --exec bad".into();
        assert!(validate(&r).is_err());
    }
    #[test]
    fn clearing_hides_finished_jobs_but_preserves_active_jobs() {
        let mut jobs = std::collections::HashMap::new();
        for state in [
            "completed",
            "canceled",
            "downloading",
            "queued",
            "paused",
            "failed",
        ] {
            jobs.insert(
                state.to_string(),
                Job {
                    id: state.into(),
                    title: "Test".into(),
                    state: state.into(),
                    phase: String::new(),
                    progress: 0.,
                    speed: String::new(),
                    bytes: String::new(),
                    eta: String::new(),
                    message: String::new(),
                    path: String::new(),
                    pid: 0,
                    request: request(),
                    hidden: false,
                    retried: false,
                },
            );
        }
        let mut cleared = clear_finished(&mut jobs);
        cleared.sort();
        assert_eq!(cleared, vec!["canceled", "completed", "failed"]);
        assert!(jobs["completed"].hidden);
        assert!(jobs["canceled"].hidden);
        assert!(jobs["failed"].hidden);
        for state in ["downloading", "queued", "paused"] {
            assert!(!jobs[state].hidden);
        }
        // Canceled worker state remains available until its process/files are cleaned up.
        assert_eq!(jobs["canceled"].state, "canceled");
    }
    #[test]
    fn reject_nonfinite_duration() {
        let mut r = request();
        r.duration = f64::INFINITY;
        assert!(validate(&r).is_err());
    }
}

/// Names Windows cannot create. Compiled everywhere so the rules are tested on every platform,
/// but only enforced on Windows.
fn windows_unsaveable(stem: &str) -> bool {
    let device = stem.split('.').next().unwrap_or("").to_uppercase();
    let chars: Vec<char> = device.chars().collect();
    let numbered = chars.len() == 4
        && (device.starts_with("COM") || device.starts_with("LPT"))
        && matches!(chars[3], '1'..='9' | '\u{b9}' | '\u{b2}' | '\u{b3}');
    stem.ends_with(' ')
        || stem.contains(['<', '>', '"', '|', '?', '*'])
        || ["CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$"].contains(&device.as_str())
        || numbered
}
pub fn output_file_name(input: &str, container: &str) -> Result<String, String> {
    if input
        .chars()
        .any(|c| c.is_control() || matches!(c, '\u{2028}' | '\u{2029}'))
    {
        return Err("File names cannot contain control characters.".into());
    }
    let input = input.trim();
    let lower = input.to_ascii_lowercase();
    let stem = if lower.ends_with(".mp4") || lower.ends_with(".mkv") {
        &input[..input.len() - 4]
    } else {
        input
    };
    if stem.trim().is_empty()
        || [".", ".."].contains(&stem)
        || stem.len() > 180
        || stem
            .chars()
            .any(|c| c.is_control() || matches!(c, '/' | '\\' | ':' | '\u{2028}' | '\u{2029}'))
    {
        return Err(
            "Enter a file name of up to 180 bytes without slashes, colons, or control characters."
                .into(),
        );
    }
    if cfg!(windows) && windows_unsaveable(stem) {
        return Err("This file name is reserved or contains characters Windows cannot save.".into());
    }
    Ok(format!("{stem}.{container}"))
}
#[cfg(test)]
mod filename_tests {
    use super::*;
    #[test]
    fn preserves_custom_names_and_uses_selected_extension() {
        assert_eq!(output_file_name(" My clip ", "mp4").unwrap(), "My clip.mp4");
        assert_eq!(output_file_name("Clip.MP4", "mkv").unwrap(), "Clip.mkv");
        assert_eq!(
            output_file_name("100% café", "mp4").unwrap(),
            "100% café.mp4"
        );
    }
    #[test]
    fn rejects_empty_names_and_path_traversal() {
        for name in [
            "",
            " ",
            ".",
            "..",
            "../clip",
            "/tmp/clip",
            "folder\\clip",
            "a:b",
            "a\n",
            ".mp4",
        ] {
            assert!(output_file_name(name, "mp4").is_err(), "{name:?}");
        }
        assert!(output_file_name(&"a".repeat(181), "mp4").is_err());
    }
}

/// Effective output transfer rate for FFmpeg section downloads.
pub fn format_speed(bytes_per_second: f64) -> String {
    if !bytes_per_second.is_finite() || bytes_per_second < 0. {
        return String::new();
    }
    let bits = bytes_per_second * 8.;
    let (value, unit) = if bits >= 1_000_000_000. {
        (bits / 1_000_000_000., "Gbit/s")
    } else if bits >= 1_000_000. {
        (bits / 1_000_000., "Mbit/s")
    } else {
        (bits / 1000., "Kbit/s")
    };
    format!("{value:.1} {unit}")
}
pub fn format_size(bytes: u64) -> String {
    if bytes >= 1_000_000_000 {
        format!("{:.1} GB", bytes as f64 / 1_000_000_000.)
    } else if bytes >= 1_000_000 {
        format!("{:.1} MB", bytes as f64 / 1_000_000.)
    } else if bytes >= 1000 {
        format!("{:.1} KB", bytes as f64 / 1000.)
    } else {
        format!("{bytes} B")
    }
}
pub fn clear_finished(jobs: &mut std::collections::HashMap<String, Job>) -> Vec<String> {
    let mut cleared = Vec::new();
    // Retain internal records while canceled workers finish cleanup; hide all later events.
    for job in jobs.values_mut() {
        if ["completed", "canceled", "failed"].contains(&job.state.as_str()) {
            job.hidden = true;
            cleared.push(job.id.clone());
        }
    }
    cleared
}

#[cfg(test)]
mod speed_tests {
    use super::*;
    #[test]
    fn formats_transfer_speed_in_units_per_second() {
        assert_eq!(format_speed(512.), "4.1 Kbit/s");
        assert_eq!(format_speed(2048.), "16.4 Kbit/s");
        assert_eq!(format_speed(2.5 * 1_048_576.), "21.0 Mbit/s");
        assert_eq!(format_speed(250_000_000.), "2.0 Gbit/s");
        assert_eq!(format_size(16_252_972), "16.3 MB");
        assert_eq!(format_size(1234), "1.2 KB");
        assert_eq!(format_speed(f64::NAN), "");
        assert_eq!(format_speed(-1.), "");
    }
}

/// Wait ten seconds after the previous attempt, rounding the displayed countdown up.
pub fn cooldown_seconds(elapsed: Option<std::time::Duration>) -> u64 {
    elapsed
        .map(|elapsed| {
            let remaining = std::time::Duration::from_secs(10).saturating_sub(elapsed);
            remaining.as_secs() + u64::from(remaining.subsec_nanos() > 0)
        })
        .unwrap_or(0)
}
#[cfg(test)]
mod cooldown_tests {
    use super::*;
    use std::time::Duration;
    #[test]
    fn first_download_is_immediate_and_later_attempts_wait_ten_seconds() {
        assert_eq!(cooldown_seconds(None), 0);
        for (ms, expected) in [
            (0, 10),
            (1, 10),
            (1000, 9),
            (9500, 1),
            (9999, 1),
            (10000, 0),
            (12000, 0),
        ] {
            assert_eq!(cooldown_seconds(Some(Duration::from_millis(ms))), expected);
        }
    }
}

#[cfg(all(test, windows))]
mod windows_sentence_filename_tests {
    use super::*;
    #[test]
    fn final_sentence_period_is_valid_before_appended_extension() {
        let name = output_file_name(
            "Oh. I'm gonna earmuff my grandma when she watches this.",
            "mp4",
        )
        .unwrap();
        assert_eq!(
            name,
            "Oh. I'm gonna earmuff my grandma when she watches this..mp4"
        );
        let dir = std::env::temp_dir().join(format!("youglish-filename-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        std::fs::write(dir.join(name), b"test").unwrap();
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn windows_reserved_devices_and_invalid_characters_remain_rejected() {
        for name in [
            "CON", "CON.", "NUL.mp4", "COM1", "LPT9", "CON .mp4", "a?b", "a*b", "a|b", "a<b",
        ] {
            assert!(output_file_name(name, "mp4").is_err(), "{name}");
        }
    }
}

#[cfg(test)]
mod windows_rule_tests {
    use super::*;
    #[test]
    fn windows_reserved_names_are_detected_on_every_platform() {
        for name in [
            "CON", "con.txt", "NUL", "COM1", "lpt9", "COM\u{b9}", "LPT\u{b3}.x", "CONIN$", "conout$",
            "a?b", "a*b", "a|b", "a<b", "a\"b", "name ",
        ] {
            assert!(windows_unsaveable(name), "{name}");
        }
        for name in [
            "COM0", "COM10", "CONSOLE", "Oh. I'm done.", "café", "COM", "a.CON",
        ] {
            assert!(!windows_unsaveable(name), "{name}");
        }
        assert!(output_file_name("a\u{2028}b", "mp4").is_err());
    }
}
