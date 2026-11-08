use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Staging folders of this process, so they can be removed if the app exits mid-download.
static ACTIVE: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());
fn active() -> std::sync::MutexGuard<'static, Vec<PathBuf>> {
    ACTIVE.lock().unwrap_or_else(|e| e.into_inner())
}
/// Remove every staging folder this process still owns (called after child processes are killed).
pub fn remove_all_active() {
    for directory in active().drain(..) {
        let _ = std::fs::remove_dir_all(directory);
    }
}
fn staging_pid(name: &str) -> Option<u32> {
    name.strip_prefix(".tubecutter-")?
        .strip_suffix(".partial")?
        .split('-')
        .next()?
        .parse()
        .ok()
}
/// Remove staging folders left in `destination` by instances that no longer run.
/// Folders without a process id (older versions) and live instances' folders are kept.
pub fn sweep_stale(destination: &Path) {
    let Ok(entries) = std::fs::read_dir(destination) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        let is_dir = entry.file_type().is_ok_and(|t| t.is_dir() && !t.is_symlink());
        if is_dir && staging_pid(&name).is_some_and(|pid| !crate::platform::process_alive(pid)) {
            let _ = std::fs::remove_dir_all(entry.path());
        }
    }
}

/// Owns one download's staging directory. Only verified output is published.
pub struct DownloadFiles {
    pub directory: PathBuf,
    destination: PathBuf,
}
impl DownloadFiles {
    pub fn new(destination: &Path) -> Result<Self, String> {
        let destination = destination
            .canonicalize()
            .map_err(|_| "Destination is unavailable")?;
        let directory = destination.join(format!(
            ".tubecutter-{}-{}.partial",
            std::process::id(),
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir(&directory).map_err(|_| "Cannot create download staging folder")?;
        active().push(directory.clone());
        Ok(Self {
            directory,
            destination,
        })
    }
    pub fn publish(
        &self,
        path: &Path,
        name: Option<&str>,
        overwrite: bool,
    ) -> Result<PathBuf, String> {
        let path = path
            .canonicalize()
            .map_err(|_| "Verified output is unavailable")?;
        if path.parent() != Some(self.directory.as_path()) {
            return Err("Output is outside this download's staging folder".into());
        }
        let filename = match name {
            Some(name) => {
                if Path::new(name).file_name() != Some(std::ffi::OsStr::new(name))
                    || name.contains(['/', '\\'])
                {
                    return Err("Invalid output filename".into());
                }
                std::ffi::OsStr::new(name)
            }
            None => path.file_name().ok_or("Output has no filename")?,
        };
        if overwrite {
            let destination = self.destination.join(filename);
            // Both paths are on the same volume. Rename replaces the old file atomically.
            std::fs::rename(&path, &destination)
                .map_err(|e| format!("Cannot replace existing output: {e}"))?;
            return Ok(destination);
        }
        // Try each name atomically: another queued job may publish the same name concurrently.
        for number in 0..10_000 {
            let candidate = if number == 0 {
                PathBuf::from(filename)
            } else {
                let original = Path::new(filename);
                let stem = original.file_stem().unwrap_or(filename).to_string_lossy();
                let extension = original
                    .extension()
                    .map(|e| format!(".{}", e.to_string_lossy()))
                    .unwrap_or_default();
                PathBuf::from(format!("{stem} ({number}){extension}"))
            };
            let destination = self.destination.join(candidate);
            match publish_new(&path, &destination) {
                Ok(()) => return Ok(destination),
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
                    return Err("Cannot save output: the destination folder does not allow writing. Choose another folder.".into());
                }
                Err(e) => return Err(format!("Cannot save output: {e}")),
            }
        }
        Err("Cannot find an unused output filename. Choose another file name.".into())
    }

    pub fn cleanup(&self) -> Result<(), String> {
        let result = self.remove();
        if result.is_ok() {
            active().retain(|d| d != &self.directory);
        }
        result
    }
    fn remove(&self) -> Result<(), String> {
        match std::fs::remove_dir_all(&self.directory) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err(
                "Could not remove temporary download files. Check destination permissions.".into(),
            ),
        }
    }
}
impl Drop for DownloadFiles {
    fn drop(&mut self) {
        let _ = self.cleanup();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn destination() -> PathBuf {
        let path = std::env::temp_dir().join(format!("tubecutter-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&path).unwrap();
        path
    }
    #[test]
    fn cancellation_removes_all_job_artifacts_and_preserves_other_files() {
        let dest = destination();
        std::fs::write(dest.join("existing.mp4"), b"keep").unwrap();
        let files = DownloadFiles::new(&dest).unwrap();
        for name in [
            "video.mp4.part",
            "video.f137.mp4",
            "video.normalized.mp4",
            "video.en.vtt",
            "video.mp4.ytdl",
        ] {
            std::fs::write(files.directory.join(name), b"partial").unwrap();
        }
        files.cleanup().unwrap();
        assert!(!files.directory.exists());
        assert_eq!(std::fs::read(dest.join("existing.mp4")).unwrap(), b"keep");
        assert_eq!(std::fs::read_dir(&dest).unwrap().count(), 1);
        std::fs::remove_dir_all(dest).unwrap();
    }
    #[test]
    fn publishes_into_a_destination_longer_than_260_characters() {
        let mut dest = destination();
        for n in 0..6 {
            dest.push(format!("{n}-{}", "d".repeat(44)));
        }
        std::fs::create_dir_all(&dest).unwrap();
        assert!(dest.to_string_lossy().len() > 260);
        let files = DownloadFiles::new(&dest).unwrap();
        let source = files.directory.join("clip.mp4");
        std::fs::write(&source, b"x").unwrap();
        let published = files.publish(&source, Some("A clip.mp4"), false).unwrap();
        assert_eq!(std::fs::read(&published).unwrap(), b"x");
        drop(files);
        let root = dest.ancestors().nth(6).unwrap().to_path_buf();
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn sweep_removes_only_dead_instances_staging_folders() {
        let dest = destination();
        let mine = DownloadFiles::new(&dest).unwrap();
        let dead = dest.join(".tubecutter-2147483646-x.partial");
        std::fs::create_dir(&dead).unwrap();
        std::fs::write(dead.join("a.part"), b"x").unwrap();
        let legacy = dest.join(".tubecutter-legacy.partial");
        std::fs::create_dir(&legacy).unwrap();
        std::fs::write(dest.join("keep.mp4"), b"keep").unwrap();
        sweep_stale(&dest);
        assert!(!dead.exists() && legacy.exists() && mine.directory.exists());
        assert!(dest.join("keep.mp4").exists());
        drop(mine);
        std::fs::remove_dir_all(dest).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn cleanup_does_not_follow_links_to_unrelated_files() {
        let dest = destination();
        let outside = dest.join("unrelated");
        std::fs::create_dir(&outside).unwrap();
        std::fs::write(outside.join("keep.mp4"), b"keep").unwrap();
        let files = DownloadFiles::new(&dest).unwrap();
        std::os::unix::fs::symlink(&outside, files.directory.join("link")).unwrap();
        files.cleanup().unwrap();
        assert_eq!(std::fs::read(outside.join("keep.mp4")).unwrap(), b"keep");
        std::fs::remove_dir_all(dest).unwrap();
    }
    #[test]
    fn completed_output_survives_cleanup_and_existing_files_are_never_overwritten() {
        let dest = destination();
        let files = DownloadFiles::new(&dest).unwrap();
        let source = files.directory.join("video.mp4");
        std::fs::write(&source, b"complete").unwrap();
        let final_path = files
            .publish(&source, Some("Custom clip.mp4"), false)
            .unwrap();
        assert_eq!(final_path.file_name().unwrap(), "Custom clip.mp4");
        assert!(!dest.join("video.mp4").exists());
        let default_path = files.publish(&source, None, false).unwrap();
        assert_eq!(default_path.file_name().unwrap(), "video.mp4");
        let duplicate = files
            .publish(&source, Some("Custom clip.mp4"), false)
            .unwrap();
        assert_eq!(duplicate.file_name().unwrap(), "Custom clip (1).mp4");
        std::fs::write(dest.join("Custom clip (2).mp4"), b"keep").unwrap();
        let next = files
            .publish(&source, Some("Custom clip.mp4"), false)
            .unwrap();
        assert_eq!(next.file_name().unwrap(), "Custom clip (3).mp4");
        assert_eq!(
            std::fs::read(dest.join("Custom clip (2).mp4")).unwrap(),
            b"keep"
        );
        assert!(files
            .publish(&dest.join("Custom clip.mp4"), None, false)
            .is_err());
        let replacement = files.directory.join("replacement.mp4");
        std::fs::write(&replacement, b"replacement").unwrap();
        let overwritten = files
            .publish(&replacement, Some("Custom clip.mp4"), true)
            .unwrap();
        assert_eq!(overwritten, final_path);
        files.cleanup().unwrap();
        assert_eq!(std::fs::read(final_path).unwrap(), b"replacement");
        std::fs::remove_dir_all(dest).unwrap();
    }
}

// create_new preserves collision safety on removable FAT/exFAT volumes without hard links.
fn publish_new(source: &Path, destination: &Path) -> std::io::Result<()> {
    match std::fs::hard_link(source, destination) {
        Ok(()) => return Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => return Err(e),
        Err(_) => {}
    }
    let mut input = std::fs::File::open(source)?;
    let mut output = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)?;
    let result = std::io::copy(&mut input, &mut output).and_then(|_| output.sync_all());
    drop(output);
    if result.is_err() {
        let _ = std::fs::remove_file(destination);
    }
    result
}
