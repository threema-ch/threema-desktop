use std::{
    fs::read_dir,
    path::{Path, PathBuf},
};

/// Returns all files with the given `extension` in the given `directory`.
pub fn find_files_by_extension_in(directory: &Path, extension: &str) -> Vec<PathBuf> {
    let result = read_dir(directory).ok().map(|value| {
        value
            .filter_map(Result::ok)
            .map(|file| file.path())
            .filter(|path| path.extension().and_then(|ext| ext.to_str()) == Some(extension))
            .collect()
    });

    result.unwrap_or_default()
}
