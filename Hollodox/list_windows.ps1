Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object {
    Write-Host "$($_.Id): $($_.MainWindowTitle)"
}
