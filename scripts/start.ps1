$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port"
$existing = $false
try { $health = Invoke-RestMethod -Uri "$url/__fileo_health" -TimeoutSec 2; $existing = $health.app -eq 'fileo-prototype' } catch {}
if (-not $existing) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
    else { $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js is required. Install Node.js 22.12+ and run this launcher again.' }
    $serverPath = Join-Path $projectPath 'scripts\serve.mjs'
    Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $projectPath -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 200
        try { $health = Invoke-RestMethod -Uri "$url/__fileo_health" -TimeoutSec 1; if ($health.app -eq 'fileo-prototype') { $ready = $true; break } } catch {}
    }
    if (-not $ready) { throw 'Could not start Fileo. Port 5173 may be occupied by another application.' }
}
Start-Process $url
