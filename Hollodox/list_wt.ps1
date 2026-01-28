# List all Windows Terminal windows
Get-Process WindowsTerminal -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "$($_.Id) | $($_.ProcessName) | $($_.MainWindowTitle)"
}
