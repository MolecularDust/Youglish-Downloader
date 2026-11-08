use std::process::Command;

pub fn proxy_source() -> &'static str {
    if has_proxy_environment() {
        return "environment";
    }
    #[cfg(windows)]
    {
        if windows_manual_proxy().is_some() {
            return "windows_manual";
        }
    }
    "system_default"
}
fn has_proxy_environment() -> bool {
    std::env::vars_os().any(|(k, _)| {
        matches!(
            k.to_string_lossy().to_ascii_lowercase().as_str(),
            "http_proxy" | "https_proxy" | "all_proxy" | "no_proxy"
        )
    })
}
pub fn configure(c: &mut Command) {
    // Preserve environment overrides and macOS behavior. Never choose a new proxy.
    #[cfg(windows)]
    if !has_proxy_environment() {
        if let Some(proxy) = windows_manual_proxy() {
            apply_proxy(c, &proxy);
        }
    }
    #[cfg(not(windows))]
    let _ = c;
}
/// Give yt-dlp the proxy as --proxy and as environment variables. With only --proxy, part of its
/// pipeline (measured: a Look Up took 23 s instead of 4 s) connected directly and waited for timeouts,
/// because a desktop session has no proxy variables; yt-dlp's children inherit these.
#[cfg(any(windows, test))]
fn apply_proxy(c: &mut Command, proxy: &str) {
    c.arg("--proxy").arg(proxy);
    c.env("HTTP_PROXY", proxy)
        .env("HTTPS_PROXY", proxy)
        .env("NO_PROXY", "localhost,127.0.0.1,::1");
}
#[cfg(test)]
mod proxy_env_tests {
    use super::*;
    #[test]
    fn proxy_is_passed_as_flag_and_environment() {
        let mut c = Command::new("yt-dlp");
        apply_proxy(&mut c, "http://127.0.0.1:10809");
        let args: Vec<_> = c.get_args().map(|a| a.to_string_lossy().into_owned()).collect();
        assert_eq!(args, ["--proxy", "http://127.0.0.1:10809"]);
        let env = |k: &str| {
            c.get_envs()
                .find(|(n, _)| *n == k)
                .and_then(|(_, v)| v.map(|v| v.to_string_lossy().into_owned()))
        };
        assert_eq!(env("HTTP_PROXY").as_deref(), Some("http://127.0.0.1:10809"));
        assert_eq!(env("HTTPS_PROXY").as_deref(), Some("http://127.0.0.1:10809"));
        assert_eq!(env("NO_PROXY").as_deref(), Some("localhost,127.0.0.1,::1"));
    }
}
#[cfg(windows)]
fn windows_manual_proxy() -> Option<String> {
    use windows_sys::Win32::{
        Foundation::GlobalFree,
        Networking::WinHttp::{
            WinHttpGetIEProxyConfigForCurrentUser, WINHTTP_CURRENT_USER_IE_PROXY_CONFIG,
        },
    };
    unsafe fn take(ptr: *mut u16) -> Option<String> {
        if ptr.is_null() {
            return None;
        }
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        let value = String::from_utf16_lossy(std::slice::from_raw_parts(ptr, len));
        GlobalFree(ptr.cast());
        Some(value)
    }
    unsafe {
        let mut cfg = WINHTTP_CURRENT_USER_IE_PROXY_CONFIG::default();
        if WinHttpGetIEProxyConfigForCurrentUser(&mut cfg) == 0 {
            return None;
        }
        let proxy = take(cfg.lpszProxy);
        let pac = take(cfg.lpszAutoConfigUrl);
        let bypass = take(cfg.lpszProxyBypass);
        // PAC and host-specific bypass routing cannot safely be collapsed into
        // one --proxy value for metadata and dynamically selected CDN hosts.
        // Keep upstream behavior in those configurations, rather than guessing.
        if pac.is_some()
            || bypass.as_deref().is_some_and(|v| {
                v.split(';')
                    .any(|x| !x.trim().is_empty() && !local_bypass(x.trim()))
            })
        {
            return None;
        }
        manual_proxy(proxy.as_deref()?)
    }
}
#[cfg(any(windows, test))]
fn manual_proxy(value: &str) -> Option<String> {
    let entries = value
        .split(';')
        .map(str::trim)
        .filter(|x| !x.is_empty())
        .collect::<Vec<_>>();
    let endpoint = if entries.len() == 1 && !entries[0].contains('=') {
        entries[0]
    } else {
        let https = entries.iter().find_map(|v| v.strip_prefix("https="))?;
        let http = entries.iter().find_map(|v| v.strip_prefix("http="));
        if http.is_some_and(|v| v != https) {
            return None;
        }
        https
    };
    let normalized = if endpoint.contains("://") {
        endpoint.to_string()
    } else {
        format!("http://{endpoint}")
    };
    let u = url::Url::parse(&normalized).ok()?;
    if u.scheme() != "http"
        || u.host_str().is_none()
        || !u.username().is_empty()
        || u.password().is_some()
        || u.query().is_some()
        || u.fragment().is_some()
        || u.path() != "/"
    {
        return None;
    }
    Some(normalized)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_forwards_unambiguous_existing_http_proxy() {
        assert_eq!(
            manual_proxy("127.0.0.1:10808"),
            Some("http://127.0.0.1:10808".into())
        );
        assert_eq!(
            manual_proxy("http=127.0.0.1:10808;https=127.0.0.1:10808"),
            Some("http://127.0.0.1:10808".into())
        );
        for v in [
            "http=a:1;https=b:2",
            "socks5://a:1",
            "http://user:secret@host:1",
            "not a proxy",
        ] {
            assert!(manual_proxy(v).is_none());
        }
    }
}

#[cfg(any(windows, test))]
fn local_bypass(value: &str) -> bool {
    if [
        "<local>",
        "localhost",
        "127.*",
        "127.0.0.1",
        "10.*",
        "192.168.*",
    ]
    .contains(&value)
    {
        return true;
    }
    value
        .strip_prefix("172.")
        .and_then(|s| s.strip_suffix(".*"))
        .and_then(|s| s.parse::<u8>().ok())
        .is_some_and(|n| (16..=31).contains(&n))
}
