use common::ipc::message::{
    ipc_read_message, ipc_write_message, IPCCommandMessage, IPCResponseMessage,
};
use std::{
    ffi::CString,
    io::{Error, ErrorKind},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};

use tokio::{net::UnixStream, sync::mpsc, task::JoinSet, time::sleep};

use util::{
    constants::*,
    launchd::{client_matches_code_signature_requirement, unix_listener_for_socket_name},
    system::wait_with_retry_backoff_for_pid_exit,
};

mod util;

// Embed `Info.plist` and `launchd.plist` at compile-time. This is required for macOS to be able to
// determine whether the main application is permitted to register this application as a privileged
// `SMJobBless` helper in the system.
//
// See: https://developer.apple.com/documentation/servicemanagement/smjobbless(_:_:_:_:)#Discussion.
embed_plist::embed_info_plist_bytes!(INFO_PLIST);
embed_plist::embed_launchd_plist_bytes!(LAUNCHD_PLIST);

/// `launchd` will automatically invoke this helper application whenever the socket referred in the
/// embedded `launchd.plist` is connected to by a client application. Note: It's the responsibility
/// of the helper to validate whether the respective client is authorized to connect.
#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("IPC: Helper is starting");

    // Listen on socket named "Primary", as defined in `launchd.plist`.
    let socket_name = CString::new("Primary")?;
    let listener = unix_listener_for_socket_name(&socket_name).inspect_err(|error| {
        eprintln!("Error: IPC: Creating listener failed with error: {error}")
    })?;
    println!(
        "IPC: Listener created for socket: {:?}",
        listener.local_addr().unwrap().as_pathname().unwrap()
    );

    let mut tasks = JoinSet::new();
    let active_connections = Arc::new(AtomicUsize::new(0));
    let (shutdown_sender, mut shutdown_receiver) = mpsc::channel::<()>(1);

    // Track active connections using a "monitor" thread. If there are zero active connections
    // during the idle time of 60 seconds, a shutdown signal will be sent to `shutdown_receiver`.
    let active_connections_monitor = Arc::clone(&active_connections);
    let shutdown_sender_monitor = shutdown_sender.clone();
    tasks.spawn(async move {
        loop {
            sleep(Duration::from_secs(60)).await;

            if active_connections_monitor.load(Ordering::SeqCst) == 0 {
                println!("IPC: Idle timeout reached with no active connections");
                let _ = shutdown_sender_monitor.send(()).await;
                break;
            }
        }
    });

    // Handle client connections using "handler" threads. Note: Handles each client connection in a
    // new thread, and the loop will end if a shutdown signal is received using `shutdown_receiver`
    // (see above).
    loop {
        tokio::select! {
            accept_client_result = listener.accept() => {
                if let Ok((client_connection_stream, _)) = accept_client_result {
                    // Increase connection counter.
                    let active_connections_handler = Arc::clone(&active_connections);
                    active_connections_handler.fetch_add(1, Ordering::SeqCst);

                    // Handle client in a new thread.
                    let active_connections_handler_clone = Arc::clone(&active_connections_handler);
                    tasks.spawn(async move {
                        let handle_client_result = handle_client(client_connection_stream).await;
                        match handle_client_result {
                            Ok(_) => {
                                println!("IPC: Client connection closed successfully");
                            },
                            Err(error) => {
                                eprintln!("IPC: Client connection closed with error: {}", error);
                            },
                        }

                        // Decrease connection counter.
                        active_connections_handler_clone.fetch_sub(1, Ordering::SeqCst);
                    });
                }
            }
            _ = shutdown_receiver.recv() => {
                break;
            }
        }
    }

    // Wait for all tasks to complete cleanly.
    println!("IPC: Starting helper shutdown, waiting for tasks to complete");
    while let Some(join_result) = tasks.join_next().await {
        if let Err(error) = join_result {
            eprintln!("IPC: Task completed with error: {}", error);
        }
    }

    println!("IPC: Helper is shutting down");
    Ok(())
}

async fn handle_client(mut client_connection_stream: UnixStream) -> Result<(), Error> {
    println!("IPC: Client connected");

    // Immediately disconnect clients that don't match the required code signature.
    if let Err(error) =
        client_matches_code_signature_requirement(&client_connection_stream, SM_AUTHORIZED_CLIENTS)
    {
        return Err(Error::new(
            ErrorKind::Other,
            format!("Client code signing validation failed: {}", error),
        ));
    };

    loop {
        let message = ipc_read_message::<IPCCommandMessage>(&mut client_connection_stream).await;
        match message {
            Ok(command) => {
                let result = handle_command(command).await;
                match result {
                    Ok(_) => {
                        let _ = ipc_write_message(
                            &mut client_connection_stream,
                            &IPCResponseMessage::Ok,
                        )
                        .await;
                    }
                    Err(error) => {
                        eprintln!("Error: IPC: Failed to execute command: {error}");
                        let _ = ipc_write_message(
                            &mut client_connection_stream,
                            &IPCResponseMessage::Err,
                        )
                        .await;
                    }
                }
            }
            Err(error) => {
                if error.kind() == ErrorKind::UnexpectedEof {
                    println!("IPC: Connection was closed by the client");
                } else {
                    eprintln!("Error: IPC: Failed to read or deserialize message: {error}");
                    let _ =
                        ipc_write_message(&mut client_connection_stream, &IPCResponseMessage::Err)
                            .await;
                }

                break;
            }
        }
    }

    Ok(())
}

async fn handle_command(command: IPCCommandMessage) -> Result<(), Error> {
    match command {
        IPCCommandMessage::ReplaceAppAtomic {
            source_path,
            destination_path,
        } => {
            println!("IPC: Command received: ReplaceAppAtomic");
            println!("Source path: {}", source_path.display());
            println!("Destination path: {}", destination_path.display());

            let result = util::fs::replace_app_atomic(
                &source_path,
                &destination_path,
                SM_AUTHORIZED_CLIENTS,
            );
            if result.is_ok() {
                println!("IPC: Command successful: ReplaceAppAtomic");
            }

            result
        }
        IPCCommandMessage::WaitForExitAndLaunch { pid, app_path } => {
            println!("IPC: Command received: WaitForExitAndLaunch");
            println!("Pid: {}", pid);
            println!("App path: {}", app_path.display());

            println!("Waiting for process with pid \"{}\" to exit", pid);
            wait_with_retry_backoff_for_pid_exit(
                pid,
                5,
                Duration::from_millis(500),
                Duration::from_secs(60),
            )
            .await?;
            println!("Process with pid \"{}\" has exited", pid);

            let result = util::app_kit::launch_app(&app_path);
            if result.is_ok() {
                println!("IPC: Command successful: WaitForExitAndLaunch");
            }

            result
        }
    }
}
