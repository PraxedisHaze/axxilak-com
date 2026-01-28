# hollodox_watcher.ps1
# The event-driven Watcher for Hollodox.
# Uses a temporary file buffer to avoid shell-escaping errors.

$logPath = "C:\Users\phaze\games_n_apps\Shared\ETERNAL_CONVERSATION.jsonl"
$bufferPath = "C:\Users\phaze\games_n_apps\Hollodox\last_signal.tmp"
$enginePath = "C:\Users\phaze\games_n_apps\Hollodox\hollodox_engine.py"

# Set Window Title
$host.UI.RawUI.WindowTitle = "HOLLODOX_HEARTBEAT"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "C:\Users\phaze\games_n_apps\Shared"
$watcher.Filter = "ETERNAL_CONVERSATION.jsonl"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite

$action = {
    $path = $Event.SourceEventArgs.FullPath
    Write-Host "Signal detected in Campfire"
    Start-Sleep -Milliseconds 300
    # Retry Loop for File Access
    $maxRetries = 5
    $retryCount = 0
    $readSuccess = $false

    while (-not $readSuccess -and $retryCount -lt $maxRetries) {
        try {
            $lastLine = Get-Content $path -Tail 1 -ErrorAction Stop
            $readSuccess = $true
            if ($lastLine) {
                $lastLine | Set-Content $bufferPath
                python $enginePath --file $bufferPath
            }
        } catch {
            $retryCount++
            Start-Sleep -Milliseconds 200
        }
    }
    
    if (-not $readSuccess) {
        Write-Warning "Could not read log file after $maxRetries retries."
    }
}

$handler = Register-ObjectEvent $watcher "Changed" -Action $action

Write-Host "Hollodox Watcher Active."

# --- STARTUP HANDSHAKE ---
# Signal the brain that we are online immediately
$startupMsg = @{
    author = "Hollodox-Watcher"
    content = "Watcher Online"
    context_tags = @("#hollodox.online")
} | ConvertTo-Json -Compress
$startupMsg | Set-Content $bufferPath
python $enginePath --file $bufferPath

while ($true) { Start-Sleep 5 }
