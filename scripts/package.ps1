# Authored packaging helper. Apache-2.0. No installation or publication actions.
param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'dist' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$outputRoot = (Resolve-Path -LiteralPath $OutputDirectory).Path
& node --check (Join-Path $projectRoot 'bundle.js')
if ($LASTEXITCODE -ne 0) { throw 'Module syntax check failed' }
& node (Join-Path $projectRoot 'tests\regression.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Regression tests failed' }
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'module.json') -Raw | ConvertFrom-Json
if ($manifest.id -ne 'pf2e-flatten') { throw 'Unexpected module ID' }
$packageRoot = Join-Path $outputRoot ('package-' + [Guid]::NewGuid().ToString('N'))
$moduleRoot = Join-Path $packageRoot 'pf2e-flatten'
New-Item -ItemType Directory -Path (Join-Path $moduleRoot 'lang') -Force | Out-Null
$files = @('bundle.js','module.json','LICENSE','NOTICE','README.md','CHANGELOG.md','lang/en.json')
foreach ($relative in $files) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination (Join-Path $moduleRoot $relative)
}
$zipPath = Join-Path $outputRoot ('pf2e-flatten-' + $manifest.version + '.zip')
Compress-Archive -LiteralPath $moduleRoot -DestinationPath $zipPath -Force
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256 | Select-Object Hash
Get-Item -LiteralPath $zipPath | Select-Object Name,Length
