$ErrorActionPreference = "Stop"

$mysqlServer = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
$stateRoot = Join-Path $env:LOCALAPPDATA "SuzukiAutoSilang\mysql"
$dataRoot = Join-Path $stateRoot "data"
$configPath = Join-Path $stateRoot "my.ini"

if (!(Test-Path $mysqlServer) -or !(Test-Path $configPath) -or !(Test-Path (Join-Path $dataRoot "auto.cnf"))) {
  throw "Run npm run db:local:setup first to initialize the local MySQL database."
}

$client = New-Object System.Net.Sockets.TcpClient
try {
  $client.Connect("127.0.0.1", 3306)
  Write-Output "A MySQL server is already accepting connections on 127.0.0.1:3306."
  exit 0
} catch [System.Net.Sockets.SocketException] {
  $client.Dispose()
}

$server = Start-Process -FilePath $mysqlServer -ArgumentList @("--defaults-file=`"$configPath`"", "--console") -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if ($server.HasExited) {
    throw "MySQL stopped during startup. Check the MySQL error log under $stateRoot."
  }
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect("127.0.0.1", 3306)
    Write-Output "MySQL is ready on 127.0.0.1:3306 (process ID $($server.Id))."
    exit 0
  } catch [System.Net.Sockets.SocketException] {
    Start-Sleep -Seconds 1
  } finally {
    $client.Dispose()
  }
}

throw "MySQL did not become ready. Check the MySQL error log under $stateRoot."
