$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodePath = $nodeCommand.Source }
else { $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22.12+ is required.' }
Push-Location $projectPath
try {
    & $nodePath 'node_modules\typescript\bin\tsc' '-b'
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed.' }
    & $nodePath 'node_modules\vite\bin\vite.js' 'build'
    if ($LASTEXITCODE -ne 0) { throw 'Vite build failed.' }
    Write-Host 'Build complete. Refresh http://127.0.0.1:5173 to see your changes.'
} finally { Pop-Location }
