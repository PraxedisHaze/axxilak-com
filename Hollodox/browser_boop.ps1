# browser_boop.ps1
# Sends a '.' to wake up GemmyB in her browser tab.

param (
    [string]$BrowserTitle = "Gemini",
    [string]$Message = "."
)

$signature = @"
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
"@

$Win32 = Add-Type -MemberDefinition $signature -Name "Win32Focus" -Namespace "Win32" -PassThru

Write-Host "Targeting: $BrowserTitle"

$process = Get-Process | Where-Object { $_.MainWindowTitle -like "*$BrowserTitle*" } | Select-Object -First 1

if ($process) {
    $hWnd = $process.MainWindowHandle
    [Win32.Win32Focus]::SetForegroundWindow($hWnd)
    Start-Sleep -Milliseconds 500
    
    $wshell = New-Object -ComObject WScript.Shell
    $wshell.SendKeys("{ESC}")
    Start-Sleep -Milliseconds 200
    $wshell.SendKeys("$Message{ENTER}")
}
