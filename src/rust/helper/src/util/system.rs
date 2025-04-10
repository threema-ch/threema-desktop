use std::{
    cmp::min,
    io::{Error, ErrorKind},
    time::Duration,
};

use sysinfo::{Pid, System};
use tokio::time::sleep;

/// Wait for the process with the given `pid` to exit.
pub async fn wait_with_retry_backoff_for_pid_exit(
    pid: u32,
    max_retries: u32,
    initial_delay: Duration,
    max_delay: Duration,
) -> Result<(), Error> {
    let system = System::new();

    let mut delay = initial_delay;
    let mut attempts = 0;

    loop {
        let process = system.process(Pid::from_u32(pid));
        match process {
            Some(_) => {
                attempts += 1;
                if attempts >= max_retries {
                    return Err(Error::new(
                        ErrorKind::Other,
                        format!(
                            "Failed waiting for process exit after {} attempts",
                            attempts
                        ),
                    ));
                }
            }
            None => {
                return Ok(());
            }
        }

        println!(
            "Peer with pid {} is still running after {} attempts. Retrying in {:?}...",
            pid, attempts, delay
        );
        sleep(delay).await;

        // Increase delay exponentially.
        delay = min(delay * 2, max_delay);
    }
}
