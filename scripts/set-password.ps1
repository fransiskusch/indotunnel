#!/usr/bin/env pwsh
# Set a user's password from the command line:
#   EMAIL=you@example.com PASSWORD=secret ./scripts/set-password.ps1
# Or pass them as arguments: ./scripts/set-password.ps1 you@example.com secret
param(
    [Parameter(Position = 0)][string]$Email = $env:EMAIL,
    [Parameter(Position = 1)][string]$Password = $env:PASSWORD
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $Email -or -not $Password) {
    Write-Error "usage: set-password.ps1 <email> <password> (or set EMAIL/PASSWORD env)"
    exit 2
}

$env:EMAIL = $Email
$env:PASSWORD = $Password
go run ./cmd/setpassword
