use std::{path::PathBuf, process::Command};
pub fn binary(name: &str) -> Result<PathBuf, String> {
    let name = if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    };
    let exe = std::env::current_exe().map_err(|_| "Cannot locate application")?;
    #[cfg(target_os = "macos")]
    if name == "yt-dlp" {
        // Unpacked build: starts in ~0.2 s instead of unpacking itself on every launch.
        let unpacked = exe.parent().unwrap().join("../Resources/yt-dlp/yt-dlp_macos");
        if unpacked.is_file() {
            return Ok(unpacked);
        }
        if cfg!(debug_assertions) {
            let local = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.tools/yt-dlp-dir/yt-dlp_macos");
            if local.is_file() {
                return Ok(local);
            }
        }
    }
    let bundled = exe.parent().unwrap().join(&name);
    if bundled.is_file() {
        return Ok(bundled);
    }
    if cfg!(debug_assertions) {
        let local = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../.tools/bin")
            .join(&name);
        if local.is_file() {
            return Ok(local);
        }
        for dir in std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()).chain([
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
        ]) {
            let p = dir.join(&name);
            if p.is_file() {
                eprintln!("warning: using unpinned {name} from {}", p.display());
                return Ok(p);
            }
        }
    }
    Err(format!(
        "{name} is missing. Prepare media tools; see README."
    ))
}
static CACHE_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();
/// Private folder where yt-dlp keeps downloaded player scripts and solved challenges.
pub fn set_cache_dir(path: PathBuf) {
    let _ = std::fs::create_dir_all(&path);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700));
    }
    let _ = CACHE_DIR.set(path);
}
/// The yt-dlp cache folder, unless caching is disabled (YOUGLISH_NO_CACHE=1, for timing comparisons).
pub fn cache_dir() -> Option<&'static PathBuf> {
    if std::env::var_os("YOUGLISH_NO_CACHE").is_some_and(|v| v == "1") {
        return None;
    }
    CACHE_DIR.get()
}
/// Deno's JIT needs a signing entitlement on macOS that the release build does not have, so it can only be
/// enabled there in development builds (YOUGLISH_DENO_JIT=1). Windows has no such restriction.
pub fn deno_jit() -> bool {
    cfg!(windows)
        || (cfg!(debug_assertions) && std::env::var_os("YOUGLISH_DENO_JIT").is_some_and(|v| v == "1"))
}
pub fn command(name: &str) -> Result<Command, String> {
    let mut c = Command::new(binary(name)?);
    // Interpreter mode works under hardened signing without JIT entitlements.
    if !deno_jit() {
        c.env("DENO_V8_FLAGS", "--jitless");
    }
    let exe = std::env::current_exe().map_err(|_| "Cannot locate application")?;
    let bundled_ca = exe
        .parent()
        .unwrap()
        .join("../Resources/resources/cacert.pem");
    let bundled_ca = if cfg!(windows) {
        exe.parent().unwrap().join("resources/cacert.pem")
    } else {
        bundled_ca
    };
    let ca = if bundled_ca.is_file() {
        bundled_ca
    } else if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources/cacert.pem")
    } else {
        return Err("Bundled certificate store is missing".into());
    };
    if ca.is_file() {
        c.env("SSL_CERT_FILE", ca);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        c.process_group(0);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        c.creation_flags(0x08000000); // CREATE_NO_WINDOW
        if portable() {
            let data = data_dir()?;
            let temp = data.join("Temp");
            std::fs::create_dir_all(&temp).map_err(|e| e.to_string())?;
            c.env("TEMP", &temp)
                .env("TMP", &temp)
                .env("DENO_DIR", data.join("Deno"));
        }
    }
    Ok(c)
}
pub fn signal(pid: u32, action: &str) -> Result<(), String> {
    #[cfg(unix)]
    {
        let sig = match action {
            "pause" => libc::SIGSTOP,
            "resume" => libc::SIGCONT,
            _ => libc::SIGKILL,
        };
        if unsafe { libc::kill(-(pid as i32), sig) } != 0 {
            return Err("Process has already exited".into());
        }
        Ok(())
    }
    #[cfg(windows)]
    {
        windows_process::signal(pid, action)
    }
    #[cfg(not(any(unix, windows)))]
    {
        let _ = (pid, action);
        Err("Unsupported platform".into())
    }
}
#[cfg(all(test, unix))]
mod tests {
    use super::*;
    #[test]
    fn isolated_process_pause_resume_cancel() {
        use std::os::unix::process::{CommandExt, ExitStatusExt};
        let mut child = Command::new("/bin/sleep")
            .arg("30")
            .process_group(0)
            .spawn()
            .unwrap();
        let pid = child.id();
        assert_eq!(unsafe { libc::getpgid(pid as i32) }, pid as i32);
        signal(pid, "pause").unwrap();
        let mut status = 0;
        assert_eq!(
            unsafe { libc::waitpid(pid as i32, &mut status, libc::WUNTRACED) },
            pid as i32
        );
        assert!(libc::WIFSTOPPED(status));
        signal(pid, "resume").unwrap();
        signal(pid, "cancel").unwrap();
        assert_eq!(child.wait().unwrap().signal(), Some(libc::SIGKILL));
    }
}

