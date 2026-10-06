#!/usr/bin/env pwsh
# Build indotunnel release binaries for every supported platform and stage them
# in ./dist, ready to upload to a GitHub Release tag v<version>.
#
# Usage: ./scripts/release.ps1 [-Version 0.1.0]
param(
    [string]$Version = ""
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $Version) {
    $Version = (Get-Content npm/package.json -Raw | ConvertFrom-Json).version
}
Write-Host "building indotunnel v$Version"

$dist = Join-Path (Get-Location) "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$targets = @(
    @{ os = "windows"; arch = "amd64"; out = "indotunnel-windows-amd64.exe" },
    @{ os = "darwin";  arch = "amd64"; out = "indotunnel-darwin-amd64" },
    @{ os = "darwin";  arch = "arm64"; out = "indotunnel-darwin-arm64" },
    @{ os = "linux";   arch = "amd64"; out = "indotunnel-linux-amd64" },
    @{ os = "linux";   arch = "arm64"; out = "indotunnel-linux-arm64" }
)

foreach ($t in $targets) {
    $env:GOOS = $t.os
    $env:GOARCH = $t.arch
    $env:CGO_ENABLED = "0"
    $out = Join-Path $dist $t.out
    $ldflags = "-s -w -X main.version=$Version"
    Write-Host "  -> $($t.out)"
    go build -trimpath -ldflags $ldflags -o $out ./cmd/agent
    if ($LASTEXITCODE -ne 0) { throw "build failed for $($t.out)" }
}
Remove-Item Env:GOOS, Env:GOARCH, Env:CGO_ENABLED -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "artifacts in dist/:"
Get-ChildItem $dist | ForEach-Object { Write-Host "  $($_.Name)  ($([math]::Round($_.Length/1MB,1)) MB)" }
Write-Host ""
Write-Host "next: create the release and upload"
Write-Host "  git tag v$Version && git push origin v$Version"
Write-Host "  gh release create v$Version dist/* --title `"v$Version`" --notes `"...`""
Write-Host "then publish npm: (cd npm && npm publish)"
