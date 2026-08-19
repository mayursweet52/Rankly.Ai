const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const targetBat = path.join(rootDir, 'scripts', 'launch-rankly.bat');

// Check for brand icon (ICO or PNG)
const icoPath = path.join(rootDir, 'public', 'assets', 'brand', 'icon.ico');
const pngPath = path.join(rootDir, 'public', 'assets', 'brand', 'icon.png');
const selectedIcon = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : '');

console.log('🔄 Creating Desktop Shortcut for Rankly.ai...');

const psScript = `
$DesktopPath = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $DesktopPath)) {
    $DesktopPath = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop')
}
$ShortcutPath = [System.IO.Path]::Combine($DesktopPath, 'Rankly AI.lnk')

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = '${targetBat.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = '${rootDir.replace(/'/g, "''")}'
$Shortcut.Description = 'Rankly.ai Enterprise and Candidate Platform'
${selectedIcon ? `$Shortcut.IconLocation = '${selectedIcon.replace(/'/g, "''")}'` : ''}
$Shortcut.Save()

Write-Host "✅ Native Desktop Shortcut created successfully at: $ShortcutPath"
`;

try {
  const tempPsFile = path.join(__dirname, 'temp-create-shortcut.ps1');
  fs.writeFileSync(tempPsFile, psScript, 'utf8');
  const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPsFile}"`, { encoding: 'utf8' });
  if (fs.existsSync(tempPsFile)) fs.unlinkSync(tempPsFile);
  console.log(output.trim());
} catch (err) {
  console.error('❌ Failed to generate shortcut:', err.message);
}
