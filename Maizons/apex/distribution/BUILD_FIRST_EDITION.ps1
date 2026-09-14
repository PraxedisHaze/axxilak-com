[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $source 'release-candidates'
$package = Join-Path $releaseRoot 'Apex-First-Edition-1.0'
$zip = Join-Path $releaseRoot 'Apex-First-Edition-1.0.zip'

if ((Test-Path -LiteralPath $package) -or (Test-Path -LiteralPath $zip)) {
    throw "Release candidate already exists. Refusing to overwrite: $package"
}

New-Item -ItemType Directory -Path $package -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $source 'index.html') -Destination $package
foreach ($folder in @('css', 'icons')) {
    Copy-Item -LiteralPath (Join-Path $source $folder) -Destination (Join-Path $package $folder) -Recurse
}
New-Item -ItemType Directory -Path (Join-Path $package 'js') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $source 'js') -Force | Where-Object { $_.Name -ne '_archive' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $package 'js') -Recurse
}
New-Item -ItemType Directory -Path (Join-Path $package 'marketing') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $source 'marketing\clock-electrify-instructions.png') -Destination (Join-Path $package 'marketing\clock-electrify-instructions.png')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'START_HERE.md') -Destination (Join-Path $package 'START_HERE.md')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LICENSE_CANDIDATE.md') -Destination (Join-Path $package 'LICENSE.md')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'PACKAGE_SCOPE.md') -Destination (Join-Path $package 'PACKAGE_MANIFEST.md')
Set-Content -LiteralPath (Join-Path $package 'OPEN_APEX.bat') -Value ("@echo off`r`nstart index.html`r`n") -NoNewline
Compress-Archive -LiteralPath $package -DestinationPath $zip
Write-Output "Package: $package"
Write-Output "ZIP: $zip"