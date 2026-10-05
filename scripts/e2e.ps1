#!/usr/bin/env pwsh
# End-to-end on Windows: assumes `docker compose up -d --build` is running.
# Starts a local backend, runs the agent, curls the public URL.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$api = if ($env:INDOTUNNEL_API) { $env:INDOTUNNEL_API } else { "http://localhost:8081" }
$tunnel = if ($env:INDOTUNNEL_TUNNEL) { $env:INDOTUNNEL_TUNNEL } else { "localhost:7000" }
$port = if ($env:LOCAL_PORT) { $env:LOCAL_PORT } else { 3999 }

$token = (go run ./cmd/seed).Trim()
Write-Host "seeded token"

# Build binaries once so Start-Process does not leave orphaned `go run` children
# holding the output pipe (which makes this script hang on exit).
$bin = Join-Path $env:TEMP "indotunnel-e2e"
New-Item -ItemType Directory -Force -Path $bin | Out-Null
go build -o (Join-Path $bin "agent.exe") ./cmd/agent
go build -o (Join-Path $bin "testbackend.exe") ./cmd/testbackend

$backend = Start-Process (Join-Path $bin "testbackend.exe") -PassThru -NoNewWindow
Start-Sleep -Seconds 2

$env:INDOTUNNEL_TOKEN = $token
$env:INDOTUNNEL_API = $api
$env:INDOTUNNEL_TUNNEL = $tunnel
$agent = Start-Process (Join-Path $bin "agent.exe") -ArgumentList "$port" -PassThru -NoNewWindow `
  -RedirectStandardOutput "$env:TEMP\e2e-agent.out" -RedirectStandardError "$env:TEMP\e2e-agent.err"

try {
    for ($i = 0; $i -lt 30; $i++) {
        if (Select-String -Path "$env:TEMP\e2e-agent.out" -Pattern "Public:" -Quiet) { break }
        Start-Sleep -Seconds 1
    }
    $line = (Select-String -Path "$env:TEMP\e2e-agent.out" -Pattern "Public:" | Select-Object -First 1).Line
    $url = ($line -replace '.*(https?://\S+).*', '$1')
    $hostName = ($url -replace 'https?://', '' -replace ':.*$', '')
    Write-Host "public: $url"
    $body = curl.exe -s --resolve "${hostName}:8080:127.0.0.1" "$url/"
    if ($body -match "local-ok") { Write-Host "E2E OK" } else { Write-Host "E2E FAILED: $body"; exit 1 }
}
finally {
    Stop-Process -Id $agent.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
