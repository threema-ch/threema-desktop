# Generate SHA256 checksums of the specified filepath.
# Note that the directory will be stripped from the file path contained in the checksum file.

param(
    [Parameter(Mandatory)]
    [String]$FilePath
)

# Get just the filename without the directory path.
$FileName = Split-Path $FilePath -Leaf

# Calculate hash, format output, and save it to a file.
$Hash = (Get-FileHash -Algorithm SHA256 $FilePath).Hash.ToLower()
"$Hash  $FileName" | Out-File -FilePath "$FilePath.sha256" -NoNewline -Encoding utf8
