# silent_hand.ps1
# Native PowerShell injection for Project Hollodox.
# v3.1 - GRANITE: Process-name targeting with Codex safeguards
#
# Safeguards implemented:
# 1. Multiple matches: honor ACTIVE_PID.txt override, else most recent visible
# 2. Strict match: command line must contain CLI keyword AND be terminal host
# 3. Skip minimized: filter out minimized windows
# 4. Fallback: title-pattern matching when command line unavailable
# 5. Audit: log PID + title + method to HOLLODOX_AUDIT.log

param (
    [string]$Target = "Claude",
    [string]$Message = "continue"
)

$HOLLODOX_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$AUDIT_LOG = Join-Path $HOLLODOX_DIR "HOLLODOX_AUDIT.log"
$ACTIVE_PID_FILE = Join-Path $HOLLODOX_DIR "ACTIVE_PID.txt"

function Write-Audit {
    param([string]$Entry)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Entry"
    Write-Host $line
    Add-Content -Path $AUDIT_LOG -Value $line -ErrorAction SilentlyContinue
}

# Define the C# helper only if it doesn't already exist in this session
if (-not ([System.Management.Automation.PSTypeName]'Win32Inject').Type) {
    Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Collections.Generic;

        public class Win32Inject {
            [DllImport("user32.dll")]
            public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            [DllImport("user32.dll")]
            public static extern IntPtr PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hWnd);

            public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

            public static List<IntPtr> FindVisibleNonMinimizedWindowsForPID(uint pid) {
                List<IntPtr> windows = new List<IntPtr>();
                EnumWindows((hWnd, lParam) => {
                    uint windowPid;
                    GetWindowThreadProcessId(hWnd, out windowPid);
                    if (windowPid == pid && IsWindowVisible(hWnd) && !IsIconic(hWnd)) {
                        windows.Add(hWnd);
                    }
                    return true;
                }, IntPtr.Zero);
                return windows;
            }
        }
"@
}

# Process identification patterns (command line search terms)
# Must match CLI keyword AND be in a terminal host process
$processPatterns = @{
    "Claude"  = @("claude", "anthropic")
    "Veris"   = @("claude", "anthropic")
    "Gemini"  = @("gemini")
    "Codex"   = @("codex")
    "Timothy" = @("cici", "tauri")
}

# Terminal host process names (strict match requirement)
$terminalHosts = @("cmd", "powershell", "pwsh", "WindowsTerminal", "conhost", "node", "python", "tauri")

# Get patterns for this target (fallback to target name itself)
$searchTerms = $processPatterns[$Target]
if (-not $searchTerms) {
    $searchTerms = @($Target.ToLower())
}

Write-Audit "TARGET: $Target | TERMS: $($searchTerms -join ', ')"

# Strategy 0: Check for ACTIVE_PID.txt override
$targetProc = $null
$methodUsed = "none"

if (Test-Path $ACTIVE_PID_FILE) {
    $overrideContent = Get-Content $ACTIVE_PID_FILE -Raw -ErrorAction SilentlyContinue
    if ($overrideContent) {
        # Format: Target=PID (e.g., Claude=12345)
        foreach ($line in $overrideContent -split "`n") {
            if ($line -match "^$Target=(\d+)$") {
                $overridePID = [int]$Matches[1]
                $targetProc = Get-Process -Id $overridePID -ErrorAction SilentlyContinue
                if ($targetProc) {
                    $methodUsed = "ACTIVE_PID override"
                    Write-Audit "OVERRIDE: Using PID $overridePID from ACTIVE_PID.txt"
                }
                break
            }
        }
    }
}

