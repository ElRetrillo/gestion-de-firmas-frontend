@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Instalador Agente Telemetria USB - Municipalidad de Coquimbo

:: ============================================================================
:: CONFIGURACION DEL AGENTE DE TELEMETRIA USB (SIN DEPENDENCIA DE NODE.JS)
:: Puede editar VM_BASE_URL aqui o pasarla como primer argumento al .bat:
::   Agente-Telemetria-USB-Coquimbo.bat "https://tokens.municoquimbo.cl" "Finanzas"
:: ============================================================================
set "VM_BASE_URL=https://TU-DOMINIO-O-IP-VM"
set "UNIDAD_MUNICIPAL=Red Interna Municipal"
set "TELEMETRIA_API_KEY="
set "ALLOW_SELF_SIGNED_TLS=0"
set "POLL_INTERVAL_SEC=4"
set "HEARTBEAT_INTERVAL_SEC=30"

if not "%~1"=="" set "VM_BASE_URL=%~1"
if not "%~2"=="" set "UNIDAD_MUNICIPAL=%~2"

echo ============================================================================
echo   Instalador Agente Silencioso de Telemetria USB (Windows Nativo)
echo   Ilustre Municipalidad de Coquimbo
echo ============================================================================
echo.

if /I "%VM_BASE_URL%"=="https://TU-DOMINIO-O-IP-VM" (
  echo [CONFIGURACION] Ingrese la URL base de su VM en GCP
  echo Ejemplo: https://tokens.municoquimbo.cl  o  https://34.xx.xx.xx
  set /p "VM_BASE_URL=URL de la VM: "
)

if "%VM_BASE_URL%"=="" (
  echo [ERROR] Debe indicar una URL valida para la VM.
  pause
  exit /b 1
)

set "INSTALL_DIR=%LOCALAPPDATA%\CoquimboGhostApp"
set "PS1_FILE=%INSTALL_DIR%\agente-telemetria-usb.ps1"
set "CFG_FILE=%INSTALL_DIR%\config.json"
set "VBS_FILE=%INSTALL_DIR%\lanzar-oculto.vbs"
set "LOG_FILE=%INSTALL_DIR%\agente.log"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [1/5] Extrayendo agente nativo y generando configuracion...
set "BAT_SELF=%~f0"

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$batPath = $env:BAT_SELF;" ^
  "$rawUrl = ($env:VM_BASE_URL).Trim().TrimEnd('/');" ^
  "if ($rawUrl -notmatch '^https?://') { $rawUrl = 'https://' + $rawUrl }" ^
  "if ($rawUrl -notmatch '/api/v1/telemetria/usb$') { $apiUrl = $rawUrl + '/api/v1/telemetria/usb' } else { $apiUrl = $rawUrl };" ^
  "$raw = [System.IO.File]::ReadAllText($batPath, [System.Text.Encoding]::UTF8);" ^
  "$marker = '# === ' + 'BEGIN_PS1_PAYLOAD ===';" ^
  "$idx = $raw.IndexOf($marker);" ^
  "if ($idx -lt 0) { throw 'No se encontro el bloque PowerShell embebido en el .bat.' };" ^
  "$psBody = $raw.Substring($idx);" ^
  "[System.IO.File]::WriteAllText($env:PS1_FILE, $psBody, (New-Object System.Text.UTF8Encoding($true)));" ^
  "$cfg = [ordered]@{" ^
  "  apiUrl = $apiUrl;" ^
  "  unidadMunicipal = $env:UNIDAD_MUNICIPAL;" ^
  "  apiKey = $env:TELEMETRIA_API_KEY;" ^
  "  allowSelfSignedTls = ($env:ALLOW_SELF_SIGNED_TLS -eq '1');" ^
  "  pollIntervalSec = [int]$env:POLL_INTERVAL_SEC;" ^
  "  heartbeatIntervalSec = [int]$env:HEARTBEAT_INTERVAL_SEC" ^
  "};" ^
  "$json = $cfg | ConvertTo-Json -Depth 4;" ^
  "[System.IO.File]::WriteAllText($env:CFG_FILE, $json, (New-Object System.Text.UTF8Encoding($false)));" ^
  "Write-Host ('      Endpoint configurado: ' + $apiUrl)"

if %errorlevel% neq 0 (
  echo [ERROR] No se pudo extraer el agente o guardar config.json.
  pause
  exit /b 1
)

echo [2/5] Creando lanzador silencioso en segundo plano...
(
  echo Set objShell = CreateObject^("WScript.Shell"^)
  echo strCmd = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File """ ^& "%PS1_FILE%" ^& """"
  echo objShell.Run strCmd, 0, False
) > "%VBS_FILE%"

