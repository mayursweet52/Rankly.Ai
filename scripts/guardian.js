const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../error-log.txt');
console.log('🛡️ Guardian Watcher active: Listening for codebase updates...');

function runDiagnostics() {
  exec('node scripts/test-system.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Diagnostics detected errors. Writing log...');
      fs.writeFileSync(logFile, `=== SYSTEM DIAGNOSTIC ERROR ===\n${stderr || stdout}`);
    } else {
      console.log('✅ All system diagnostics passed.');
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    }
  });
}

// Initial diagnostic run
runDiagnostics();

// Watch directory for modifications
fs.watch(path.join(__dirname, '..'), { recursive: true }, (eventType, filename) => {
  if (filename && !filename.includes('node_modules') && !filename.includes('.git') && !filename.includes('error-log.txt') && !filename.includes('scratch')) {
    console.log(`\n[File Changed] ${filename} -> Running test suite...`);
    runDiagnostics();
  }
});
