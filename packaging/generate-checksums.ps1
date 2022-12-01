# Generate SHA256 checksums of the specified filepath.
# Note that the directory will be stripped from the file path contained in the checksum file.

param(
    [Parameter(Mandatory)]
    [String]$FilePath
)

Get-ChildItem "$FilePath" |
    Select-Object -Property Name,Length,@{name="SHA256";expression={(Get-FileHash -Algorithm SHA256 $_.FullName).hash}} |
    Out-File -FilePath "$FilePath.sha256"