echo [3/5] Registrando inicio automatico en Windows (HKCU Run, sin Admin)...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "CoquimboAgenteTelemetriaUSB" /t REG_SZ /d "wscript.exe \"%VBS_FILE%\"" /f >nul 2>&1
if %errorlevel% neq 0 (
  echo [AVISO] No se pudo registrar en HKCU Run. El agente igual funcionara en esta sesion.
) else (
  echo       Inicio automatico registrado correctamente.
)

echo [4/5] Deteniendo instancias previas e iniciando agente en segundo plano...
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ^
  "$procs = Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*agente-telemetria-usb.ps1*' };" ^
  "foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }"
wscript.exe "%VBS_FILE%"

echo [5/5] Ejecutando prueba de conectividad y deteccion de token USB...
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%PS1_FILE%" -TestOnly
set "TEST_EXIT=%errorlevel%"

echo.
echo ============================================================================
if %TEST_EXIT% equ 0 (
  echo   [OK] Agente instalado, en ejecucion y reportando a la VM.
) else (
  echo   [ATENCION] Agente instalado en segundo plano, pero la prueba inicial tuvo avisos.
  echo   Revise la URL de la VM, certificado HTTPS o conexion de red.
)
echo   Carpeta : %INSTALL_DIR%
echo   Log     : %LOG_FILE%
echo ============================================================================
echo.
pause
exit /b %TEST_EXIT%

# === BEGIN_PS1_PAYLOAD ===
param(
  [switch]$TestOnly
)

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $InstallDir 'config.json'
$LogPath    = Join-Path $InstallDir 'agente.log'

function Write-AgentLog {
  param(
    [string]$Level,
    [string]$Message
  )
  try {
    if (Test-Path $LogPath) {
      $info = Get-Item $LogPath -ErrorAction SilentlyContinue
      if ($info -and $info.Length -gt 1048576) {
        $bak = Join-Path $InstallDir 'agente.log.bak'
        if (Test-Path $bak) { Remove-Item $bak -Force -ErrorAction SilentlyContinue }
        Move-Item $LogPath $bak -Force -ErrorAction SilentlyContinue
      }
    }
    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogPath -Value $line -Encoding UTF8
  } catch {
  }
}

if (-not (Test-Path $ConfigPath)) {
  Write-AgentLog 'ERROR' "No se encontro config.json en $ConfigPath"
  if ($TestOnly) { Write-Host "[ERROR] Falta config.json"; exit 1 }
  exit 1
}

try {
  $Config = Get-Content -Path $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  Write-AgentLog 'ERROR' "Error leyendo config.json: $($_.Exception.Message)"
  if ($TestOnly) { Write-Host "[ERROR] config.json invalido"; exit 1 }
  exit 1
}

if ($Config.allowSelfSignedTls -eq $true) {
  try {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
  } catch {
  }
}

$ApiUrl = [string]$Config.apiUrl
$UnidadMunicipal = if ([string]::IsNullOrWhiteSpace($Config.unidadMunicipal)) { 'Red Interna Municipal' } else { [string]$Config.unidadMunicipal }
$ApiKey = [string]$Config.apiKey
$PollSec = if ($Config.pollIntervalSec -gt 0) { [int]$Config.pollIntervalSec } else { 4 }
$HeartbeatSec = if ($Config.heartbeatIntervalSec -gt 0) { [int]$Config.heartbeatIntervalSec } else { 30 }

function Get-LocalIPv4 {
  try {
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -ne '127.0.0.1' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.InterfaceOperationalStatus -eq 'Up'
      } |
      Select-Object -ExpandProperty IPAddress
    if ($ips) {
      return ($ips | Select-Object -First 1)
    }
  } catch {
  }
  try {
    $hostIps = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) |
      Where-Object {
        $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
        $_.IPAddressToString -ne '127.0.0.1' -and
        $_.IPAddressToString -notlike '169.254.*'
      }
    if ($hostIps) {
      return ($hostIps | Select-Object -First 1).IPAddressToString
    }
  } catch {
  }
  return '127.0.0.1'
}

