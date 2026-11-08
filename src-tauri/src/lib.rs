mod captions;
mod diagnostics;
mod download_files;
mod model;
mod network;
mod platform;
mod player;
mod metadata;
mod session;
mod timing;
use model::*;
use std::{
    collections::HashMap,
    io::{BufRead, BufReader},
    path::PathBuf,
    process::Stdio,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager, State};
struct Backend {
    settings: Mutex<Settings>,
    jobs: Arc<Mutex<HashMap<String, Job>>>,
    origin: String,
    sender: std::sync::mpsc::Sender<(String, Settings)>,
    analyzer: Arc<Mutex<Option<u32>>>,
    metadata: Arc<metadata::MetadataCache>,
}
fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let p = if platform::portable() {
        platform::data_dir()?
    } else {
        app.path().app_config_dir().map_err(|e| e.to_string())?
    };
    std::fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p.join("settings.json"))
}
fn auth(c: &mut std::process::Command, s: &Settings) -> Result<(), String> {
    if !s.browser.is_empty() {
        if ![
            "opera", "chrome", "firefox", "safari", "edge", "brave", "chromium", "vivaldi",
        ]
        .contains(&s.browser.as_str())
        {
            return Err("Unsupported browser".into());
        }
        c.args(["--cookies-from-browser", &s.browser]);
    } else if !s.cookies_file.is_empty() {
        let p = PathBuf::from(&s.cookies_file);
        if !p.is_file() {
            return Err("Imported cookies file is no longer accessible".into());
        }
        c.arg("--cookies").arg(p);
    }
    Ok(())
}
/// yt-dlp command shared by lookups and downloads. Requests are not artificially delayed;
/// the queue's cooldown spaces consecutive downloads instead.
fn base(s: &Settings) -> Result<std::process::Command, String> {
    let mut c = platform::command("yt-dlp")?;
    c.args([
        "--ignore-config",
        "--no-playlist",
        "--no-warnings",
        "--socket-timeout",
        "20",
        "--retries",
        "0",
        "--fragment-retries",
        "0",
        "--extractor-retries",
        "0",
        "--compat-options",
        "prefer-legacy-http-handler",
    ]);
    if let Ok(p) = platform::binary("ffmpeg") {
        c.arg("--ffmpeg-location").arg(p.parent().unwrap());
    }
    if let Ok(p) = platform::binary("deno") {
        c.arg("--js-runtimes").arg(format!("deno:{}", p.display()));
    }
    match platform::cache_dir() {
        Some(dir) => c.arg("--cache-dir").arg(dir),
        None => c.arg("--no-cache-dir"),
    };
    network::configure(&mut c);
    auth(&mut c, s)?;
    diagnostics::log(diagnostics::Stage::Invocation, s, None, "");
    Ok(c)
}
fn safe_error(text: &str) -> String {
    let t = text.to_lowercase();
    if t.contains("python shared library") || t.contains("different team ids") {
        "The bundled downloader cannot load Python under the current macOS signature. This package needs its sidecar signing configuration corrected; use the development build in the meantime.".into()
    } else if t.contains("certificate verify failed") {
        "The media server certificate could not be verified. Check the bundled certificate store and network trust settings. Certificate verification was not bypassed.".into()
    } else if diagnostics::http_statuses(text).contains(&429) {
        "YouTube rate-limited this request. Stop and try later; automatic retries are disabled."
            .into()
    } else if diagnostics::connection_reset(text)
        || t.contains("ssl_connect")
        || t.contains("unexpected_eof")
        || t.contains("ssl_error_syscall")
        || t.contains("connection closed")
        || t.contains("-10054")
        || t.contains("handshake response")
    {
        "The secure network connection closed unexpectedly. Try again later; certificate checks remain enabled.".into()
    } else if t.contains("could not copy") && t.contains("cookie") {
        if cfg!(windows) {
            "Windows could not copy the browser cookie database. Close all browser windows and background processes, then retry. If access remains unavailable, import a Netscape cookies file. Browser security protections were not bypassed.".into()
        } else {
            "The browser cookie database could not be accessed. Close the browser and check its profile permissions.".into()
        }
    } else if t.contains("cookie decryption failed")
        || t.contains("failed to decrypt")
        || t.contains("could not find") && t.contains("cookie")
        || t.contains("failed to load cookies")
        || t.contains("keychain") && t.contains("error")
    {
        "Browser cookies are unavailable. Check the browser installation, browser permissions, and cookie store (close the browser first on Windows; Chromium encryption may require importing a Netscape cookies file); alternatively import a Netscape cookies file.".into()
    } else if t.contains("sign in")
        || t.contains("http error 403")
        || t.contains("403 forbidden")
        || t.contains("private video")
    {
        "YouTube denied access. The video may require authentication, or this network may be restricted.".into()
    } else if t.contains("requested format is not available") {
        "The exact requested format is unavailable. Choose a format listed by Analyze; no lower quality was substituted.".into()
    } else {
        "Media operation failed. Check connectivity, video availability, and media tool versions. No automatic whole-video fallback was attempted.".into()
    }
}
#[tauri::command]
fn installed_browsers() -> Vec<String> {
    platform::installed_browsers()
}

