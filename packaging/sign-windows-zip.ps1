# Sign EXE inside a release ZIP.

param(
    [Parameter(Mandatory, HelpMessage='Path to the unsigned Threema Desktop ZIP-File')]
    [ValidateNotNullOrEmpty()]
    [String]$ZipFilePath
)

# Error handling
$ErrorActionPreference = "Stop"

# Find Certificate
$Cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigning

# Create temporary directory
function New-TemporaryDirectory {
    $parent = [System.IO.Path]::GetTempPath()
    [string] $name = [System.Guid]::NewGuid()
    New-Item -ItemType Directory -Path (Join-Path $parent $name)
}
$TempDir = New-TemporaryDirectory

# Unzip
Write-Host "Extracting to $TempDir"
Expand-Archive -Path $ZipFilePath -DestinationPath $TempDir

# Sign
Write-Host "`nSigning EXE"
Set-AuthenticodeSignature `
    -Certificate $Cert -HashAlgorithm SHA256 -IncludeChain NotRoot `
    -TimestampServer http://timestamp.sectigo.com/ `
    -FilePath "$TempDir/threema-desktop-*/ThreemaDesktop.exe"

# Re-zip
$SignedZipFilePath = $ZipFilePath -Replace ".zip$","-signed.zip"
Write-Host "`nWriting $SignedZipFilePath"
Compress-Archive `
    -Path "$TempDir/threema-desktop-*" `
    -DestinationPath $SignedZipFilePath `
    -CompressionLevel Optimal

# Re-generate checksum file
Get-ChildItem $SignedZipFilePath |
    Select-Object -Property Name,Length,@{name="SHA256";expression={(Get-FileHash -Algorithm SHA256 $_.FullName).hash}} |
    Out-File -FilePath "$SignedZipFilePath.sha256"

Write-Host "`Done."
