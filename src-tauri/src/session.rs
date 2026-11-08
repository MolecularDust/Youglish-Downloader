use std::{io::Write, path::PathBuf, sync::Arc};
use tauri::Manager;

pub struct CookieFile(pub PathBuf);
impl Drop for CookieFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}
fn youtube_domain(domain: &str) -> bool {
    let domain = domain.trim_start_matches('.');
    domain == "youtube.com" || domain.ends_with(".youtube.com")
}
/// Private folder for runtime-only cookie snapshots. Never shared with the OS temp folder.
pub fn dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = if crate::platform::portable() {
        crate::platform::data_dir()?.join("Cache")
    } else {
        app.path()
            .app_cache_dir()
            .map_err(|_| "Cannot locate the private session folder")?
    };
    let dir = base.join("sessions");
    std::fs::create_dir_all(&dir).map_err(|_| "Cannot create the private session folder")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700))
            .map_err(|_| "Cannot secure the private session folder")?;
    }
    Ok(dir)
}
fn file_pid(name: &str) -> Option<u32> {
    name.strip_prefix("youglish-session-")
        .or_else(|| name.strip_prefix("youglish-info-"))?
        .split('-')
        .next()?
        .parse()
        .ok()
}
/// Delete snapshots left by instances that no longer run (crash, force-quit, power loss).
pub fn sweep_stale(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if file_pid(&name).is_some_and(|pid| !crate::platform::process_alive(pid)) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}
/// Delete this process's remaining snapshots (used at exit).
pub fn remove_own(dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if file_pid(&name) == Some(std::process::id()) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}
/// Netscape cookie-file text for YouTube cookies, and whether a signed-in cookie is present.
fn netscape(cookies: &[tauri::webview::cookie::Cookie<'_>], now: i64) -> (String, bool) {
    let mut text = String::from("# Netscape HTTP Cookie File\n");
    let mut authenticated = false;
    for c in cookies {
        let domain = c.domain().unwrap_or("");
        if !youtube_domain(domain) {
            continue;
        }
        let path = c.path().unwrap_or("/");
        if [domain, path, c.name(), c.value()]
            .iter()
            .any(|s| s.contains(['\t', '\r', '\n']))
        {
            continue;
        }
        let expiry = c
            .expires_datetime()
            .map(|d| d.unix_timestamp())
            .unwrap_or(0);
        if expiry != 0 && expiry <= now {
            continue;
        }
        if ["SID", "SAPISID", "__Secure-3PAPISID", "__Secure-1PAPISID"].contains(&c.name()) {
            authenticated = true;
        }
        text.push_str(&format!(
            "{}{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
            if c.http_only().unwrap_or(false) {
                "#HttpOnly_"
            } else {
                ""
            },
            domain,
            if domain.starts_with('.') {
                "TRUE"
            } else {
                "FALSE"
            },
            path,
            if c.secure().unwrap_or(false) {
                "TRUE"
            } else {
                "FALSE"
            },
            expiry,
            c.name(),
            c.value()
        ));
    }
    (text, authenticated)
}
fn snapshot(app: &tauri::AppHandle) -> Result<String, String> {
    let window = app
        .get_webview_window("main")
        .ok_or("App session is unavailable")?;
    let cookies = window
        .cookies()
        .map_err(|_| "Could not read the app's YouTube session")?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let (text, authenticated) = netscape(&cookies, now);
    if !authenticated {
        return Err("Connect YouTube in Account & Settings first, then select your channel. No signed-in YouTube cookies were found.".into());
    }
    Ok(text)
}
/// Check at enqueue time that the app session is signed in. Writes nothing to disk.
pub fn preflight(app: &tauri::AppHandle, settings: &crate::model::Settings) -> Result<(), String> {
    if settings.browser == "app" {
        snapshot(app)?;
    }
    Ok(())
}
fn create_file(dir: &std::path::Path, text: &str) -> Result<PathBuf, String> {
    create_named(dir, "youglish-session", "txt", text.as_bytes())
}
fn create_named(
    dir: &std::path::Path,
    prefix: &str,
    extension: &str,
    bytes: &[u8],
) -> Result<PathBuf, String> {
    let path = dir.join(format!(
        "{prefix}-{}-{}.{extension}",
        std::process::id(),
        uuid::Uuid::new_v4()
    ));
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(&path)
        .map_err(|_| "Cannot create private session file")?;
    if file.write_all(bytes).is_err() {
        drop(file);
        let _ = std::fs::remove_file(&path);
        return Err("Cannot prepare YouTube session".into());
    }
    Ok(path)
}
/// Write yt-dlp metadata (it contains signed media links) to a private file that is removed when
/// the returned guard is dropped. It is never written to the download folder.
pub fn write_metadata(app: &tauri::AppHandle, json: &[u8]) -> Result<Arc<CookieFile>, String> {
    let path = create_named(&dir(app)?, "youglish-info", "json", json)?;
    Ok(Arc::new(CookieFile(path)))
}
/// Take a fresh cookie snapshot. Call immediately before a yt-dlp run, not when queueing;
/// the file lives only as long as the returned settings.
pub fn prepare(
    app: &tauri::AppHandle,
    mut settings: crate::model::Settings,
) -> Result<crate::model::Settings, String> {
    if settings.browser != "app" {
        return Ok(settings);
    }
    let text = snapshot(app)?;
    let path = create_file(&dir(app)?, &text)?;
    let guard = Arc::new(CookieFile(path.clone()));
    settings.browser.clear();
    settings.cookies_file = path.to_string_lossy().into_owned();
    settings.session_file = Some(guard);
    Ok(settings)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn domains_are_restricted() {
        assert!(youtube_domain(".youtube.com"));
        assert!(youtube_domain("www.youtube.com"));
        assert!(!youtube_domain("youtube.com.evil.test"));
        assert!(!youtube_domain("google.com"));
        assert!(!youtube_domain("notyoutube.com"));
    }
    #[test]
    fn temporary_file_is_removed_after_last_owner() {
        let path = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        std::fs::write(&path, "test").unwrap();
        let a = Arc::new(CookieFile(path.clone()));
        let b = a.clone();
        drop(a);
        assert!(path.exists());
        drop(b);
        assert!(!path.exists());
    }
    use tauri::webview::cookie::{time::OffsetDateTime, Cookie};
    fn fake(name: &str, domain: &str) -> Cookie<'static> {
        Cookie::build((name.to_string(), "fake-value"))
            .domain(domain.to_string())
            .path("/")
            .build()
    }
    #[test]
    fn netscape_format_flags_expiry_and_filtering() {
        let secure = Cookie::build(("SAPISID", "fake"))
            .domain(".youtube.com")
            .path("/")
            .secure(true)
            .http_only(true)
            .expires(OffsetDateTime::from_unix_timestamp(2_000_000_000).unwrap())
            .build();
        let expired = Cookie::build(("OLD", "fake"))
            .domain(".youtube.com")
            .expires(OffsetDateTime::from_unix_timestamp(10).unwrap())
            .build();
        let tabbed = Cookie::build(("BAD", "a\tb")).domain(".youtube.com").build();
        let (text, authenticated) = netscape(
            &[
                secure,
                expired,
                tabbed,
                fake("PREF", "www.youtube.com"),
                fake("SID", "google.com"),
            ],
            1_000,
        );
        assert!(authenticated);
        let lines: Vec<_> = text.lines().collect();
        assert_eq!(lines[0], "# Netscape HTTP Cookie File");
        // The cookie crate strips a leading dot from domain(), so the include-subdomains flag
        // is not asserted here; see the handoff notes.
        assert!(lines[1].starts_with("#HttpOnly_"));
        assert!(lines[1].ends_with("\t/\tTRUE\t2000000000\tSAPISID\tfake"));
        assert_eq!(lines[2], "www.youtube.com\tFALSE\t/\tFALSE\t0\tPREF\tfake-value");
        assert_eq!(lines.len(), 3);
    }
    #[test]
    fn unauthenticated_without_account_cookie() {
        assert!(!netscape(&[fake("PREF", ".youtube.com")], 0).1);
    }
    #[cfg(unix)]
    #[test]
    fn session_file_is_private_and_sweep_keeps_live_owner() {
        use std::os::unix::fs::PermissionsExt;
        let dir = std::env::temp_dir().join(format!("sessions-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        let mine = create_file(&dir, "x").unwrap();
        assert_eq!(std::fs::metadata(&mine).unwrap().permissions().mode() & 0o777, 0o600);
        // A snapshot from a dead process (pid far above any real pid) is removed.
        let stale = dir.join("youglish-session-2147483646-test.txt");
        std::fs::write(&stale, "x").unwrap();
        let other = dir.join("unrelated.txt");
        std::fs::write(&other, "x").unwrap();
        sweep_stale(&dir);
        assert!(mine.exists() && other.exists() && !stale.exists());
        remove_own(&dir);
        assert!(!mine.exists() && other.exists());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
