$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4"
$mysqlServer = Join-Path $mysqlHome "bin\mysqld.exe"
$stateRoot = Join-Path $env:LOCALAPPDATA "SuzukiAutoSilang\mysql"
$dataRoot = Join-Path $stateRoot "data"
$configPath = Join-Path $stateRoot "my.ini"
$envPath = Join-Path $projectRoot ".env"

if (!(Test-Path $mysqlServer)) {
  throw "MySQL Server is not installed at the expected location."
}
if (Test-Path $envPath) {
  throw "A .env file already exists. Setup will not overwrite local configuration."
}
$dataInitialized = Test-Path (Join-Path $dataRoot "auto.cnf")

$portProbe = New-Object System.Net.Sockets.TcpClient
$portBusy = $false
try {
  $portProbe.Connect("127.0.0.1", 3306)
  $portBusy = $true
} catch [System.Net.Sockets.SocketException] {
} finally {
  $portProbe.Dispose()
}
if ($portBusy) {
  throw "Port 3306 is already in use. Stop that MySQL server before setting up this local instance."
}

New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
$config = @"
[mysqld]
basedir="$($mysqlHome.Replace('\', '/'))"
datadir="$($dataRoot.Replace('\', '/'))"
port=3306
bind-address=127.0.0.1
mysqlx=0
"@
[System.IO.File]::WriteAllText($configPath, $config, [System.Text.UTF8Encoding]::new($false))

if (!$dataInitialized) {
  $initOutput = Join-Path $stateRoot "initialize.out.log"
  $initError = Join-Path $stateRoot "initialize.err.log"
  $initializer = Start-Process -FilePath $mysqlServer -ArgumentList @("--defaults-file=$configPath", "--initialize-insecure", "--console") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $initOutput -RedirectStandardError $initError
  if ($initializer.ExitCode -ne 0) {
    throw "MySQL data directory initialization failed. Review the initialization logs under $stateRoot."
  }
  Remove-Item -LiteralPath $initOutput, $initError -ErrorAction SilentlyContinue
}

$server = Start-Process -FilePath $mysqlServer -ArgumentList @("--defaults-file=`"$configPath`"", "--console") -WindowStyle Hidden -PassThru
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if ($server.HasExited) {
    throw "MySQL stopped during startup. Check the MySQL error log under $stateRoot."
  }
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect("127.0.0.1", 3306)
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 1
  } finally {
    $client.Dispose()
  }
}
if (!$ready) {
  throw "MySQL did not become ready. Check the MySQL error log under $stateRoot."
}

& node (Join-Path $PSScriptRoot "configure-local-mysql.js")
if ($LASTEXITCODE -ne 0) {
  throw "Local MySQL configuration failed. Check the MySQL error log under $stateRoot."
}

Write-Output "Local MySQL is running on 127.0.0.1:3306. Its data and root credential are stored under $stateRoot."
