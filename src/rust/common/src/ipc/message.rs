use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::path::PathBuf;

use tokio::{
    io::{AsyncReadExt, AsyncWriteExt, Error, ErrorKind, Result},
    net::UnixStream,
};

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IPCCommandMessage {
    ReplaceAppAtomic {
        source_path: PathBuf,
        destination_path: PathBuf,
    },
    /// Wait until the process with the given `pid` has exited, and then launch the app package at
    /// the given `app_path`.
    WaitForExitAndLaunch { pid: u32, app_path: PathBuf },
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IPCResponseMessage {
    Ok,
    Err,
}

/// Read and deserialize a message from the given `stream`.
pub async fn ipc_read_message<T: DeserializeOwned>(stream: &mut UnixStream) -> Result<T> {
    let length = stream.read_u32().await?;
    let mut buffer = vec![0; length.try_into().unwrap()];
    stream.read_exact(&mut buffer).await?;

    serde_json::from_slice(&buffer).map_err(|error| Error::new(ErrorKind::InvalidData, error))
}

/// Serialize and write the given `message` to the given `stream`.
pub async fn ipc_write_message<T: Serialize>(stream: &mut UnixStream, message: &T) -> Result<()> {
    let buffer = serde_json::to_vec(message)?;
    stream.write_u32(buffer.len().try_into().unwrap()).await?;
    stream.write_all(&buffer).await?;

    Ok(())
}