# Strategy 1: Find by command line (most reliable) with strict matching
if (-not $targetProc) {
    try {
        $wmiProcs = Get-CimInstance Win32_Process | Where-Object {
            $cmdLine = $_.CommandLine
            $procName = $_.Name.ToLower() -replace '\.exe$', ''
            if ($cmdLine) {
                # Strict match: must contain CLI keyword
                $hasKeyword = $false
                foreach ($term in $searchTerms) {
                    if ($cmdLine -like "*$term*") { $hasKeyword = $true; break }
                }
                # AND must be a terminal host process
                $isTerminal = $terminalHosts -contains $procName
                return ($hasKeyword -and $isTerminal)
            }
            return $false
        }

        if ($wmiProcs) {
            # Get the most recent match that has a visible, non-minimized window
            $candidates = @()
            foreach ($wmiProc in $wmiProcs) {
                $proc = Get-Process -Id $wmiProc.ProcessId -ErrorAction SilentlyContinue
                if ($proc -and $proc.MainWindowHandle -ne 0) {
                    $candidates += @{
                        Process = $proc
                        WmiProc = $wmiProc
                        StartTime = $proc.StartTime
                    }
                }
            }
            # Sort by start time descending (most recent first)
            if ($candidates.Count -gt 0) {
                $sorted = $candidates | Sort-Object { $_.StartTime } -Descending
                $targetProc = $sorted[0].Process
                $cmdPreview = $sorted[0].WmiProc.CommandLine.Substring(0, [Math]::Min(80, $sorted[0].WmiProc.CommandLine.Length))
                $methodUsed = "command-line"
                Write-Audit "FOUND via command line: PID $($targetProc.Id) | CMD: $cmdPreview..."
            }
        }
    } catch {
        Write-Audit "WMI search failed: $_"
    }
}

# Strategy 2: Fallback to window title pattern (legacy support)
if (-not $targetProc) {
    $titlePatterns = @{
        "Claude"  = @("*claude*", "*anthropic*", "*CLAUDE*", "*Hollodox*", "*VERIS*")
        "Veris"   = @("*claude*", "*VERIS*", "*Hollodox*")
        "Gemini"  = @("*gemini*", "*GEMINI*")
        "Codex"   = @("*codex*", "*CODEX*", "*openai*")
        "Timothy" = @("*Cici*", "*cici*")
    }

    $patterns = $titlePatterns[$Target]
    if (-not $patterns) { $patterns = @("*$Target*") }

    foreach ($pattern in $patterns) {
        $targetProc = Get-Process | Where-Object { $_.MainWindowTitle -like $pattern } | Select-Object -First 1
        if ($targetProc) {
            $methodUsed = "title-pattern ($pattern)"
            Write-Audit "FOUND via title pattern '$pattern': PID $($targetProc.Id) | TITLE: $($targetProc.MainWindowTitle)"
            break
        }
    }
}

if (-not $targetProc) {
    Write-Audit "ERROR: No process found for target: $Target"
    exit 1
}

$targetPID = $targetProc.Id
$targetTitle = $targetProc.MainWindowTitle

# Find all visible, non-minimized windows for this PID
$foundWindows = [Win32Inject]::FindVisibleNonMinimizedWindowsForPID($targetPID)

if ($foundWindows.Count -gt 0) {
    $hwnd = $foundWindows[0]
    Write-Audit "INJECT: HWND=$hwnd | PID=$targetPID | TITLE=$targetTitle | METHOD=$methodUsed"

    # Send each character via WM_CHAR (0x0102)
    foreach ($char in $Message.ToCharArray()) {
        [Win32Inject]::PostMessage($hwnd, 0x0102, [IntPtr][int]$char, [IntPtr]0) | Out-Null
    }
    # Send Enter via WM_KEYDOWN + WM_KEYUP (VK_RETURN = 0x0D)
    [Win32Inject]::PostMessage($hwnd, 0x0100, [IntPtr]0x0D, [IntPtr]0) | Out-Null  # WM_KEYDOWN
    Start-Sleep -Milliseconds 20
    [Win32Inject]::PostMessage($hwnd, 0x0101, [IntPtr]0x0D, [IntPtr]0) | Out-Null  # WM_KEYUP

    Write-Audit "SUCCESS: Message sent to $Target (background, no focus steal)"
    exit 0
} else {
    Write-Audit "ERROR: No visible non-minimized windows found for PID $targetPID"
    exit 1
}
