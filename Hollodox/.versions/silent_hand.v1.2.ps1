param (
    [string]$Message = "continue"
)

# Load the current target PID
$pidPath = "C:\Users\phaze\games_n_apps\Hollodox\ACTIVE_PID.txt"
if (!(Test-Path $pidPath)) { return }
$targetPID = Get-Content $pidPath -Raw | ForEach-Object { $_.Trim() }

# Define the C# helper only if it doesn't already exist in this session
if (-not ([System.Management.Automation.PSTypeName]'Win32Final').Type) {
    Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        using System.Collections.Generic;

        public class Win32Final {
            [DllImport("user32.dll")]
            public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            [DllImport("user32.dll")]
            public static extern IntPtr PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

            public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

            public static List<IntPtr> FindWindowsForPID(uint pid) {
                List<IntPtr> windows = new List<IntPtr>();
                EnumWindows((hWnd, lParam) => {
                    uint windowPid;
                    GetWindowThreadProcessId(hWnd, out windowPid);
                    if (windowPid == pid) { windows.Add(hWnd); }
                    return true;
                }, IntPtr.Zero);
                return windows;
            }
        }
"@
}

# Hunter Logic
$foundWindows = [Win32Final]::FindWindowsForPID($targetPID)

if ($foundWindows.Count -gt 0) {
    $hwnd = $foundWindows[0]
    foreach ($char in $Message.ToCharArray()) {
        [Win32Final]::PostMessage($hwnd, 0x0102, [IntPtr][int]$char, [IntPtr]0) | Out-Null
    }
    [Win32Final]::PostMessage($hwnd, 0x0102, [IntPtr]13, [IntPtr]0) | Out-Null
}
