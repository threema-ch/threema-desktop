use encoding_rs::{UTF_16LE, UTF_8};
use regex::Regex;
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::{self, Error, ErrorKind, Read, Result},
    path::Path,
};

use crate::print_log;

/// Validates the given file using the given SHA-256 file.
#[allow(dead_code)]
pub fn validate_file_hash(file_path: &Path, sha256_file_path: &Path) -> Result<()> {
    let file_hash = calculate_hash(file_path)?.to_uppercase();
    let control_hash = extract_hash(sha256_file_path)?.to_uppercase();

    print_log!(
        "{}",
        format!("Comparing file hash {file_hash:?} to control {control_hash:?}",)
    );

    return match file_hash == control_hash {
        true => Ok(()),
        false => Err(Error::new(ErrorKind::Other, "Hashes do not match")),
    };
}

/// Extracts the SHA-256 hash contained in the given file. Note: The file is allowed to contain
/// other content, as the SHA-256 hash will be extracted using regex but it needs to be UTF-8 or
/// UTF-16 LE encoded.
#[allow(dead_code)]
fn extract_hash(file_path: &Path) -> Result<String> {
    let mut bytes = Vec::new();
    File::open(file_path)?.read_to_end(&mut bytes)?;

    let (cow, _encoding, has_error) = match bytes.starts_with(&[0xFF, 0xFE]) {
        true => UTF_16LE.decode(&bytes),
        false => UTF_8.decode(&bytes),
    };
    if has_error {
        return Err(Error::new(
            ErrorKind::Other,
            "SHA-256 hash cannot be extracted: error decoding file",
        ));
    }
    let content = cow.into_owned();

    let pattern = Regex::new(r"\b[A-Fa-f0-9]{64}\b").unwrap();
    if let Some(capture) = pattern.find(&content) {
        return Ok(capture.as_str().to_string());
    }

    return Err(Error::new(
        ErrorKind::NotFound,
        "SHA-256 hash not found in file",
    ));
}

/// Calculates the SHA-256 hash of the given file.
#[allow(dead_code)]
fn calculate_hash(file_path: &Path) -> Result<String> {
    let mut file_handle = File::open(file_path)?;
    let mut hasher = Sha256::new();

    io::copy(&mut file_handle, &mut hasher)?;

    return Ok(format!("{:x}", hasher.finalize()));
}
