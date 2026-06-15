$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -Raw -LiteralPath (Join-Path $root 'release-config.json') | ConvertFrom-Json
$localGh = Join-Path $root 'tools\gh\bin\gh.exe'
$gh = if (Test-Path -LiteralPath $localGh) { $localGh } else { 'gh' }

function Invoke-GhProbe {
  param([string[]]$Arguments)
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $gh @Arguments *> $null
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
}

if ([string]$config.repository -eq '__GITHUB_REPOSITORY__') {
  throw 'Run configure-repository.ps1 first.'
}

if (($gh -eq 'gh') -and (-not (Get-Command gh -ErrorAction SilentlyContinue))) {
  Write-Host 'GitHub CLI is missing. Installing it with winget...'
  winget install --id GitHub.cli --exact --accept-package-agreements --accept-source-agreements
  $env:Path += ';C:\Program Files\GitHub CLI'
}

$authStatus = Invoke-GhProbe @('auth', 'status')
if ($authStatus -ne 0) {
  Write-Host 'Please complete GitHub login in the browser.'
  & $gh auth login --web --git-protocol https
}

$repoStatus = Invoke-GhProbe @('repo', 'view', [string]$config.repository)
if ($repoStatus -ne 0) {
  Write-Host "Creating public repository $($config.repository)..."
  & $gh repo create $config.repository --public --description 'Japanecho downloadable language-learning resource packs'
}

$repoUrl = "https://github.com/$($config.repository).git"
if (-not (Test-Path (Join-Path $root '.git'))) {
  git -C $root init
  git -C $root branch -M main
}

$remoteNames = @(git -C $root remote)
if ($remoteNames -notcontains 'origin') {
  git -C $root remote add origin $repoUrl
} else {
  $remote = git -C $root remote get-url origin
}
if (($remoteNames -contains 'origin') -and ($remote -ne $repoUrl)) {
  git -C $root remote set-url origin $repoUrl
}

git -C $root add README.md .gitignore release-config.json resources.json packs scripts .github
git -C $root diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git -C $root commit -m "publish Japanecho resource packs"
}
git -C $root push -u origin main

$assets = @((Join-Path $root 'resources.json'))
$assets += Get-ChildItem -LiteralPath (Join-Path $root 'packs') -Filter '*.jepack' | ForEach-Object FullName

$releaseStatus = Invoke-GhProbe @('release', 'view', [string]$config.releaseTag, '--repo', [string]$config.repository)
if ($releaseStatus -eq 0) {
  & $gh release upload $config.releaseTag @assets --repo $config.repository --clobber
} else {
  & $gh release create $config.releaseTag @assets --repo $config.repository --title $config.releaseTitle --notes 'Japanecho downloadable resource packs.'
}

Write-Host "Published: https://github.com/$($config.repository)/releases/tag/$($config.releaseTag)"
Write-Host "Catalog: https://github.com/$($config.repository)/releases/latest/download/resources.json"
