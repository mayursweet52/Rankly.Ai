const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./rankly_candidates.db');

db.serialize(() => {
  db.all("SELECT id, jobId, name, matchScore, summary, createdAt FROM candidates WHERE jobId = ? ORDER BY matchScore DESC", ['job_1'], (err, rows) => {
    if (err) {
      console.error('DB error:', err);
      process.exit(1);
    }
    if (!rows || rows.length === 0) {
      console.log('No candidates found for job_1');
    } else {
      console.log('Found', rows.length, 'candidate(s):');
      rows.forEach(r => console.log(r));
    }
    db.close();
  });
});
