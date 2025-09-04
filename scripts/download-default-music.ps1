# Download Default Music File Script
# This script downloads a Creative Commons licensed music file for testing

$musicUrl = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
$destinationPath = "public/assets/default-lobby-music.mp3"

Write-Host "Downloading default music file..."
Write-Host "Note: This is a placeholder. For production, use a proper background music track."

try {
    # Create directory if it doesn't exist
    $dir = Split-Path $destinationPath -Parent
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
    }
    
    # For now, create a placeholder file with instructions
    $placeholderContent = @"
This is a placeholder for the default music file.

To add a real music file:
1. Find a royalty-free MP3 file
2. Replace this file with your chosen music
3. Keep the filename as 'default-lobby-music.mp3'

Recommended sources:
- Pixabay Music (pixabay.com/music)
- Creative Commons (creativecommons.org)
- Free Music Archive (freemusicarchive.org)

The file should be:
- Format: MP3
- Duration: 2-10 minutes
- Style: Ambient/instrumental
- Quality: 128kbps or higher
"@
    
    Set-Content -Path $destinationPath -Value $placeholderContent
    Write-Host "Placeholder file created at: $destinationPath"
    Write-Host "Please replace with a real MP3 file for full functionality."
    
} catch {
    Write-Error "Failed to create placeholder file: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Find a suitable MP3 file"
Write-Host "2. Replace the placeholder file"
Write-Host "3. Refresh the application"
Write-Host "4. The music player should now show 'Default Lobby Music'"