#[tauri::command]
fn get_settings(s: State<Backend>) -> Settings {
    s.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
}
#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    s: State<Backend>,
    settings: Settings,
) -> Result<(), String> {
    if !settings.destination.is_empty() && !PathBuf::from(&settings.destination).is_dir() {
        return Err("Choose an existing destination folder".into());
    }
    let path = settings_path(&app)?;
    std::fs::write(path, serde_json::to_vec_pretty(&settings).unwrap())
        .map_err(|e| e.to_string())?;
    *s.settings.lock().unwrap_or_else(|e| e.into_inner()) = settings;
    Ok(())
}
#[tauri::command]
async fn pick_folder() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .set_title("Choose download destination")
        .pick_folder()
        .await
        .map(|f| f.path().to_string_lossy().into_owned())
}
#[tauri::command]
async fn pick_cookies() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .set_title("Import Netscape cookies file")
        .add_filter("Cookies text file", &["txt"])
        .pick_file()
        .await
        .map(|f| f.path().to_string_lossy().into_owned())
}
#[tauri::command]
async fn caption_track(
    app: tauri::AppHandle,
    url: String,
    language: String,
    s: State<'_, Backend>,
) -> Result<serde_json::Value, String> {
    let settings = s.settings.lock().unwrap_or_else(|e| e.into_inner()).clone();
    let settings = session::prepare(&app, settings)?;
    let cache = if platform::portable() {
        platform::data_dir()?.join("Cache")
    } else {
        app.path()
            .app_cache_dir()
            .map_err(|_| "Cannot locate caption cache")?
    }
    .join("captions");

    let (value, raw) =
        tauri::async_runtime::spawn_blocking(move || captions::retrieve(url, language, settings, cache))
            .await
            .map_err(|_| "Caption worker stopped".to_string())??;
    // Keep the full metadata so the download of this video can skip extracting it again.
    if let Some(id) = value["video"]["id"].as_str() {
        s.metadata.put(id, raw);
    }
    Ok(value)
}
#[tauri::command]
fn player_origin(s: State<Backend>) -> String {
    s.origin.clone()
}
#[tauri::command]
async fn analyze(
    app: tauri::AppHandle,
    url: String,
    s: State<'_, Backend>,
) -> Result<serde_json::Value, String> {
    let normalized = normalize(&url)?;
    let settings = s.settings.lock().unwrap_or_else(|e| e.into_inner()).clone();
    let settings = session::prepare(&app, settings)?;
    let analyzer = s.analyzer.clone();
    {
        let mut active = analyzer.lock().unwrap_or_else(|e| e.into_inner());
        if active.is_some() {
            return Err("Video analysis is already running".into());
        }
        *active = Some(0);
    }
    let process = analyzer.clone();
    let result=tauri::async_runtime::spawn_blocking(move || ->Result<serde_json::Value,String> {
        let mut command=base(&settings)?;
        command.args(["--dump-single-json","--skip-download","--",&normalized]).stdout(Stdio::piped()).stderr(Stdio::piped());
        let child=platform::spawn(&mut command).map_err(|_|"Cannot start yt-dlp")?;
        *process.lock().unwrap_or_else(|e| e.into_inner())=Some(child.id());
        let o=child.wait_with_output().map_err(|_|"Metadata worker stopped")?;
        diagnostics::log(diagnostics::Stage::Analysis, &settings, o.status.code(), &String::from_utf8_lossy(&o.stderr));
        if !o.status.success(){return Err(safe_error(&String::from_utf8_lossy(&o.stderr)))}
        let v:serde_json::Value=serde_json::from_slice(&o.stdout).map_err(|_|"Invalid metadata response")?;
        if v["is_live"].as_bool()==Some(true){return Err("Live videos are not supported; choose a finished video".into())}
        let formats=v["formats"].as_array().map(|a|a.iter().map(|f|serde_json::json!({"format_id":f["format_id"],"height":f["height"],"vcodec":f["vcodec"],"acodec":f["acodec"],"ext":f["ext"]})).collect::<Vec<_>>());
        Ok(serde_json::json!({"id":v["id"],"url":normalized,"title":v["title"],"channel":v["channel"],"duration":v["duration"],"thumbnail":v["thumbnail"],"formats":formats,"subtitles":v["subtitles"]}))
    }).await.map_err(|_|"Metadata worker stopped".to_string());
    *analyzer.lock().unwrap_or_else(|e| e.into_inner()) = None;
    result?
}
fn update(
    app: &tauri::AppHandle,
    jobs: &Arc<Mutex<HashMap<String, Job>>>,
    id: &str,
    f: impl FnOnce(&mut Job),
) {
    if let Some(j) = jobs.lock().unwrap_or_else(|e| e.into_inner()).get_mut(id) {
        let canceled = j.state == "canceled";
        f(j);
        if canceled {
            j.state = "canceled".into();
        }
        if !j.hidden {
            let _ = app.emit("job", j.clone());
        }
    }
}
/// Run one queued job with a fresh cookie snapshot. A panic fails that job only; the queue continues.
fn run_job(
    app: &tauri::AppHandle,
    jobs: &Arc<Mutex<HashMap<String, Job>>>,
    id: &str,
    settings: Settings,
) {
    let fail = |message: String| {
        update(app, jobs, id, |j| {
            if j.state != "canceled" {
                j.state = "failed".into();
                j.message = message;
            }
            j.pid = 0;
        })
    };
    let settings = match session::prepare(app, settings) {
        Ok(settings) => settings,
        Err(e) => return fail(e),
    };
    let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let video = jobs.lock().unwrap_or_else(|e| e.into_inner())[id].request.url.clone();
        let video = normalize(&video).ok().and_then(|u| u.rsplit('=').next().map(str::to_string));
        let cache = app.state::<Backend>().metadata.clone();
        let cached = video.as_deref().and_then(|v| cache.get(v));
        let retry = match cached {
            Some(saved) => download(app.clone(), jobs.clone(), id.to_string(), settings.clone(), Some(saved)),
            None => true,
        };
        if retry {
            // No saved metadata, or it no longer worked (for example its links expired).
            if let Some(v) = video.as_deref() {
                cache.forget(v);
            }
            download(app.clone(), jobs.clone(), id.to_string(), settings, None);
        }
    }));
    if outcome.is_err() {
        fail("The download worker hit an internal error. Retry the download.".into());
    }
}
/// Returns true when it used saved metadata and the download failed in a way a fresh extraction
/// might fix; the caller then runs it again without the saved metadata.
fn download(
    app: tauri::AppHandle,
    jobs: Arc<Mutex<HashMap<String, Job>>>,
    id: String,
    s: Settings,
    saved: Option<Arc<Vec<u8>>>,
) -> bool {
    let r = jobs.lock().unwrap_or_else(|e| e.into_inner())[&id].request.clone();
    let mut files = None;
    let mut retry_fresh = false;
    let result = (|| -> Result<(), String> {
        let mut c = base(&s)?;
        let info_file = saved.as_ref().and_then(|json| session::write_metadata(&app, json).ok());
        let destination = PathBuf::from(&r.destination)
            .canonicalize()
            .map_err(|_| "Destination is unavailable")?;
        files = Some(download_files::DownloadFiles::new(&destination)?);
        let staging = files.as_ref().unwrap();
        let template = format!("%(title).100B [%(id)s] - {}.%(ext)s", &id[..8]);
        c.arg("--paths").arg(&staging.directory);
        c.args(["--no-quiet","--newline","--progress","--no-overwrites","--restrict-filenames","--continue","--progress-template","download:PROGRESS|%(progress._percent_str)s|%(progress.speed)s|%(progress.downloaded_bytes)s|%(progress._eta_str)s","--print","after_move:FILE|%(filepath)s","-o"]).arg(template);
        let mut video = String::from("bv");
        if let Some(h) = r.resolution {
            video.push_str(&format!(
                "[height{}{h}]",
                if h == 1080 { "<=" } else { "=" }
            ));
        }
        let codec = match r.codec.as_str() {
            "h264" => "avc1",
            "hevc" => "hev1|hvc1|hevc",
            "av1" => "av01",
            "vp9" => "vp09|vp9",
            _ => "",
        };
        if !codec.is_empty() {
            video.push_str(&format!("[vcodec~='^({codec})']"));
        }
        let format = if r.mode == "audio" {
            "ba".to_string()
        } else if r.audio == "none" {
            video.clone()
        } else {
            {
                let a = if r.audio == "original" && r.container == "mp4" {
                    "ba[acodec^=mp4a]"
                } else {
                    "ba"
                };
                let combined = video.replacen("bv", "b", 1);
                let combined = if r.audio == "original" && r.container == "mp4" {
                    format!("{combined}[acodec^=mp4a]")
                } else {
                    combined
                };
                format!("{video}+{a}/{combined}")
            }
        };
        c.args([
            "-f",
            &format,
            "--merge-output-format",
            &r.container,
            "--remux-video",
            &r.container,
        ]);
        if !r.subtitle.is_empty() {
            c.args(["--write-subs", "--sub-langs", &r.subtitle, "--embed-subs"]);
        }
        if let Some([a, b]) = r.section {
            c.args(["--download-sections", &format!("*{a}-{b}")]);
            if r.precise {
                c.arg("--force-keyframes-at-cuts");
                let encoder = match r.codec.as_str() {
                    "hevc" => "libx265",
                    "av1" => "libaom-av1",
                    "vp9" => "libvpx-vp9",
                    _ => "libx264",
                };
                c.args([
                    "--downloader-args",
                    &format!(
                        "ffmpeg_o:-progress pipe:1 -nostats -c:v {encoder} -crf 18 -c:a aac -f {}",
                        if r.container == "mkv" {
                            "matroska"
                        } else {
                            "mp4"
                        }
                    ),
                ]);
            } else {
                c.args(["--downloader-args", "ffmpeg_o:-progress pipe:1 -nostats"]);
            }
        }
        if cfg!(debug_assertions) {
            c.arg("--verbose"); // development builds only: lets timing see yt-dlp's phases
        }
        match &info_file {
            Some(file) => c.arg("--load-info-json").arg(&file.0),
            None => c.arg("--").arg(normalize(&r.url)?),
        };
        c.stdout(Stdio::piped()).stderr(Stdio::piped());
        let mut child = platform::spawn(&mut c).map_err(|_| "Unable to start downloader")?;
        {
            let mut map = jobs.lock().unwrap_or_else(|e| e.into_inner());
            let j = map.get_mut(&id).unwrap();
            if j.state == "canceled" {
                let _ = platform::signal(child.id(), "cancel");
                let _ = child.wait();
                return Ok(());
            }
            j.pid = child.id();
            j.state = "downloading".into();
            j.phase = "preparing".into();
            j.progress = 0.;
            j.message.clear();
            if !j.hidden {
                let _ = app.emit("job", j.clone());
            }
        }
        let stderr = child.stderr.take().unwrap();
        let trace = timing::Trace::new();
        let err_trace = trace.clone();
        let errors = std::thread::spawn(move || {
            let mut tail = String::new();
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                err_trace.note(&line);
                tail.push_str(&line);
                tail.push('\n');
                if tail.len() > 16384 {
                    let mut boundary = tail.len() - 16384;
                    while !tail.is_char_boundary(boundary) {
                        boundary += 1;
                    }
                    tail.drain(..boundary);
                }
            }
            tail
        });
        let mut rate_sample = std::time::Instant::now();
        let mut rate_bytes = 0_u64;
        for line in BufReader::new(child.stdout.take().unwrap())
            .lines()
            .map_while(Result::ok)
        {
            trace.note(&line);
            if line.starts_with("PROGRESS|") || line.starts_with("out_time_us=") {
                trace.mark_once("first_progress");
            }
            if line.starts_with("[download] Destination")
                || line.starts_with("PROGRESS|")
                || line.starts_with("out_time_us=")
            {
                update(&app, &jobs, &id, |j| {
                    if j.phase != "transferring" {
                        j.phase = "transferring".into();
                    }
                });
            }
            if let Some(micros) = line.strip_prefix("out_time_us=") {
                if let (Ok(us), Some([a, b])) = (micros.parse::<f64>(), r.section) {
                    update(&app, &jobs, &id, |j| {
                        j.progress = (us / 1_000_000.0 / (b - a) * 100.).clamp(0., 99.9);
                        if r.precise {
                            j.state = "processing".into();
                        }
                    });
                }
            } else if let Some(bytes) = line.strip_prefix("total_size=") {
                if let Ok(bytes) = bytes.parse::<u64>() {
                    update(&app, &jobs, &id, |j| j.bytes = format_size(bytes));
                    let elapsed = rate_sample.elapsed().as_secs_f64();
                    if elapsed >= 0.5 {
                        let speed = format_speed(bytes.saturating_sub(rate_bytes) as f64 / elapsed);
                        update(&app, &jobs, &id, |j| j.speed = speed);
                        rate_sample = std::time::Instant::now();
                        rate_bytes = bytes;
                    }
                }
            } else if let Some(rest) = line.strip_prefix("PROGRESS|") {
                let p: Vec<_> = rest.split('|').collect();
                if p.len() == 4 {
                    update(&app, &jobs, &id, |j| {
                        j.progress = p[0]
                            .trim()
                            .trim_end_matches('%')
                            .parse()
                            .unwrap_or(j.progress);
                        if let Ok(speed) = p[1].trim().parse::<f64>() {
                            j.speed = format_speed(speed);
                        }
                        if let Ok(bytes) = p[2].trim().parse::<u64>() {
                            j.bytes = format_size(bytes);
                        }
                        j.eta = if p[3].trim() == "NA" {
                            String::new()
                        } else {
                            p[3].trim().into()
                        };
                    });
                }
            } else if let Some(path) = line.strip_prefix("FILE|") {
                update(&app, &jobs, &id, |j| j.path = path.into());
            } else if line.contains("[Merger]") {
                update(&app, &jobs, &id, |j| j.state = "merging".into());
            } else if line.contains("[Video") || line.contains("[ExtractAudio]") {
                update(&app, &jobs, &id, |j| j.state = "processing".into());
            }
        }
        let status = child
            .wait()
            .map_err(|_| "Downloader did not exit cleanly")?;
        let errors = errors.join().unwrap_or_default();
        diagnostics::log_timed(diagnostics::Stage::Download, &s, status.code(), &errors, &trace);
        let post = timing::Trace::new();
        update(&app, &jobs, &id, |j| j.pid = 0);
        if jobs.lock().unwrap_or_else(|e| e.into_inner())[&id].state == "canceled" {
            return Ok(());
        }
        if !status.success() {
            if info_file.is_some() && !diagnostics::http_statuses(&errors).contains(&429) {
                retry_fresh = true;
                return Ok(());
            }
            return Err(safe_error(&errors));
        }
        update(&app, &jobs, &id, |j| j.phase = "finishing".into());
        let path = jobs.lock().unwrap_or_else(|e| e.into_inner())[&id].path.clone();
        if path.is_empty() || !PathBuf::from(&path).is_file() {
            return Err("Downloader returned no output file".into());
        }
        if r.section.is_some() && !r.precise {
            normalize_fast(&app, &jobs, &id, &path, &r)?;
            post.mark("normalize");
            if jobs.lock().unwrap_or_else(|e| e.into_inner())[&id].state == "canceled" {
                return Ok(());
            }
        }
        let probe = platform::output(platform::command("ffprobe")?.args([
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type,codec_name,width,height,start_time,duration",
            "-of",
            "json",
            &path,
        ]))
        .map_err(|_| "Cannot inspect output")?;
        if !probe.status.success() {
            return Err("Output failed FFprobe inspection".into());
        }
        post.mark("probe");
        let data: serde_json::Value =
            serde_json::from_slice(&probe.stdout).map_err(|_| "Invalid inspection result")?;
        let streams = data["streams"].as_array().ok_or("Output has no streams")?;
        let has_audio = streams.iter().any(|s| s["codec_type"] == "audio");
        if r.mode == "audio" && streams.iter().any(|s| s["codec_type"] == "video") {
            return Err("Audio-only output unexpectedly contains video".into());
        }
        if r.mode == "video" && r.audio == "none" && has_audio {
            return Err("Output unexpectedly contains audio".into());
        }
        if (r.mode == "audio" || r.audio != "none") && !has_audio {
            return Err("Output audio stream is missing".into());
        }
        if r.mode == "video"
            && r.codec != "auto"
            && !streams
                .iter()
                .any(|s| s["codec_name"].as_str() == Some(r.codec.as_str()))
        {
            return Err("Output codec differs from the requested codec".into());
        }
        let duration = data["format"]["duration"]
            .as_str()
            .and_then(|v| v.parse::<f64>().ok())
            .ok_or("Output duration is missing")?;
        let expected = r.section.map(|[a, b]| b - a).unwrap_or(r.duration);
        let deviation = duration - expected;
        let message = format!(
            "Verified duration: {duration:.3}s (difference {deviation:+.3}s). {}",
            if r.section.is_some() && deviation.abs() > 0.25 {
                if r.precise {
                    "Warning: precise cut exceeds 250ms tolerance."
                } else {
                    "Fast Cut includes keyframe pre-roll. Use Precise Cut for exact boundaries."
                }
            } else {
                ""
            }
        );
        if let Some(h) = r.resolution {
            if r.mode == "video"
                && !data["streams"]
                    .as_array()
                    .unwrap_or(&vec![])
                    .iter()
                    .any(|v| {
                        v["height"].as_u64().is_some_and(|height| {
                            if h == 1080 {
                                height > 0 && height <= 1080
                            } else {
                                height == h as u64
                            }
                        })
                    })
            {
                return Err("Output dimensions differ from the requested resolution".into());
            }
        }
        let custom_name = r
            .file_name
            .as_deref()
            .map(|name| output_file_name(name, &r.container))
            .transpose()?;
        let output_name = custom_name
            .as_deref()
            .map(std::ffi::OsStr::new)
            .or_else(|| std::path::Path::new(&path).file_name())
            .ok_or("Output has no filename")?;
        let target = destination.join(output_name);
        let mut overwrite = false;
        if target
            .try_exists()
            .map_err(|e| format!("Cannot check output filename: {e}"))?
        {
            update(&app, &jobs, &id, |j| {
                j.state = "processing".into();
                j.message = "Waiting for your choice: overwrite or save as new.".into();
            });
            let choice = rfd::MessageDialog::new()
                .set_title("File already exists")
                .set_description(format!(
                    "“{}” already exists in this folder. Replace it or keep both files?",
                    output_name.to_string_lossy()
                ))
                .set_level(rfd::MessageLevel::Warning)
                .set_buttons(rfd::MessageButtons::YesNoCancelCustom(
                    "Overwrite".into(),
                    "Save as New".into(),
                    "Cancel".into(),
                ))
                .show();
            match choice {
                rfd::MessageDialogResult::Custom(value) if value == "Overwrite" => overwrite = true,
                rfd::MessageDialogResult::Custom(value) if value == "Save as New" => {}
                _ => {
                    update(&app, &jobs, &id, |j| {
                        j.state = "canceled".into();
                        j.message = "Save canceled. The existing file was kept; the downloaded clip was discarded."
                            .into();
                    });
                    return Ok(());
                }
            }
        }
        // No job lock is held while the dialog awaits a choice. Recheck cancellation before saving.
        let mut map = jobs.lock().unwrap_or_else(|e| e.into_inner());
        let j = map.get_mut(&id).ok_or("Unknown download")?;
        if j.state == "canceled" {
            return Ok(());
        }
        let final_path = staging.publish(
            std::path::Path::new(&path),
            custom_name.as_deref(),
            overwrite,
        )?;
        post.mark("publish");
        diagnostics::log_timed(diagnostics::Stage::PostProcess, &s, None, "", &post);
        j.path = final_path.to_string_lossy().into_owned();
        j.state = "completed".into();
        j.phase.clear();
        j.progress = 100.;
        if let Ok(metadata) = std::fs::metadata(&final_path) {
            j.bytes = format_size(metadata.len());
        }
        j.speed.clear();
        j.eta.clear();
        j.message = message;
        j.pid = 0;
        if !j.hidden {
            let _ = app.emit("job", j.clone());
        }
        Ok(())
    })();
    // The worker reaches here only after its media processes have exited.
    if let Some(files) = files.as_ref() {
        let cleanup = files.cleanup();
        update(&app, &jobs, &id, |j| {
            if j.state == "canceled" {
                j.path.clear();
                j.speed.clear();
                j.eta.clear();
                j.pid = 0;
                j.message = match cleanup {
                    Ok(()) if j.message.starts_with("Save canceled") => j.message.clone(),
                    Ok(()) => "Canceled. Partial download files deleted.".into(),
                    Err(e) => e,
                };
            } else if let Err(e) = cleanup {
                j.message = format!("{} {e}", j.message);
            }
        });
    }
    if let Err(e) = result {
        update(&app, &jobs, &id, |j| {
            if j.state != "canceled" {
                j.state = "failed".into();
                j.message = e;
            }
            j.pid = 0;
        });
    }
    retry_fresh
}
// Some HTTP delivery formats retain a positive PTS origin when stream-copied.
// Normalize that origin locally without downloading or encoding any additional media.
fn normalize_fast(
    app: &tauri::AppHandle,
    jobs: &Arc<Mutex<HashMap<String, Job>>>,
    id: &str,
    path: &str,
    request: &Request,
) -> Result<(), String> {
    let scan = platform::output(platform::command("ffprobe")?.args([
        "-v",
        "error",
        "-select_streams",
        if request.mode == "audio" {
            "a:0"
        } else {
            "v:0"
        },
        "-read_intervals",
        "%+#64",
        "-show_entries",
        "packet=pts_time:format=duration",
        "-of",
        "json",
        path,
    ]))
    .map_err(|_| "Cannot inspect clip timestamps")?;
    let v: serde_json::Value =
        serde_json::from_slice(&scan.stdout).map_err(|_| "Cannot read clip timestamps")?;
    let first = v["packets"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|p| p["pts_time"].as_str()?.parse::<f64>().ok())
        .filter(|n| n.is_finite())
        .reduce(f64::min)
        .ok_or("Clip has no media packets")?;
    let mut first = first;
    if request.mode == "audio" {
        if let Some([a, b]) = request.section {
            let duration = v["format"]["duration"]
                .as_str()
                .and_then(|s| s.parse::<f64>().ok())
                .ok_or("Audio clip duration is unavailable")?;
            if (duration - (b - a)).abs() > 0.25 {
                if (duration - b).abs() < 0.25 && first.abs() < 0.25 {
                    first = a;
                } else {
                    return Err(
                        "Fast Cut audio timestamps could not be aligned. Use Precise Cut.".into(),
                    );
                }
            }
        }
    }
    if first <= 0.25 {
        return Ok(());
    }
    let p = PathBuf::from(path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .ok_or("Invalid clip extension")?;
    let temp = p.with_extension(format!("normalized.{ext}"));
    let child = platform::spawn(
        platform::command("ffmpeg")?
            .args([
                "-v",
                "error",
                "-n",
                "-ss",
                &first.to_string(),
                "-i",
                path,
                "-map",
                "0",
                "-c",
                "copy",
                "-avoid_negative_ts",
                "make_zero",
            ])
            .arg(&temp)
            .stdout(Stdio::null())
            .stderr(Stdio::piped()),
    )
    .map_err(|_| "Cannot normalize clip timestamps")?;
    let canceled = {
        let mut map = jobs.lock().unwrap_or_else(|e| e.into_inner());
        let j = map.get_mut(id).unwrap();
        if j.state == "canceled" {
            true
        } else {
            j.pid = child.id();
            j.state = "processing".into();
            if !j.hidden {
                let _ = app.emit("job", j.clone());
            }
            false
        }
    };
    if canceled {
        let _ = platform::signal(child.id(), "cancel");
    }
    let output = child
        .wait_with_output()
        .map_err(|_| "Clip normalization worker stopped")?;
    update(app, jobs, id, |j| j.pid = 0);
    if jobs.lock().unwrap_or_else(|e| e.into_inner())[id].state == "canceled" {
        return Ok(());
    }
    if !output.status.success() {
        return Err("Cannot normalize clip timestamps. Use Precise Cut".into());
    }
    std::fs::rename(temp, p).map_err(|_| "Cannot finalize normalized clip")?;
    Ok(())
}

#[tauri::command]
async fn enqueue(
    app: tauri::AppHandle,
    s: State<'_, Backend>,
    request: Request,
) -> Result<String, String> {
    if let Err(message) = validate(&request) {
        diagnostics::log(
            diagnostics::Stage::QueueRejected,
            &s.settings.lock().unwrap_or_else(|e| e.into_inner()),
            None,
            "",
        );
        return Err(message);
    }

    if !PathBuf::from(&request.destination).is_dir() {
        return Err("Choose an existing destination folder".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let job = Job {
        id: id.clone(),
        title: request
            .file_name
            .as_deref()
            .map(|name| output_file_name(name, &request.container))
            .transpose()?
            .unwrap_or_else(|| request.title.clone()),
        state: "queued".into(),
        phase: String::new(),
        progress: 0.,
        speed: String::new(),
        bytes: String::new(),
        eta: String::new(),
        message: String::new(),
        path: String::new(),
        pid: 0,
        request,
        hidden: false,
        retried: false,
    };
    let settings = s.settings.lock().unwrap_or_else(|e| e.into_inner()).clone();
    // The cookie snapshot is taken when the job starts, not while it waits in the queue.
    session::preflight(&app, &settings)?;
    s.jobs.lock().unwrap_or_else(|e| e.into_inner()).insert(id.clone(), job.clone());
    let _ = app.emit("job", job);
    s.sender
        .send((id.clone(), settings))
        .map_err(|_| "Download worker is unavailable")?;
    Ok(id)
}
#[tauri::command]
fn jobs(s: State<Backend>) -> Vec<Job> {
    s.jobs
        .lock()
        .unwrap()
        .values()
        .filter(|j| !j.hidden)
        .cloned()
        .collect()
}
#[tauri::command]
fn control(
    app: tauri::AppHandle,
    s: State<Backend>,
    id: String,
    action: String,
) -> Result<(), String> {
    if !["pause", "resume", "cancel"].contains(&action.as_str()) {
        return Err("Invalid queue action".into());
    }
    let mut map = s.jobs.lock().unwrap_or_else(|e| e.into_inner());
    let j = map.get_mut(&id).ok_or("Unknown download")?;
    if ["completed", "failed", "canceled"].contains(&j.state.as_str()) {
        return Err("Download is no longer active".into());
    }
    if j.pid == 0 && action != "cancel" {
        return Err("Wait until the download starts before pausing".into());
    }
    if j.pid != 0 {
        platform::signal(j.pid, &action)?;
    }
    j.state = match action.as_str() {
        "pause" => "paused",
        "resume" => "downloading",
        _ => "canceled",
    }
    .into();
    if !j.hidden {
        let _ = app.emit("job", j.clone());
    }
    Ok(())
}
#[tauri::command]
fn clear_completed(s: State<Backend>) -> Vec<String> {
    clear_finished(&mut s.jobs.lock().unwrap_or_else(|e| e.into_inner()))
}
#[tauri::command]
async fn retry(app: tauri::AppHandle, s: State<'_, Backend>, id: String) -> Result<String, String> {
    let request = {
        let mut map = s.jobs.lock().unwrap_or_else(|e| e.into_inner());
        let j = map.get_mut(&id).ok_or("Unknown download")?;
        if j.state != "failed" {
            return Err("Only failed downloads can be retried".into());
        }
        if j.retried {
            return Err("This download was already retried".into());
        }
        // Claimed before awaiting, so a double click cannot queue two copies.
        j.retried = true;
        j.request.clone()
    };
    let result = enqueue(app, s.clone(), request).await;
    if result.is_err() {
        if let Some(j) = s.jobs.lock().unwrap_or_else(|e| e.into_inner()).get_mut(&id) {
            j.retried = false;
        }
    }
    result
}
#[tauri::command]
fn reveal(s: State<Backend>, id: String) -> Result<(), String> {
    let map = s.jobs.lock().unwrap_or_else(|e| e.into_inner());
    let j = map.get(&id).ok_or("Unknown download")?;
    if j.state != "completed" || !PathBuf::from(&j.path).is_file() {
        return Err("Completed file is unavailable".into());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("/usr/bin/open")
            .args(["-R", &j.path])
            .spawn()
            .map_err(|_| "Could not reveal file")?;
    }
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg(format!(
                "/select,{}",
                j.path.strip_prefix(r"\\?\").unwrap_or(&j.path)
            ))
            .spawn()
            .map_err(|_| "Could not reveal file")?;
    }
    #[cfg(not(any(target_os = "macos", windows)))]
    return Err("Reveal is not implemented for this platform".into());
    Ok(())
}
/// Open the official site as the top-level document for a playback comparison.
/// No IPC capabilities are granted to this remote-content window.
// Async on purpose: a synchronous command that creates a webview window can deadlock on Windows.
#[tauri::command]
async fn test_youglish_window(
    app: tauri::AppHandle,
    phrase: String,
    language: String,
    accent: String,
) -> Result<(), String> {
    let url = youglish_test_url(&phrase, &language, &accent)?;
    show_session_window(app, url)
}

/// Use the same persistent, non-incognito webview as the playback test.
/// Authentication happens on Google's pages; no credentials are read by the app.
// Async on purpose: a synchronous command that creates a webview window can deadlock on Windows.
#[tauri::command]
async fn youtube_sign_in_window(app: tauri::AppHandle) -> Result<(), String> {
    show_session_window(
        app,
        url::Url::parse("https://accounts.google.com/").unwrap(),
    )
}

// Async on purpose: a synchronous command that creates a webview window can deadlock on Windows.
#[tauri::command]
async fn youtube_playback_test(app: tauri::AppHandle) -> Result<(), String> {
    show_session_window(
        app,
        url::Url::parse("https://www.youtube.com/watch?v=I2xDZlpInik&t=1034s").unwrap(),
    )
}

// Async on purpose: a synchronous command that creates a webview window can deadlock on Windows.
#[tauri::command]
async fn youtube_connect_window(app: tauri::AppHandle) -> Result<(), String> {
    show_session_window(
        app,
        url::Url::parse("https://www.youtube.com/signin").unwrap(),
    )
}

/// Open Google sign-in in the default browser, where passkeys and security keys are supported.
/// The app never receives the login; choose that browser under Download authentication afterwards.
#[tauri::command]
fn open_browser_sign_in() -> Result<(), String> {
    const SIGN_IN: &str =
        "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2F";
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("/usr/bin/open");
    #[cfg(target_os = "windows")]
    let mut command = {
        // explorer.exe can open a folder for this URL instead of the browser.
        let mut c = std::process::Command::new("rundll32.exe");
        c.arg("url.dll,FileProtocolHandler");
        c
    };
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut command = std::process::Command::new("xdg-open");
    command
        .arg(SIGN_IN)
        .spawn()
        .map_err(|_| "Could not open your browser".to_string())?;
    Ok(())
}

fn show_session_window(app: tauri::AppHandle, url: url::Url) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("youglish-test") {
        window
            .navigate(url)
            .map_err(|_| "Could not load session page")?;
        window.show().map_err(|_| "Could not show session window")?;
        window
            .set_focus()
            .map_err(|_| "Could not focus session window")?;
    } else {
        // Default persistent website store is shared by app webviews. Remote
        // content has no Tauri IPC capability. Do not use an ephemeral profile.
        tauri::WebviewWindowBuilder::new(&app, "youglish-test", tauri::WebviewUrl::External(url))
            .title("YouGlish Downloader — YouTube account")
            .inner_size(1080., 900.)
            .build()
            .map_err(|_| "Could not open the account window")?;
    }
    Ok(())
}

fn youglish_test_url(phrase: &str, language: &str, accent: &str) -> Result<url::Url, String> {
    if phrase.trim().is_empty()
        || phrase.len() > 1000
        || language.is_empty()
        || !language.bytes().all(|b| b.is_ascii_lowercase())
        || !accent.bytes().all(|b| b.is_ascii_lowercase())
    {
        return Err("Enter a phrase and select a language and accent".into());
    }
    let mut url = url::Url::parse("https://youglish.com").unwrap();
    url.path_segments_mut().unwrap().extend([
        "pronounce",
        phrase.trim(),
        language,
        if accent.is_empty() { "all" } else { accent },
    ]);
    Ok(url)
}
#[cfg(test)]
mod youglish_window_tests {
    use super::*;
    #[test]
    fn test_window_stays_on_official_host_and_encodes_query() {
        let url = youglish_test_url("hello / café? # & world", "english", "us").unwrap();
        assert_eq!(url.host_str(), Some("youglish.com"));
        assert!(url.query().is_none());
        assert!(url.fragment().is_none());
        assert_eq!(url.path_segments().unwrap().count(), 4);
        assert!(youglish_test_url("hello", "english/evil", "us").is_err());
        assert!(youglish_test_url("", "english", "").is_err());
        assert!(youglish_test_url("hi", "english", "")
            .unwrap()
            .path()
            .ends_with("/all"));
    }
}
#[tauri::command]
fn open_youtube(url: String) -> Result<(), String> {
    let url = normalize(&url)?;
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("/usr/bin/open");
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut c = std::process::Command::new("rundll32.exe");
        c.arg("url.dll,FileProtocolHandler");
        c
    };
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let mut command = std::process::Command::new("xdg-open");
    command
        .arg(url)
        .spawn()
        .map_err(|_| "Could not open your browser".to_string())?;
    Ok(())
}
#[tauri::command]
fn copy_youtube_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(normalize(&url)?)
        .map_err(|_| "Could not copy the video link".to_string())
}
#[tauri::command]
fn read_clipboard(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let text = app.clipboard().read_text().map_err(|_| {
        "Could not read the clipboard. Copy a video link and try again.".to_string()
    })?;
    if text.trim().is_empty() {
        return Err("The clipboard contains no text. Copy a video link first.".into());
    }
    Ok(text.trim().to_string())
}
pub fn run() {
    #[cfg(windows)]
    if platform::portable() {
        let data = platform::data_dir().expect("Move the portable app to a writable directory");
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data.join("WebView2"));
    }
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let log_dir = if platform::portable() {
                platform::data_dir().map(|p| p.join("Diagnostics"))
            } else {
                app.path().app_log_dir().map_err(|e| e.to_string())
            };
            if let Ok(path) = log_dir {
                diagnostics::initialize(path);
            }
            let settings: Settings = settings_path(app.handle())
                .ok()
                .and_then(|p| std::fs::read(p).ok())
                .and_then(|b| serde_json::from_slice(&b).ok())
                .unwrap_or_default();
            if let Ok(dir) = session::dir(app.handle()) {
                session::sweep_stale(&dir);
            }
            let cache = if platform::portable() {
                platform::data_dir().map(|p| p.join("Cache"))
            } else {
                app.path().app_cache_dir().map_err(|e| e.to_string())
            };
            if let Ok(cache) = cache {
                platform::set_cache_dir(cache.join("yt-dlp"));
            }
            if !settings.destination.is_empty() {
                download_files::sweep_stale(std::path::Path::new(&settings.destination));
            }
            let jobs: Arc<Mutex<HashMap<String, Job>>> = Arc::new(Mutex::new(HashMap::new()));
            let (sender, receiver) = std::sync::mpsc::channel::<(String, Settings)>();
            let worker_jobs = jobs.clone();
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut previous_finished: Option<std::time::Instant> = None;
                for (id, settings) in receiver {
                    loop {
                        let active = worker_jobs
                            .lock()
                            .unwrap()
                            .get(&id)
                            .is_some_and(|j| j.state != "canceled");
                        if !active {
                            break;
                        }
                        let remaining = cooldown_seconds(previous_finished.map(|t| t.elapsed()));
                        if remaining == 0 {
                            run_job(&handle, &worker_jobs, &id, settings);
                            previous_finished = Some(std::time::Instant::now());
                            break;
                        }
                        update(&handle, &worker_jobs, &id, |j| {
                            j.state = "cooldown".into();
                            j.message = format!(
                                "Cooling down — next download starts in {remaining} seconds."
                            );
                        });
                        std::thread::sleep(std::time::Duration::from_millis(200));
                    }
                }
            });
            app.manage(Backend {
                settings: Mutex::new(settings),
                jobs,
                sender,
                analyzer: Arc::new(Mutex::new(None)),
                metadata: Arc::new(metadata::MetadataCache::default()),
                origin: player::start().map_err(std::io::Error::other)?,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_clipboard,
            open_youtube,
            open_browser_sign_in,
            test_youglish_window,
            youtube_sign_in_window,
            youtube_connect_window,
            youtube_playback_test,
            copy_youtube_link,
            get_settings,
            installed_browsers,
            save_settings,
            pick_folder,
            pick_cookies,
            player_origin,
            analyze,
            caption_track,
            enqueue,
            jobs,
            control,
            clear_completed,
            retry,
            reveal
        ])
        .build(tauri::generate_context!())
        .expect("Unable to start TubeCutter");
    app.run(|app, event| {
        if let tauri::RunEvent::Exit = event {
            let s = app.state::<Backend>();
            if let Some(pid) = *s.analyzer.lock().unwrap_or_else(|e| e.into_inner()) {
                if pid != 0 {
                    let _ = platform::signal(pid, "cancel");
                }
            }
            for j in s.jobs.lock().unwrap_or_else(|e| e.into_inner()).values() {
                if j.pid != 0 {
                    let _ = platform::signal(j.pid, "cancel");
                }
            }
            if let Ok(dir) = session::dir(app) {
                session::remove_own(&dir);
            }
            download_files::remove_all_active();
        }
    });
}

