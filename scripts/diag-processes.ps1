Get-CimInstance Win32_Process -Filter "name='ffmpeg.exe'" | ForEach-Object {
  Write-Output ("PID " + $_.ProcessId + ": " + $_.CommandLine)
}
