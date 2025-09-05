# LANStreamer Desktop Shortcut Creator
# This script creates a desktop shortcut for the LANStreamer batch file

param(
    [switch]$Force
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                LANStreamer Shortcut Creator                  ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get current directory and batch file path
$currentDir = Get-Location
$batchFile = Join-Path $currentDir "Start-LANStreamer.bat"
$iconFile = Join-Path $currentDir "public\assets\favicon.png"

# Check if batch file exists
if (-not (Test-Path $batchFile)) {
    Write-Host "❌ ERROR: Start-LANStreamer.bat not found in current directory" -ForegroundColor Red
    Write-Host "   Please run this script from the LANStreamer folder" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Get desktop path
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "LANStreamer.lnk"

# Check if shortcut already exists
if ((Test-Path $shortcutPath) -and -not $Force) {
    Write-Host "⚠️  Shortcut already exists on desktop" -ForegroundColor Yellow
    $overwrite = Read-Host "   Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "   Operation cancelled" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 0
    }
}

try {
    # Create WScript Shell object
    $WshShell = New-Object -comObject WScript.Shell
    
    # Create shortcut
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $batchFile
    $Shortcut.WorkingDirectory = $currentDir
    $Shortcut.Description = "Start LANStreamer Audio Streaming Server"
    
    # Try to set icon if PNG exists
    if (Test-Path $iconFile) {
        # For batch files, we can use the shell32.dll icon or try to use the PNG
        # Windows shortcuts can't directly use PNG, so we'll use a system icon
        $Shortcut.IconLocation = "shell32.dll,25"  # Computer/server icon
    }
    
    # Save shortcut
    $Shortcut.Save()
    
    Write-Host "✅ Desktop shortcut created successfully!" -ForegroundColor Green
    Write-Host "   Location: $shortcutPath" -ForegroundColor Gray
    Write-Host ""
    
    # Ask about taskbar pinning
    Write-Host "💡 Additional Options:" -ForegroundColor Cyan
    Write-Host "   • Right-click the desktop shortcut and select 'Pin to taskbar'" -ForegroundColor Gray
    Write-Host "   • Right-click and select 'Pin to Start' for Start menu access" -ForegroundColor Gray
    Write-Host ""
    
    $openDesktop = Read-Host "Do you want to open the desktop folder to see the shortcut? (y/n)"
    if ($openDesktop -eq "y" -or $openDesktop -eq "Y") {
        Start-Process "explorer.exe" -ArgumentList $desktop
    }
    
} catch {
    Write-Host "❌ ERROR: Failed to create shortcut" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete! You can now:" -ForegroundColor Green
Write-Host "   1. Double-click the desktop shortcut to start LANStreamer" -ForegroundColor Gray
Write-Host "   2. Pin it to taskbar for quick access" -ForegroundColor Gray
Write-Host "   3. Pin it to Start menu" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
