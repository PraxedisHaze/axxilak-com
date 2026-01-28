param (
    [string]$TargetPID = "454208",
    [string]$Message = "continue"
)

$signature = @"
[DllImport("user32.dll")]
public static extern IntPtr PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
"@

$Win32 = Add-Type -MemberDefinition $signature -Name "Win32Basic" -Namespace "Win32" -PassThru

# Get the Main Window Handle for the PID
$proc = Get-Process -Id $TargetPID -ErrorAction SilentlyContinue
if ($proc) {
    $hwnd = $proc.MainWindowHandle
    if ($hwnd -ne [IntPtr]::Zero) {
        # Post characters (WM_CHAR = 0x0102)
        foreach ($char in $Message.ToCharArray()) {
            [Win32.Win32Basic]::PostMessage($hwnd, 0x0102, [IntPtr][int]$char, [IntPtr]0) | Out-Null
        }
        # Post Return (13)
        [Win32.Win32Basic]::PostMessage($hwnd, 0x0102, [IntPtr]13, [IntPtr]0) | Out-Null
    }
}