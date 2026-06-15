param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[^/]+/[^/]+$')]
  [string]$Repository
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'release-config.json'
$resourcesPath = Join-Path $root 'resources.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$config = [System.IO.File]::ReadAllText($configPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$oldRepository = [string]$config.repository
$config.repository = $Repository
$configJson = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configPath, $configJson + [Environment]::NewLine, $utf8NoBom)

$resources = [System.IO.File]::ReadAllText($resourcesPath, [System.Text.Encoding]::UTF8)
$resources = $resources.Replace($oldRepository, $Repository).Replace('__GITHUB_REPOSITORY__', $Repository)
[System.IO.File]::WriteAllText($resourcesPath, $resources, $utf8NoBom)

Write-Host "Configured repository: $Repository"
Write-Host "Catalog URL: https://github.com/$Repository/releases/latest/download/resources.json"
