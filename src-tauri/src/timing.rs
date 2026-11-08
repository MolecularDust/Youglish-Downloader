//! Phase timing for yt-dlp runs. Only fixed labels are recorded, never the output text itself.
use serde::Serialize;
use std::{
    io::{BufRead, BufReader, Read},
    process::{Command, Output, Stdio},
    sync::{Arc, Mutex},
    time::Instant,
};

#[derive(Clone, Serialize)]
pub struct Phase {
    pub label: &'static str,
    pub ms: u64,
}
pub struct Trace {
    start: Instant,
    phases: Mutex<Vec<Phase>>,
}
impl Trace {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            start: Instant::now(),
            phases: Mutex::new(Vec::new()),
        })
    }
    /// Record the label (if any) that `line` matches, with the time since the run started.
    pub fn note(&self, line: &str) {
        if let Some(label) = phase_label(line) {
            let mut phases = self.phases.lock().unwrap_or_else(|e| e.into_inner());
            if phases.len() < 64 {
                phases.push(Phase {
                    label,
                    ms: self.start.elapsed().as_millis() as u64,
                });
            }
        }
    }
    /// Record a named point in the run (for steps that do not print recognisable output).
    pub fn mark(&self, label: &'static str) {
        let mut phases = self.phases.lock().unwrap_or_else(|e| e.into_inner());
        if phases.len() < 64 {
            phases.push(Phase {
                label,
                ms: self.start.elapsed().as_millis() as u64,
            });
        }
    }
    pub fn mark_once(&self, label: &'static str) {
        let seen = self
            .phases
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .any(|p| p.label == label);
        if !seen {
            self.mark(label);
        }
    }
    pub fn finish(&self) -> (u64, Vec<Phase>) {
        let phases = self.phases.lock().unwrap_or_else(|e| e.into_inner());
        (self.start.elapsed().as_millis() as u64, phases.clone())
    }
}
pub fn phase_label(line: &str) -> Option<&'static str> {
    let l = line.to_ascii_lowercase();
    let table: [(&str, &'static str); 14] = [
        ("extracting url", "extract_start"),
        ("downloading webpage", "webpage"),
        ("downloading player", "player_js"),
        ("api json", "player_api"),
        ("m3u8 information", "m3u8"),
        ("jsc", "js_challenge"),
        ("js challenge", "js_challenge"),
        ("po token", "po_token"),
        ("sleeping", "sleep"),
        ("format(s)", "formats_selected"),
        ("subtitle", "subtitles"),
        ("[download] destination", "download_start"),
        ("[merger]", "merge"),
        ("[videoremuxer]", "remux"),
    ];
    table
        .iter()
        .find(|(needle, _)| l.contains(needle))
        .map(|(_, label)| *label)
}
/// Run a command to completion like `Output`, noting phases from stderr as they appear.
pub fn run(command: &mut Command) -> std::io::Result<(Output, Arc<Trace>)> {
    let trace = Trace::new();
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = crate::platform::spawn(command)?;
    let mut stdout = child.stdout.take().ok_or(std::io::ErrorKind::BrokenPipe)?;
    let stderr = child.stderr.take().ok_or(std::io::ErrorKind::BrokenPipe)?;
    let out = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let _ = stdout.read_to_end(&mut bytes);
        bytes
    });
    let err_trace = trace.clone();
    let err = std::thread::spawn(move || {
        let mut text = Vec::new();
        for line in BufReader::new(stderr).split(b'\n').map_while(Result::ok) {
            err_trace.note(&String::from_utf8_lossy(&line));
            text.extend_from_slice(&line);
            text.push(b'\n');
        }
        text
    });
    let status = child.wait()?;
    Ok((
        Output {
            status,
            stdout: out.join().unwrap_or_default(),
            stderr: err.join().unwrap_or_default(),
        },
        trace,
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn labels_are_fixed_and_text_is_never_recorded() {
        assert_eq!(phase_label("[youtube] abc: Downloading webpage"), Some("webpage"));
        assert_eq!(phase_label("[youtube] [jsc:deno] Solving JS challenges"), Some("js_challenge"));
        assert_eq!(phase_label("[youtube] Sleeping 3.0 seconds ..."), Some("sleep"));
        assert_eq!(phase_label("Cookie: SECRET"), None);
        let trace = Trace::new();
        trace.note("[youtube] x: Downloading webpage https://secret.example/?token=SECRET");
        let (_, phases) = trace.finish();
        let json = serde_json::to_string(&phases).unwrap();
        assert!(json.contains("webpage") && !json.contains("SECRET"));
    }
    #[cfg(unix)]
    #[test]
    fn run_collects_output_and_phases() {
        let mut c = Command::new("/bin/sh");
        c.args(["-c", "echo out; echo '[youtube] a: Downloading webpage' >&2"]);
        let (output, trace) = run(&mut c).unwrap();
        assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "out");
        assert!(output.status.success());
        assert_eq!(trace.finish().1[0].label, "webpage");
    }
}
