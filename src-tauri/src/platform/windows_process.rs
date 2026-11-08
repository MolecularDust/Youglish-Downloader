use std::{
    collections::{HashMap, HashSet},
    io,
    mem::{size_of, zeroed},
    os::windows::io::AsRawHandle,
    process::{Child, Command, ExitStatus, Output, Stdio},
    sync::{Mutex, OnceLock},
};
use windows_sys::Win32::{
    Foundation::{CloseHandle, HANDLE},
    System::{JobObjects::*, Threading::*},
};
#[link(name = "ntdll")]
unsafe extern "system" {
    fn NtSuspendProcess(process: HANDLE) -> i32;
    fn NtResumeProcess(process: HANDLE) -> i32;
}
struct Job {
    handle: usize,
    paused: HashSet<u32>,
}
impl Drop for Job {
    fn drop(&mut self) {
        unsafe {
            CloseHandle(self.handle as HANDLE);
        }
    }
}
fn jobs() -> &'static Mutex<HashMap<u32, Job>> {
    static JOBS: OnceLock<Mutex<HashMap<u32, Job>>> = OnceLock::new();
    JOBS.get_or_init(Default::default)
}
fn process_ids(job: HANDLE) -> io::Result<Vec<u32>> {
    // QueryInformationJobObject returns pointer-sized IDs, with an 8-byte header.
    let mut buffer = vec![0usize; 8194];
    unsafe {
        if QueryInformationJobObject(
            job,
            JobObjectBasicProcessIdList,
            buffer.as_mut_ptr().cast(),
            (buffer.len() * size_of::<usize>()) as u32,
            std::ptr::null_mut(),
        ) == 0
        {
            return Err(io::Error::last_os_error());
        }
        let list = buffer.as_ptr().cast::<JOBOBJECT_BASIC_PROCESS_ID_LIST>();
        Ok(std::slice::from_raw_parts(
            (*list).ProcessIdList.as_ptr(),
            (*list).NumberOfProcessIdsInList as usize,
        )
        .iter()
        .map(|p| *p as u32)
        .collect())
    }
}
pub fn signal(pid: u32, action: &str) -> Result<(), String> {
    let mut map = jobs().lock().map_err(|_| "Process registry unavailable")?;
    let job = map.get_mut(&pid).ok_or("Process has already exited")?;
    let handle = job.handle as HANDLE;
    if action == "cancel" {
        if unsafe { TerminateJobObject(handle, 1) } == 0 {
            return Err(io::Error::last_os_error().to_string());
        }
        return Ok(());
    }
    if action != "pause" && action != "resume" {
        return Err("Unknown process action".into());
    }
    // Suspend the parent first, then repeat until no newly spawned descendants remain.
    // A retained job owns all descendants, including yt-dlp's FFmpeg/Deno processes.
    loop {
        let ids = process_ids(handle).map_err(|e| e.to_string())?;
        let mut changed = false;
        for id in ids {
            if (action == "pause") == job.paused.contains(&id) {
                continue;
            }
            let process = unsafe {
                OpenProcess(
                    PROCESS_SUSPEND_RESUME | PROCESS_QUERY_LIMITED_INFORMATION,
                    0,
                    id,
                )
            };
            if process.is_null() {
                continue;
            } // A descendant may have just exited.
            let status = unsafe {
                if action == "pause" {
                    NtSuspendProcess(process)
                } else {
                    NtResumeProcess(process)
                }
            };
            unsafe {
                CloseHandle(process);
            }
            if status < 0 {
                return Err(format!(
                    "Cannot {action} media process (NTSTATUS {status:#x})"
                ));
            }
            if action == "pause" {
                job.paused.insert(id);
            } else {
                job.paused.remove(&id);
            }
            changed = true;
        }
        if !changed || action == "resume" {
            break;
        }
    }
    Ok(())
}
pub struct ManagedChild {
    child: Option<Child>,
    pid: u32,
}
impl std::ops::Deref for ManagedChild {
    type Target = Child;
    fn deref(&self) -> &Child {
        self.child.as_ref().unwrap()
    }
}
impl std::ops::DerefMut for ManagedChild {
    fn deref_mut(&mut self) -> &mut Child {
        self.child.as_mut().unwrap()
    }
}
impl ManagedChild {
    pub fn wait(&mut self) -> io::Result<ExitStatus> {
        let r = self.child.as_mut().unwrap().wait();
        if r.is_ok() {
            jobs().lock().unwrap().remove(&self.pid);
        }
        r
    }
    pub fn wait_with_output(mut self) -> io::Result<Output> {
        let r = self.child.take().unwrap().wait_with_output();
        jobs().lock().unwrap().remove(&self.pid);
        r
    }
}
impl Drop for ManagedChild {
    fn drop(&mut self) {
        jobs().lock().unwrap().remove(&self.pid);
        if let Some(c) = &mut self.child {
            let _ = c.wait();
        }
    }
}
pub fn spawn(command: &mut Command) -> io::Result<ManagedChild> {
    use std::os::windows::process::CommandExt;
    command.creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED);
    let mut child = command.spawn()?;
    let result = (|| unsafe {
        let handle = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if handle.is_null() {
            return Err(io::Error::last_os_error());
        }
        let job = Job {
            handle: handle as usize,
            paused: HashSet::new(),
        };
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if SetInformationJobObject(
            handle,
            JobObjectExtendedLimitInformation,
            (&info as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
            size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        ) == 0
            || AssignProcessToJobObject(handle, child.as_raw_handle() as HANDLE) == 0
        {
            return Err(io::Error::last_os_error());
        }
        if NtResumeProcess(child.as_raw_handle() as HANDLE) < 0 {
            return Err(io::Error::other("Cannot start media process"));
        }
        jobs().lock().unwrap().insert(child.id(), job);
        Ok(())
    })();
    if let Err(e) = result {
        let _ = child.kill();
        let _ = child.wait();
        return Err(e);
    }
    let pid = child.id();
    Ok(ManagedChild {
        child: Some(child),
        pid,
    })
}
pub fn output(command: &mut Command) -> io::Result<Output> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    spawn(command)?.wait_with_output()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};
    #[test]
    fn pause_resume_cancel_preserves_running_process_and_stops_descendants() {
        let path =
            std::env::temp_dir().join(format!("youglish-process-{}.txt", uuid::Uuid::new_v4()));
        let mut c = Command::new("powershell.exe");
        c.args(["-NoProfile","-NonInteractive","-Command", "$p=$env:YG_TEST_HEARTBEAT; while($true){[IO.File]::AppendAllText($p,'x'); Start-Sleep -Milliseconds 50}"])
            .env("YG_TEST_HEARTBEAT",&path).stdout(Stdio::null()).stderr(Stdio::null());
        let mut child = spawn(&mut c).unwrap();
        let deadline = Instant::now() + Duration::from_secs(15);
        while std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) < 3 {
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(50));
        }
        signal(child.id(), "pause").unwrap();
        std::thread::sleep(Duration::from_millis(150));
        let len = std::fs::metadata(&path).unwrap().len();
        std::thread::sleep(Duration::from_millis(300));
        assert_eq!(std::fs::metadata(&path).unwrap().len(), len);
        signal(child.id(), "pause").unwrap(); // idempotent; no extra suspend count
        signal(child.id(), "resume").unwrap();
        std::thread::sleep(Duration::from_millis(350));
        assert!(std::fs::metadata(&path).unwrap().len() > len);
        signal(child.id(), "pause").unwrap();
        signal(child.id(), "cancel").unwrap();
        assert!(!child.wait().unwrap().success());
        assert!(!jobs().lock().unwrap().contains_key(&child.id()));
        std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn dropping_owner_terminates_entire_process_tree() {
        let mut c = Command::new("cmd.exe");
        c.args(["/D", "/C", "ping -n 60 127.0.0.1 > nul"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        let child = spawn(&mut c).unwrap();
        let deadline = Instant::now() + Duration::from_secs(10);
        let ids = loop {
            let ids = process_ids(jobs().lock().unwrap()[&child.id()].handle as HANDLE).unwrap();
            if ids.len() >= 2 {
                break ids;
            }
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(30));
        };
        drop(child);
        for id in ids {
            let handle = unsafe { OpenProcess(0x00100000, 0, id) };
            if !handle.is_null() {
                assert_eq!(unsafe { WaitForSingleObject(handle, 5000) }, 0);
                unsafe {
                    CloseHandle(handle);
                }
            }
        }
    }
}

/// True when the process exists and has not exited. Access denied means it exists.
pub fn process_alive(pid: u32) -> bool {
    const STILL_ACTIVE: u32 = 259;
    const ERROR_ACCESS_DENIED: i32 = 5;
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return io::Error::last_os_error().raw_os_error() == Some(ERROR_ACCESS_DENIED);
        }
        let mut code = 0u32;
        let ok = GetExitCodeProcess(handle, &mut code);
        CloseHandle(handle);
        ok == 0 || code == STILL_ACTIVE
    }
}
