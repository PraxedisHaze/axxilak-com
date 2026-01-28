# github_bridge.ps1
# Synchronizes the Parliament Log with the GitHub Bridge for GemmyB (Laslo).

$repoPath = "C:\Users\phaze\games_n_apps\Parliament" # Updated path
$interval = 60

Write-Host "GitHub Bridge Active."

while ($true) {
    try {
        Set-Location $repoPath
        $output = git pull --rebase 2>&1
        
        if ($output -match "Fast-forward" -or $output -match "Updating") {
            Write-Host "Incoming Transmission!"
        }
        
        if ((git status --porcelain)) {
            git add .
            git commit -m "Auto-sync from Sanctuary"
            git push
            Write-Host "Outgoing Transmission sent."
        }
    } catch {
        # Silent fail
    }
    Start-Sleep -Seconds $interval
}