param(
  [string]$DatabaseHost = '127.0.0.1',
  [int]$Port = 54322,
  [switch]$ConfirmDisposableLocalDatabase
)

$parsedAddress = $null
if (-not [System.Net.IPAddress]::TryParse($DatabaseHost, [ref]$parsedAddress) -or
    -not [System.Net.IPAddress]::IsLoopback($parsedAddress)) {
  throw 'Security SQL tests require a literal loopback IP address; hostnames and remote hosts are rejected.'
}

if (-not $ConfirmDisposableLocalDatabase) {
  throw 'Confirm that this is a disposable local test database by passing -ConfirmDisposableLocalDatabase.'
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  throw 'psql is required to run the security SQL tests.'
}

# Do not allow libpq service files or host-address overrides to redirect a loopback test.
Remove-Item Env:PGHOSTADDR -ErrorAction SilentlyContinue
Remove-Item Env:PGSERVICE -ErrorAction SilentlyContinue
Remove-Item Env:PGSERVICEFILE -ErrorAction SilentlyContinue

$repoRoot = Split-Path -Parent $PSScriptRoot
$testFiles = @(
  'supabase\tests\events_rls.sql',
  'supabase\tests\integration_jobs_rpc_acl.sql',
  'supabase\tests\event_flyers_storage_rls.sql'
)

foreach ($relativePath in $testFiles) {
  $testPath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $testPath)) {
    throw "Security SQL test file is missing: $relativePath"
  }

  Write-Output "Running $relativePath"
  & $psql.Source -X -h $DatabaseHost -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 -f $testPath
  if ($LASTEXITCODE -ne 0) {
    throw "Security SQL test failed: $relativePath (psql exit code $LASTEXITCODE)"
  }
}

Write-Output 'All security SQL tests passed.'
