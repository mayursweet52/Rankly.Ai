# =========================================================
# Rankly.ai - Create Desktop Shortcut with Custom Icon
# =========================================================
# This script creates a desktop shortcut for the Rankly.ai application
# Run as Administrator for best results

param(
    [string]$AppPath = $PSScriptRoot,
    [string]$IconPath = "$PSScriptRoot\rankly-icon.ico",
    [string]$ShortcutName = "Rankly.ai"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rankly.ai Desktop Shortcut Creator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate app path
if (!(Test-Path "$AppPath\server.js")) {
    Write-Host "ERROR: server.js not found in $AppPath" -ForegroundColor Red
    exit 1
}

# Validate or create icon
if (!(Test-Path $IconPath)) {
    Write-Host "INFO: Custom icon not found. Creating a default icon..." -ForegroundColor Yellow
    # We'll create a placeholder reference - user needs to provide actual icon
    Write-Host "IMPORTANT: Please add a 'rankly-icon.ico' file to the application directory." -ForegroundColor Yellow
    $IconPath = "C:\Windows\System32\shell32.dll"  # Fallback to Windows system icon
}

# Get Desktop path
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "$ShortcutName.lnk"

# Create WScript.Shell object
$WshShell = New-Object -ComObject WScript.Shell

# Create shortcut
Write-Host "Creating shortcut: $ShortcutPath" -ForegroundColor Green
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$AppPath\start.bat"
$Shortcut.WorkingDirectory = $AppPath
$Shortcut.IconLocation = $IconPath
$Shortcut.Description = "Rankly.ai - Executive OS & Recruitment Platform"
$Shortcut.WindowStyle = 1  # Normal window
$Shortcut.Save()

Write-Host ""
Write-Host "SUCCESS! Desktop shortcut created:" -ForegroundColor Green
Write-Host "  Location: $ShortcutPath" -ForegroundColor Green
Write-Host "  Target: $AppPath\start.bat" -ForegroundColor Green
Write-Host ""

# Optional: Create Start Menu shortcut
$StartMenuPath = [Environment]::GetFolderPath('Programs')
$StartMenuShortcutPath = Join-Path $StartMenuPath "$ShortcutName.lnk"

$MenuShortcut = $WshShell.CreateShortcut($StartMenuShortcutPath)
$MenuShortcut.TargetPath = "$AppPath\start.bat"
$MenuShortcut.WorkingDirectory = $AppPath
$MenuShortcut.IconLocation = $IconPath
$MenuShortcut.Description = "Rankly.ai - Executive OS & Recruitment Platform"
$MenuShortcut.WindowStyle = 1
$MenuShortcut.Save()

Write-Host "Start Menu shortcut also created at:" -ForegroundColor Green
Write-Host "  $StartMenuShortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "You can now launch Rankly.ai from the Desktop or Start Menu!" -ForegroundColor Cyan
Write-Host ""

# Pause before closing
Read-Host "Press Enter to close this window"
