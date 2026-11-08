use crate::{base, model::Settings, safe_error};
use serde_json::{json, Value};
use std::path::PathBuf;
struct TempDir(PathBuf);
impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}
fn track(v: &Value, language: &str) -> Option<(String, bool)> {
    let manual = v["subtitles"].as_object();
    if let Some(map) = manual {
        let mut keys = map
            .keys()
            .filter(|k| *k == language || k.starts_with(&format!("{language}-")))
            .collect::<Vec<_>>();
        keys.sort_by_key(|k| (if k.as_str() == language { 0 } else { 1 }, k.as_str()));
        if let Some(k) = keys.first() {
            return Some(((*k).clone(), false));
        }
    }
    let auto = v["automatic_captions"].as_object()?;
    for key in [format!("{language}-orig"), language.to_string()] {
        if auto.get(&key).and_then(Value::as_array).is_some_and(|a| {
            a.iter().any(|f| {
                f["url"].as_str().is_some_and(|u| {
                    url::Url::parse(u)
                        .ok()
                        .is_some_and(|u| !u.query_pairs().any(|(k, _)| k == "tlang"))
                })
            })
        }) {
            return Some((key, true));
        }
    }
    None
}
pub fn retrieve(
    url: String,
    language: String,
    settings: Settings,
    cache: PathBuf,
) -> Result<(Value, Vec<u8>), String> {
    let normalized = crate::model::normalize(&url)?;
    if language.len() > 3 || language.len() < 2 || !language.bytes().all(|c| c.is_ascii_lowercase())
    {
        return Err("Unsupported caption language code".into());
    }
    let mut c = base(&settings)?;
    if cfg!(debug_assertions) {
        c.arg("--verbose"); // development builds only: makes yt-dlp print its phases for timing
    }
    let (o, trace) = crate::timing::run(c.args(["--dump-single-json", "--skip-download", "--", &normalized]))
        .map_err(|_| "Cannot start caption worker")?;
    crate::diagnostics::log_timed(
        crate::diagnostics::Stage::CaptionMetadata,
        &settings,
        o.status.code(),
        &String::from_utf8_lossy(&o.stderr),
        &trace,
    );
    if !o.status.success() {
        return Err(format!(
            "Caption request: {}",
            safe_error(&String::from_utf8_lossy(&o.stderr))
        ));
    }
    let raw = o.stdout;
    let v: Value = serde_json::from_slice(&raw).map_err(|_| "Invalid caption metadata")?;
    if v["is_live"].as_bool() == Some(true)
        || !v["duration"]
            .as_f64()
            .is_some_and(|d| d.is_finite() && d > 0.)
    {
        return Err("Choose a finished video with a finite duration.".into());
    }
    let (code, automatic) = track(&v, &language).ok_or(
        "No supplied or original automatic captions in this language. Translations are not used.",
    )?;
    let dir = TempDir(cache.join(uuid::Uuid::new_v4().to_string()));
    std::fs::create_dir_all(&dir.0).map_err(|_| "Cannot create temporary subtitle folder")?;
    // Reuse the extraction, including signed caption URLs and request headers.
    // Private temporary directory: metadata may contain authenticated URLs.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dir.0, std::fs::Permissions::from_mode(0o700))
            .map_err(|_| "Cannot secure temporary subtitle folder")?;
    }
    let info = dir.0.join("video.info.json");
    std::fs::write(
        &info,
        serde_json::to_vec(&v).map_err(|_| "Invalid metadata")?,
    )
    .map_err(|_| "Cannot save temporary metadata")?;
    let template = dir.0.join("captions.%(ext)s");
    let mut c = base(&settings)?;
    c.args([
        "--skip-download",
        "--sub-format",
        "json3",
        "--sub-langs",
        &code,
    ]);
    c.arg(if automatic {
        "--write-auto-subs"
    } else {
        "--write-subs"
    });
    if cfg!(debug_assertions) {
        c.arg("--verbose");
    }
    let (o, trace) = crate::timing::run(c.arg("-o").arg(template).arg("--load-info-json").arg(&info))
        .map_err(|_| "Cannot retrieve captions")?;
    crate::diagnostics::log_timed(
        crate::diagnostics::Stage::Captions,
        &settings,
        o.status.code(),
        &String::from_utf8_lossy(&o.stderr),
        &trace,
    );
    if !o.status.success() {
        return Err(format!(
            "Caption request: {}",
            safe_error(&String::from_utf8_lossy(&o.stderr))
        ));
    }
    let path = std::fs::read_dir(&dir.0)
        .map_err(|_| "No subtitle output")?
        .flatten()
        .map(|e| e.path())
        .find(|p| p.extension().is_some_and(|e| e == "json3"))
        .ok_or("No usable subtitle file")?;
    let json: Value =
        serde_json::from_slice(&std::fs::read(path).map_err(|_| "Cannot read captions")?)
            .map_err(|_| "Invalid caption data")?;
    let cues = json["events"]
        .as_array()
        .ok_or("No caption events")?
        .iter()
        .filter_map(|e| {
            let start = e["tStartMs"].as_f64()? / 1000.;
            let duration = e["dDurationMs"].as_f64()? / 1000.;
            let text = e["segs"]
                .as_array()?
                .iter()
                .filter_map(|s| s["utf8"].as_str())
                .collect::<String>();
            if text.trim().is_empty() || duration <= 0. {
                None
            } else {
                Some(json!({"start":start,"end":start+duration,"text":text}))
            }
        })
        .collect::<Vec<_>>();
    Ok((
        json!({"video": {"id":v["id"],"url":normalized,"title":v["title"],"channel":v["channel"],"duration":v["duration"],"thumbnail":v["thumbnail"],"formats":v["formats"].as_array().map(|a| a.iter().map(|f| json!({"format_id":f["format_id"],"height":f["height"],"vcodec":f["vcodec"],"acodec":f["acodec"],"ext":f["ext"]})).collect::<Vec<_>>()),"subtitles":v["subtitles"]},"track":{"language":code,"kind":if automatic {"original automatic"} else {"supplied"},"cues":cues}}),
        raw,
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn manual_first_and_no_translation() {
        let v = json!({"subtitles":{"en-custom":[{}]},"automatic_captions":{"en-orig":[{"url":"https://example.org/a?lang=en"}]}});
        assert_eq!(track(&v, "en"), Some(("en-custom".into(), false)));
        let v =
            json!({"automatic_captions":{"en":[{"url":"https://example.org/a?lang=es&tlang=en"}]}});
        assert_eq!(track(&v, "en"), None);
    }
}

#[cfg(test)]
mod network_tests {
    use super::*;
    #[test]
    #[ignore = "Requires network access and pinned media tools"]
    fn windows_public_caption_workflow() {
        let cache =
            std::env::temp_dir().join(format!("youglish-caption-smoke-{}", uuid::Uuid::new_v4()));
        let diagnostics = std::env::temp_dir().join(format!("yg-diag-{}", uuid::Uuid::new_v4()));
        crate::diagnostics::initialize(diagnostics.clone());
        let (result, _) = retrieve(
            "https://www.youtube.com/watch?v=H14bBuluwB8".into(),
            "en".into(),
            Settings::default(),
            cache.clone(),
        )
        .unwrap();
        assert!(!result["track"]["cues"].as_array().unwrap().is_empty());
        assert_eq!(std::fs::read_dir(&cache).unwrap().count(), 0);
        std::fs::remove_dir(cache).unwrap();
        let log = std::fs::read_to_string(diagnostics.join("media.jsonl")).unwrap();
        println!("{log}");
        assert!(log.contains("\"duration_ms\""));
        std::fs::remove_dir_all(diagnostics).unwrap();
    }
}