#[cfg(test)]
mod error_tests {
    use super::*;
    #[test]
    fn authentication_advice_is_not_a_cookie_extraction_failure() {
        assert!(safe_error(
            "ERROR: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies"
        )
        .contains("YouTube denied access"));
        assert!(
            safe_error("Extracted 100 cookies\nERROR: HTTP Error 403: Forbidden")
                .contains("YouTube denied access")
        );
        assert!(
            !safe_error("[info] Downloading formats\nERROR: ffmpeg exited with code 1")
                .contains("requested format")
        );
    }
    #[test]
    fn windows_exit_code_is_not_http_429() {
        let e = safe_error("ERROR: ffmpeg exited with code 4294957242");
        assert!(!e.contains("rate-limited"));
        assert!(e.contains("network connection"));
        assert!(safe_error("ERROR: HTTP Error 429: Too Many Requests").contains("rate-limited"));
        assert!(
            !safe_error("ERROR: failed https://example.com/?token=429").contains("rate-limited")
        );
    }
    #[test]
    fn anonymous_and_browser_modes_share_network_configuration() {
        let anon = base(&Settings::default()).unwrap();
        let mut settings = Settings::default();
        settings.browser = "edge".into();
        let browser = base(&settings).unwrap();
        let a = anon
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        let b = browser
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        assert!(!a.iter().any(|x| x == "--cookies-from-browser"));
        assert_eq!(&b[..a.len()], a.as_slice());
        assert_eq!(&b[a.len()..], ["--cookies-from-browser", "edge"]);
    }
    #[test]
    fn requests_are_not_artificially_delayed() {
        let args = base(&Settings::default())
            .unwrap()
            .get_args()
            .map(|a| a.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        assert!(!args.iter().any(|a| a.starts_with("--sleep")));
    }
    #[test]
    fn sensitive_diagnostics_are_not_reflected() {
        let e = safe_error("Cookie decryption failed: SECRET_VALUE /private/auth-file.txt");
        assert!(!e.contains("SECRET_VALUE"));
        assert!(!e.contains("auth-file"));
        assert!(e.contains("Browser cookies"));
    }
    #[test]
    fn native_packaging_is_not_misreported_as_authentication() {
        let e = safe_error(
            "Failed to load Python shared library /private/temp/Python: different Team IDs",
        );
        assert!(e.contains("signature"));
        assert!(!e.contains("YouTube denied"));
    }
    #[test]
    fn macos_private_paths_do_not_imply_private_videos() {
        assert!(!safe_error("/private/var/tmp: unexpected failure").contains("YouTube denied"));
    }
}

#[cfg(all(test, windows))]
mod configured_route_tests {
    use super::*;
    #[test]
    #[ignore = "Requires this workstation's configured manual Windows proxy; no network access"]
    fn configured_windows_route_is_explicit_in_anonymous_and_authenticated_modes() {
        assert_eq!(network::proxy_source(), "windows_manual");
        for browser in ["", "edge", "opera"] {
            let mut settings = Settings::default();
            settings.browser = browser.into();
            let c = base(&settings).unwrap();
            let args = c
                .get_args()
                .map(|a| a.to_string_lossy().into_owned())
                .collect::<Vec<_>>();
            let n = args
                .iter()
                .position(|a| a == "--proxy")
                .expect("Windows manual proxy was not forwarded");
            let proxy = url::Url::parse(&args[n + 1]).unwrap();
            assert_eq!(proxy.host_str(), Some("127.0.0.1"));
            assert!(proxy.username().is_empty());
            assert_eq!(
                args.iter().any(|a| a == "--cookies-from-browser"),
                !browser.is_empty()
            );
        }
    }
}

#[cfg(test)]
mod cookie_error_tests {
    use super::*;
    #[test]
    fn cookie_database_copy_error_is_separate_from_http_and_decryption() {
        let message=safe_error("ERROR: Could not copy Chrome cookie database. See https://github.com/yt-dlp/yt-dlp/issues/7271");
        assert!(message.contains("cookie database"));
        assert!(!message.contains("rate-limited"));
        assert!(!message.contains("decryption failed"));
        assert!(!message.contains("github.com"));
    }
}
