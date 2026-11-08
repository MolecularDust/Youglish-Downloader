//! In-memory copy of the yt-dlp metadata fetched by Look Up, so the matching download can skip
//! re-extracting it. Signed media links in it expire, so entries are short-lived and a failed
//! download falls back to a fresh extraction.
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
const LIFETIME: Duration = Duration::from_secs(20 * 60);
const CAPACITY: usize = 4;
#[derive(Default)]
pub struct MetadataCache(Mutex<Vec<(String, Instant, Arc<Vec<u8>>)>>);
impl MetadataCache {
    fn lock(&self) -> std::sync::MutexGuard<'_, Vec<(String, Instant, Arc<Vec<u8>>)>> {
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
    pub fn put(&self, video: &str, json: Vec<u8>) {
        let mut entries = self.lock();
        entries.retain(|(v, ..)| v != video);
        entries.push((video.to_string(), Instant::now(), Arc::new(json)));
        while entries.len() > CAPACITY {
            entries.remove(0);
        }
    }
    pub fn get(&self, video: &str) -> Option<Arc<Vec<u8>>> {
        let mut entries = self.lock();
        entries.retain(|(_, at, _)| at.elapsed() < LIFETIME);
        entries
            .iter()
            .find(|(v, ..)| v == video)
            .map(|(_, _, json)| json.clone())
    }
    pub fn forget(&self, video: &str) {
        self.lock().retain(|(v, ..)| v != video);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn keeps_recent_entries_and_evicts_oldest() {
        let cache = MetadataCache::default();
        for n in 0..5 {
            cache.put(&format!("v{n}"), vec![n]);
        }
        assert!(cache.get("v0").is_none());
        assert_eq!(*cache.get("v4").unwrap(), vec![4]);
        cache.put("v4", vec![9]);
        assert_eq!(*cache.get("v4").unwrap(), vec![9]);
        cache.forget("v4");
        assert!(cache.get("v4").is_none());
    }
}
