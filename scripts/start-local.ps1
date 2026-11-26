$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mysqlScript = Join-Path $PSScriptRoot "start-local-mysql.ps1"

& powershell -NoProfile -ExecutionPolicy Bypass -File $mysqlScript
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Push-Location $projectRoot
try {
  & node server.js
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
