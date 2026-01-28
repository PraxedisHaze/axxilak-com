# github_bridge.ps1
# Synchronizes the Parliament Log using the GitHub CLI (gh) for auth.

$repoPath = "C:\Users\phaze\games_n_apps\Parliament"
$interval = 60

Write-Host "🌐 GitHub Bridge Active (GH-Auth)." -ForegroundColor Cyan

while ($true) {
    try {
        Set-Location $repoPath
        
        # Pull changes using git (gh auth helper should handle creds)
        $output = git pull --rebase 2>&1
        
        if ($output -match "Fast-forward" -or $output -match "Updating") {
            Write-Host "📥 Incoming Transmission from the Bridge!" -ForegroundColor Green
        }
        
        # Check for local changes
        if ((git status --porcelain)) {
            git add .
            git commit -m "Auto-sync from Sanctuary"
            
            # Push using git (gh handles auth)
            git push
            Write-Host "📤 Outgoing Transmission sent." -ForegroundColor Yellow
        }
    } catch {
        Write-Warning "Sync Error: $_"
    }
    
    Start-Sleep -Seconds $interval
}