function Parse-X509Subject {
  param([string]$Subject)
  $result = @{}
  if ([string]::IsNullOrWhiteSpace($Subject)) { return $result }

  $parts = New-Object System.Collections.Generic.List[string]
  $sb = New-Object System.Text.StringBuilder
  $inQuotes = $false
  for ($i = 0; $i -lt $Subject.Length; $i++) {
    $ch = $Subject[$i]
    if ($ch -eq '"') {
      $inQuotes = -not $inQuotes
      [void]$sb.Append($ch)
    } elseif ($ch -eq ',' -and -not $inQuotes) {
      $parts.Add($sb.ToString().Trim())
      [void]$sb.Clear()
    } else {
      [void]$sb.Append($ch)
    }
  }
  if ($sb.Length -gt 0) {
    $parts.Add($sb.ToString().Trim())
  }

  foreach ($p in $parts) {
    $eqIdx = $p.IndexOf('=')
    if ($eqIdx -gt 0) {
      $k = $p.Substring(0, $eqIdx).Trim().ToUpperInvariant()
      $v = $p.Substring($eqIdx + 1).Trim().Trim('"')
      if (-not $result.ContainsKey($k)) {
        $result[$k] = $v
      }
    }
  }
  return $result
}

function Get-TokenCertificateInfo {
  try {
    $certs = Get-ChildItem -Path 'Cert:\CurrentUser\My' -ErrorAction SilentlyContinue |
      Where-Object { $_.HasPrivateKey -eq $true }
    if (-not $certs) { return $null }

    $caRegex = 'E-?Sign|Acepta|E-?Cert(chile)?|Paperless|\bTOC\b|SafeNet|Thales|Gemalto|eToken|Feitian|ePass|YubiKey|Smart\s*Card|FirmaGob|Gobierno de Chile'
    $matched = $certs | Where-Object {
      ($_.Issuer -match $caRegex) -or
      ($_.Subject -match $caRegex) -or
      ($_.FriendlyName -match $caRegex)
    }

    if (-not $matched) { return $null }

    $now = Get-Date
    $valid = $matched | Where-Object { $_.NotAfter -gt $now } | Sort-Object -Property NotAfter -Descending
    $cert = if ($valid) { $valid | Select-Object -First 1 } else { ($matched | Sort-Object -Property NotAfter -Descending | Select-Object -First 1) }
    if (-not $cert) { return $null }

    $subjMap = Parse-X509Subject -Subject $cert.Subject
    $rut = $null
    if ($subjMap.ContainsKey('SERIALNUMBER') -and $subjMap['SERIALNUMBER'] -match '\d{6,9}-?[\dkK]') {
      $rut = $subjMap['SERIALNUMBER']
    } elseif ($cert.Subject -match '(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])') {
      $rut = $Matches[1]
    }

    return [ordered]@{
      titularNombre    = if ($subjMap.ContainsKey('CN')) { $subjMap['CN'] } else { $null }
      titularRut       = $rut
      titularEmail     = if ($subjMap.ContainsKey('E')) { $subjMap['E'] } elseif ($subjMap.ContainsKey('EMAILADDRESS')) { $subjMap['EMAILADDRESS'] } else { $null }
      titularCargo     = if ($subjMap.ContainsKey('T')) { $subjMap['T'] } elseif ($subjMap.ContainsKey('TITLE')) { $subjMap['TITLE'] } else { $null }
      titularUnidad    = if ($subjMap.ContainsKey('OU')) { $subjMap['OU'] } else { $null }
      certNotAfter     = $cert.NotAfter.ToUniversalTime().ToString('o')
      certSerialNumber = $cert.SerialNumber
      certThumbprint   = $cert.Thumbprint
    }
  } catch {
    Write-AgentLog 'WARN' "Error leyendo Cert:\CurrentUser\My: $($_.Exception.Message)"
    return $null
  }
}

function Get-ShortHash {
  param([string]$InputText)
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputText)
    $hashBytes = $sha1.ComputeHash($bytes)
    return ([BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 8)
  } finally {
    $sha1.Dispose()
  }
}