#[cfg(windows)]
mod windows_process;

pub fn portable() -> bool {
    cfg!(windows)
        && std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("portable.marker").is_file()))
            .unwrap_or(false)
}
pub fn data_dir() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let data = exe
        .parent()
        .ok_or("Application directory unavailable")?
        .join("Data");
    std::fs::create_dir_all(&data).map_err(|_| "Portable application directory is not writable. Move the entire folder to a writable directory.".to_string())?;
    Ok(data)
}

pub fn installed_browsers() -> Vec<String> {
    #[cfg(windows)]
    {
        let roots = [
            "LOCALAPPDATA",
            "APPDATA",
            "PROGRAMFILES",
            "PROGRAMFILES(X86)",
        ]
        .iter()
        .filter_map(std::env::var_os)
        .map(PathBuf::from)
        .collect::<Vec<_>>();
        return [
            ("chrome", "Google/Chrome/Application/chrome.exe"),
            ("edge", "Microsoft/Edge/Application/msedge.exe"),
            ("firefox", "Mozilla Firefox/firefox.exe"),
            ("brave", "BraveSoftware/Brave-Browser/Application/brave.exe"),
            ("chromium", "Chromium/Application/chrome.exe"),
            ("vivaldi", "Vivaldi/Application/vivaldi.exe"),
            ("opera", "Programs/Opera/opera.exe"),
            ("opera", "Opera/opera.exe"),
        ]
        .iter()
        .filter(|(_, p)| roots.iter().any(|r| r.join(p).is_file()))
        .map(|(id, _)| id.to_string())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();
    }
    #[cfg(not(windows))]
    {
        let roots = [
            PathBuf::from("/Applications"),
            PathBuf::from("/System/Applications"),
            PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join("Applications"),
        ];
        [
            ("opera", "Opera.app"),
            ("chrome", "Google Chrome.app"),
            ("firefox", "Firefox.app"),
            ("safari", "Safari.app"),
            ("edge", "Microsoft Edge.app"),
            ("brave", "Brave Browser.app"),
            ("chromium", "Chromium.app"),
            ("vivaldi", "Vivaldi.app"),
        ]
        .iter()
        .filter(|(_, p)| roots.iter().any(|r| r.join(p).is_dir()))
        .map(|(id, _)| id.to_string())
        .collect()
    }
}

#[cfg(windows)]
pub use windows_process::{output, spawn};
#[cfg(not(windows))]
pub fn spawn(c: &mut Command) -> std::io::Result<std::process::Child> {
    c.spawn()
}
#[cfg(not(windows))]
pub fn output(c: &mut Command) -> std::io::Result<std::process::Output> {
    c.output()
}

/// Whether a process id belongs to a running process. Used to recognise leftovers of dead instances.
pub fn process_alive(pid: u32) -> bool {
    #[cfg(unix)]
    {
        let r = unsafe { libc::kill(pid as i32, 0) };
        r == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
    }
    #[cfg(windows)]
    {
        windows_process::process_alive(pid)
    }
    #[cfg(not(any(unix, windows)))]
    {
        let _ = pid;
        true
    }
}

#[cfg(test)]
mod process_tests {
    use super::*;
    #[test]
    fn own_process_is_alive_and_an_impossible_pid_is_not() {
        assert!(process_alive(std::process::id()));
        assert!(!process_alive(2_147_483_646));
    }
}
