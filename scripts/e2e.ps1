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
    if (-not ($body -match "local-ok")) { Write-Host "E2E FAILED: $body"; exit 1 }

    # Dashboard auth path: give the seeded user a password, log in, then list
    # tunnels with the session cookie (the agent's tunnel belongs to the seed user).
    $env:DATABASE_URL = "postgres://indotunnel:indotunnel@localhost:55432/indotunnel?sslmode=disable"
    $env:EMAIL = "dev@indotunnel.id"
    $env:PASSWORD = "e2e-password-123"
    go run ./cmd/setpassword | Out-Null

    $bodyFile = Join-Path $env:TEMP "e2e-login.json"
    [System.IO.File]::WriteAllText($bodyFile, (@{ email = $env:EMAIL; password = $env:PASSWORD } | ConvertTo-Json -Compress))
    $login = (curl.exe -s -i -X POST "$api/v1/auth/login" `
        -H "Origin: http://localhost:3000" `
        -H "Content-Type: application/json" `
        --data-binary "@$bodyFile") -join "`n"
    if ($login -notmatch "HTTP/1.1 200") { Write-Host "E2E FAILED: login"; Write-Host $login; exit 1 }
    $cookie = ($login -split "`n" | Select-String -Pattern "Set-Cookie: (indotunnel_session=[^;]+)" |
        Select-Object -First 1).Matches.Groups[1].Value
    if (-not $cookie) { Write-Host "E2E FAILED: no session cookie"; exit 1 }

    $tunnels = curl.exe -s "$api/v1/tunnels" -H "Cookie: $cookie"
    if ($tunnels -notmatch [regex]::Escape($hostName)) {
        Write-Host "E2E FAILED: tunnel not in dashboard list"; Write-Host $tunnels; exit 1
    }

    # Dashboard HTML reachable and renders the shell.
    $dash = curl.exe -s "http://localhost:3000/login"
    if ($dash -notmatch "IndoTunnel") { Write-Host "E2E FAILED: dashboard not reachable"; exit 1 }

    # Browser path: login through the dashboard's /api rewrite, then use the
    # returned cookie to call a session endpoint. Proves the container's
    # Next -> Go rewrite targets the right API base.
    $proxyLogin = (curl.exe -s -i -X POST "http://localhost:3000/api/auth/login" `
        -H "Origin: http://localhost:3000" `
        -H "Content-Type: application/json" `
        --data-binary "@$bodyFile") -join "`n"
    if ($proxyLogin -notmatch "HTTP/1.1 200") {
        Write-Host "E2E FAILED: dashboard /api login"; Write-Host $proxyLogin; exit 1
    }
    $proxyCookie = ($proxyLogin -split "`n" | Select-String -Pattern "Set-Cookie: (indotunnel_session=[^;]+)" |
        Select-Object -First 1).Matches.Groups[1].Value
    $proxyTunnels = curl.exe -s "http://localhost:3000/api/tunnels" -H "Cookie: $proxyCookie"
    if ($proxyTunnels -notmatch [regex]::Escape($hostName)) {
        Write-Host "E2E FAILED: dashboard /api tunnels"; Write-Host $proxyTunnels; exit 1
    }

    Write-Host "E2E OK"
}
finally {
    Stop-Process -Id $agent.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