function Detect-CryptoUsbToken {
  $vidBrands = @{
    '0529' = 'SafeNet / Thales'
    '08E6' = 'Gemalto / Thales'
    '096E' = 'Feitian'
    '1050' = 'Yubico'
    '04E6' = 'SCM Microsystems'
    '0A89' = 'Athena'
  }

  $devices = $null
  try {
    $devices = Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction Stop |
      Where-Object {
        ($_.Status -eq 'OK' -or $_.ConfigManagerErrorCode -eq 0) -and
        $_.PNPDeviceID
      }
  } catch {
    try {
      $devices = Get-WmiObject -Class Win32_PnPEntity -ErrorAction SilentlyContinue |
        Where-Object {
          ($_.Status -eq 'OK' -or $_.ConfigManagerErrorCode -eq 0) -and
          $_.PNPDeviceID
        }
    } catch {
      Write-AgentLog 'WARN' "Error consultando Win32_PnPEntity: $($_.Exception.Message)"
      return $null
    }
  }

  if (-not $devices) { return $null }

  $vidRegex = 'VID_(0529|08E6|096E|1050|04E6|0A89)'
  $vidMatches = @()
  $classMatches = @()

  foreach ($d in $devices) {
    $pnpId = [string]$d.PNPDeviceID
    if ($pnpId -match $vidRegex) {
      $vidMatches += $d
    } elseif ($d.PNPClass -in @('SmartCardReader', 'SmartCard')) {
      $classMatches += $d
    }
  }

  $target = if ($vidMatches.Count -gt 0) {
    $vidMatches | Select-Object -First 1
  } elseif ($classMatches.Count -gt 0) {
    $classMatches | Select-Object -First 1
  } else {
    $null
  }

  if (-not $target) { return $null }

  $pnp = [string]$target.PNPDeviceID
  $vid = 'USB'
  $pidCode = 'TOKEN'
  if ($pnp -match 'VID_([0-9A-Fa-f]{4})') { $vid = $Matches[1].ToUpperInvariant() }
  if ($pnp -match 'PID_([0-9A-Fa-f]{4})') { $pidCode = $Matches[1].ToUpperInvariant() }

  $marca = if ($vidBrands.ContainsKey($vid)) {
    $vidBrands[$vid]
  } elseif (-not [string]::IsNullOrWhiteSpace($target.Manufacturer)) {
    [string]$target.Manufacturer
  } else {
    'Token Criptografico USB'
  }
  $modelo = if (-not [string]::IsNullOrWhiteSpace($target.Name)) { [string]$target.Name } else { 'Token USB' }

  $hwSerial = $null
  $segments = $pnp -split '\\'
  if ($segments.Count -ge 3) {
    $candidate = $segments[$segments.Count - 1]
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and $candidate -notmatch '&') {
      $clean = ($candidate -replace '[^A-Za-z0-9\-_]', '')
      if ($clean.Length -ge 4) { $hwSerial = $clean }
    }
  }

  return [ordered]@{
    pnpDeviceId = $pnp
    vendorId    = $vid
    productId   = $pidCode
    marca       = $marca
    modelo      = $modelo
    hwSerial    = $hwSerial
  }
}

function Build-TelemetryPayload {
  param(
    [string]$Estado,
    $DeviceInfo,
    $CertInfo,
    [string]$FallbackSerial
  )

  $serial = $null
  if ($DeviceInfo -and $DeviceInfo.hwSerial) {
    $serial = $DeviceInfo.hwSerial
  } elseif ($CertInfo -and $CertInfo.certSerialNumber) {
    $serial = [string]$CertInfo.certSerialNumber
  } elseif ($DeviceInfo) {
    $serial = "TOKEN-$($DeviceInfo.vendorId)-$($DeviceInfo.productId)-$(Get-ShortHash $DeviceInfo.pnpDeviceId)"
  } elseif ($FallbackSerial) {
    $serial = $FallbackSerial
  } else {
    $serial = "PC-$($env:COMPUTERNAME)"
  }

  $meta = [ordered]@{
    usuarioWindows = $env:USERNAME
    hostname       = $env:COMPUTERNAME
    origenAgente   = 'windows-ps-nativo'
  }
  if ($CertInfo) {
    if ($CertInfo.titularNombre)    { $meta['titularNombre']    = $CertInfo.titularNombre }
    if ($CertInfo.titularRut)       { $meta['titularRut']       = $CertInfo.titularRut }
    if ($CertInfo.titularEmail)     { $meta['titularEmail']     = $CertInfo.titularEmail }
    if ($CertInfo.titularCargo)     { $meta['titularCargo']     = $CertInfo.titularCargo }
    if ($CertInfo.titularUnidad)    { $meta['titularUnidad']    = $CertInfo.titularUnidad }
    if ($CertInfo.certNotAfter)     { $meta['certNotAfter']     = $CertInfo.certNotAfter }
    if ($CertInfo.certSerialNumber) { $meta['certSerialNumber'] = $CertInfo.certSerialNumber }
    if ($CertInfo.certThumbprint)   { $meta['certThumbprint']   = $CertInfo.certThumbprint }
  }

  $payload = [ordered]@{
    codigoPc          = $env:COMPUTERNAME
    ipAsignada        = Get-LocalIPv4
    dependenciaFisica = $UnidadMunicipal
    estadoHardware    = $Estado
    timestamp         = (Get-Date).ToUniversalTime().ToString('o')
    serialNumber      = $serial
    vendorId          = if ($DeviceInfo) { $DeviceInfo.vendorId } else { $null }
    marca             = if ($DeviceInfo) { $DeviceInfo.marca } else { $null }
    modelo            = if ($DeviceInfo) { $DeviceInfo.modelo } else { $null }
    metadatos         = $meta
  }
  return $payload
}

