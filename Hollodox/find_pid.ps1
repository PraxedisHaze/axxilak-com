# find_pid.ps1
# Dynamic PID finder for Hollodox
# Finds terminal windows by title pattern and returns PID

param (
    [string]$Pattern = "claude"
)

$procs = Get-Process | Where-Object { $_.MainWindowTitle -match $Pattern }
foreach ($p in $procs) {
    Write-Host "$($p.Id) | $($p.ProcessName) | $($p.MainWindowTitle)"
}
