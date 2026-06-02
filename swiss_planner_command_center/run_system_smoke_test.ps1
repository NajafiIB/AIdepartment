param(
  [string]$BaseUrl = "http://127.0.0.1:8765"
)

$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )
  $script:results.Add([pscustomobject]@{
    Name = $Name
    Status = $Status
    Detail = $Detail
  }) | Out-Null
}

function Short-Text {
  param([string]$Text, [int]$Length = 260)
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $clean = ($Text -replace "\s+", " ").Trim()
  if ($clean.Length -le $Length) { return $clean }
  return $clean.Substring(0, $Length) + "..."
}

function Read-ErrorBody {
  param($ErrorRecord)
  try {
    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) { return "" }
    $stream = $response.GetResponseStream()
    if ($null -eq $stream) { return "" }
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return ""
  }
}

function Invoke-SmokeGet {
  param([string]$Name, [string]$Path, [int]$TimeoutSec = 30, [string[]]$ExpectedStatuses = @("PASS"))
  try {
    $response = Invoke-WebRequest -Uri "$BaseUrl$Path" -UseBasicParsing -TimeoutSec $TimeoutSec
    Add-Result $Name "PASS" "HTTP $($response.StatusCode): $(Short-Text $response.Content)"
    return $response.Content
  } catch {
    $code = ""
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $body = Read-ErrorBody $_
    Add-Result $Name "FAIL" "$(if ($code) { "HTTP $code. " })$($_.Exception.Message) $(Short-Text $body)"
    return $null
  }
}

function Invoke-SmokePost {
  param(
    [string]$Name,
    [string]$Path,
    [hashtable]$BodyObj,
    [int]$TimeoutSec = 90,
    [int[]]$ExpectedErrorCodes = @()
  )
  $jsonBody = $BodyObj | ConvertTo-Json -Compress -Depth 20
  try {
    $response = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method POST -ContentType "application/json" -Body $jsonBody -UseBasicParsing -TimeoutSec $TimeoutSec
    Add-Result $Name "PASS" "HTTP $($response.StatusCode): $(Short-Text $response.Content)"
    return $response.Content
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $errorBody = Read-ErrorBody $_
    if ($ExpectedErrorCodes -contains $code) {
      Add-Result $Name "PASS" "Expected guardrail HTTP ${code}: $(Short-Text $errorBody)"
    } else {
      Add-Result $Name "FAIL" "$(if ($code) { "HTTP $code. " })$($_.Exception.Message) $(Short-Text $errorBody)"
    }
    return $null
  }
}

Write-Host ""
Write-Host "Swiss Planner Command Center smoke test"
Write-Host "Base URL: $BaseUrl"
Write-Host "No professor/university email will be sent by this test."
Write-Host ""

$localStatus = Invoke-SmokeGet "Local server and local DB status" "/api/local-status" 20
$dashboard = Invoke-SmokeGet "Dashboard snapshot" "/api/dashboard?limit=10&runAudit=false" 40
$sync = Invoke-SmokePost "Sheet sync without audit" "/api/sync-now" @{ runAudit = $false } 120
$runOne = Invoke-SmokePost "Task runner safe single-cycle" "/api/run-one" @{ maxItems = 1 } 120
$emailSafety = Invoke-SmokePost "Email content safety check" "/api/action" @{ action = "validateEmailContentSafety"; payload = @{} } 120
$queueGuard = Invoke-SmokePost "Queue send guardrail blocks missing queueId" "/api/action" @{ action = "processQueueRow"; payload = @{} } 30 @(400)
$broadQueueGuard = Invoke-SmokePost "Broad processQueue is blocked locally" "/api/action" @{ action = "processQueue"; payload = @{} } 30 @(400)

try {
  $autopilot = Invoke-WebRequest -Uri "$BaseUrl/api/autopilot-status" -UseBasicParsing -TimeoutSec 20
  Add-Result "Daily Autopilot endpoint" "PASS" "HTTP $($autopilot.StatusCode): $(Short-Text $autopilot.Content)"
} catch {
  $code = 0
  try { $code = [int]$_.Exception.Response.StatusCode } catch {}
  if ($code -eq 404) {
    Add-Result "Daily Autopilot endpoint" "WARN" "Endpoint is missing in the currently running server. Close and reopen Command Center to load the newer server; Run Cycle uses compatibility mode meanwhile."
  } else {
    $body = Read-ErrorBody $_
    Add-Result "Daily Autopilot endpoint" "FAIL" "$(if ($code) { "HTTP $code. " })$($_.Exception.Message) $(Short-Text $body)"
  }
}

$indexPath = Join-Path $PSScriptRoot "index.html"
$appPath = Join-Path $PSScriptRoot "app.js"
if ((Test-Path $indexPath) -and ((Get-Content $indexPath -Raw) -match "app\.js\?v=20260530-run-cycle-fix")) {
  Add-Result "Browser cache-busting script tag" "PASS" "index.html points to the fixed app.js version."
} else {
  Add-Result "Browser cache-busting script tag" "FAIL" "index.html does not point to the fixed app.js version."
}
if ((Test-Path $appPath) -and ((Get-Content $appPath -Raw) -match "runLegacyCycleFallback") -and ((Get-Content $appPath -Raw) -match "data-command")) {
  Add-Result "Run Cycle compatibility code" "PASS" "app.js contains fallback runner and robust command handler."
} else {
  Add-Result "Run Cycle compatibility code" "FAIL" "app.js is missing fallback runner or command handler."
}

Write-Host ""
Write-Host "Results"
Write-Host "-------"
foreach ($item in $results) {
  $color = "Green"
  if ($item.Status -eq "WARN") { $color = "Yellow" }
  if ($item.Status -eq "FAIL") { $color = "Red" }
  Write-Host ("[{0}] {1}" -f $item.Status, $item.Name) -ForegroundColor $color
  Write-Host ("      {0}" -f $item.Detail)
}

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
$warned = @($results | Where-Object { $_.Status -eq "WARN" })

Write-Host ""
if ($failed.Count -eq 0) {
  if ($warned.Count -eq 0) {
    Write-Host "SMOKE TEST PASSED: all checked operations are working." -ForegroundColor Green
  } else {
    Write-Host "SMOKE TEST PASSED WITH WARNINGS: core operations work, but review the warning(s)." -ForegroundColor Yellow
  }
  exit 0
}

Write-Host "SMOKE TEST FAILED: $($failed.Count) operation(s) need attention." -ForegroundColor Red
exit 1