function Send-TelemetryEvent {
  param($Payload)
  try {
    $json = $Payload | ConvertTo-Json -Depth 6 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $headers = @{ 'Content-Type' = 'application/json; charset=utf-8' }
    if (-not [string]::IsNullOrWhiteSpace($ApiKey)) {
      $headers['x-api-key'] = $ApiKey
    }
    $null = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $headers -Body $bytes -TimeoutSec 12
    return $true
  } catch {
    Write-AgentLog 'ERROR' "Fallo POST $ApiUrl : $($_.Exception.Message)"
    if ($TestOnly) {
      Write-Host "[ERROR] Fallo envio a $ApiUrl : $($_.Exception.Message)" -ForegroundColor Red
    }
    return $false
  }
}

if ($TestOnly) {
  $dev = Detect-CryptoUsbToken
  $estado = if ($dev) { 'CONECTADO' } else { 'DESCONECTADO' }
  $cert = if ($dev) { Get-TokenCertificateInfo } else { $null }
  $payload = Build-TelemetryPayload -Estado $estado -DeviceInfo $dev -CertInfo $cert -FallbackSerial $null
  Write-Host ("      Estacion   : {0} ({1})" -f $payload.codigoPc, $payload.ipAsignada)
  Write-Host ("      Estado USB : {0} | Serial: {1}" -f $estado, $payload.serialNumber)
  if ($cert -and $cert.titularNombre) {
    Write-Host ("      Titular    : {0} ({1})" -f $cert.titularNombre, $cert.titularEmail)
  }
  $ok = Send-TelemetryEvent -Payload $payload
  if ($ok) {
    Write-AgentLog 'INFO' "Prueba inicial exitosa -> $estado ($($payload.serialNumber))"
    exit 0
  } else {
    exit 1
  }
}

Write-AgentLog 'INFO' "Agente iniciado. Estacion=$($env:COMPUTERNAME) URL=$ApiUrl Poll=${PollSec}s Heartbeat=${HeartbeatSec}s"

$lastState = $null
$lastSerial = $null
$lastTitular = $null
$lastDevice = $null
$lastCert = $null
$lastSendTime = [DateTime]::MinValue

while ($true) {
  try {
    $dev = Detect-CryptoUsbToken
    $estado = if ($dev) { 'CONECTADO' } else { 'DESCONECTADO' }
    $cert = $null

    if ($estado -eq 'CONECTADO') {
      if ($lastState -ne 'CONECTADO') {
        Start-Sleep -Milliseconds 900
      }
      $cert = Get-TokenCertificateInfo
      $payload = Build-TelemetryPayload -Estado 'CONECTADO' -DeviceInfo $dev -CertInfo $cert -FallbackSerial $lastSerial
      $curSerial = [string]$payload.serialNumber
      $curTitular = if ($cert -and $cert.titularNombre) { [string]$cert.titularNombre } else { '' }
      $elapsed = ([DateTime]::UtcNow - $lastSendTime).TotalSeconds

      if (($lastState -ne 'CONECTADO') -or ($curSerial -ne $lastSerial) -or ($curTitular -and $curTitular -ne $lastTitular) -or ($elapsed -ge $HeartbeatSec)) {
        if (Send-TelemetryEvent -Payload $payload) {
          if (($lastState -ne 'CONECTADO') -or ($curSerial -ne $lastSerial) -or ($curTitular -ne $lastTitular)) {
            Write-AgentLog 'INFO' "CONECTADO serial=$curSerial titular='$curTitular'"
          }
          $lastState = 'CONECTADO'
          $lastSerial = $curSerial
          $lastTitular = $curTitular
          $lastDevice = $dev
          $lastCert = $cert
          $lastSendTime = [DateTime]::UtcNow
        }
      }
    } else {
      if ($lastState -ne 'DESCONECTADO') {
        $payload = Build-TelemetryPayload -Estado 'DESCONECTADO' -DeviceInfo $lastDevice -CertInfo $lastCert -FallbackSerial $lastSerial
        if (Send-TelemetryEvent -Payload $payload) {
          Write-AgentLog 'INFO' "DESCONECTADO serial=$($payload.serialNumber)"
          $lastState = 'DESCONECTADO'
          $lastSendTime = [DateTime]::UtcNow
        }
      }
    }
  } catch {
    Write-AgentLog 'ERROR' "Excepcion en ciclo principal: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $PollSec
}
