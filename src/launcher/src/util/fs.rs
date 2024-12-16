use std::{
    fs::{self, File},
    io::{self, Error, ErrorKind, Result},
    path::Path,
};

use sha2::{Digest, Sha256};

use crate::print_log;

/// Validates the given file using the given SHA-256 file.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn validate_file_hash(file_path: &Path, sha256_file_path: &Path) -> Result<()> {
    let file_hash = calculate_hash(file_path)?.to_uppercase();
    print_log!("Calculated file hash: {:?}", file_hash);

    let control_hash = extract_hash(sha256_file_path)?.to_uppercase();
    print_log!("Comparing file hash to control hash: {:?}", control_hash);

    match file_hash == control_hash {
        true => Ok(()),
        false => Err(Error::new(ErrorKind::Other, "Hashes do not match")),
    }
}

/// Extracts the SHA-256 hash contained in the given file.
///
/// Note: The file is allowed to contain other content, but the content is expected to start with
/// the SHA-256 hash, followed by a whitespace.
#[cfg_attr(not(windows), allow(dead_code))]
fn extract_hash(file_path: &Path) -> Result<String> {
    let mut file_content = fs::read_to_string(file_path)?;
    // Remove BOM if present.
    if file_content.starts_with('\u{FEFF}') {
        print_log!("Removing BOM from hash file content");
        // Note: UTF-8 representation of the BOM (U+FEFF) is `EF BB BF`.
        file_content = file_content[3..].to_string();
    };

    let file_hash: String = file_content
        .chars()
        .take_while(|&char| char != ' ')
        .collect();

    if file_hash.len() != 64 {
        return Err(Error::new(
            ErrorKind::InvalidData,
            format!("Unexpected hash length: {}", file_hash.len()),
        ));
    }

    Ok(file_hash)
}

/// Calculates the SHA-256 hash of the given file.
#[cfg_attr(not(windows), allow(dead_code))]
fn calculate_hash(file_path: &Path) -> Result<String> {
    let mut file_handle = File::open(file_path)?;
    let mut hasher = Sha256::new();

    io::copy(&mut file_handle, &mut hasher)?;

    Ok(format!("{:x}", hasher.finalize()))
}
