const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Replace the feedbackModal div with dialog
html = html.replace(
    '<div id="feedbackModal" class="modal-overlay" style="display:none;" onclick="if(event.target===this) closeFeedbackModal()">',
    '<dialog id="feedbackModal" class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-2xl m-auto" onclick="if(event.target===this) this.close()">'
);
html = html.replace(
    '<div class="modal-box" class="modal-box p-6 rounded-2xl',
    '<div class="modal-box p-6 rounded-2xl'
);

html = html.replace(
    /window\.closeFeedbackModal = function\(\) \{\s+const modal = document\.getElementById\('feedbackModal'\);\s+if \(modal\) modal\.style\.display = 'none';\s+\};/g,
    window.closeFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) modal.close();
            };
);

html = html.replace(
    /window\.openFeedbackModal = function\(\) \{\s+const modal = document\.getElementById\('feedbackModal'\);\s+if \(modal\) \{\s+modal\.style\.display = 'flex';/g,
    window.openFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) {
                    modal.showModal();
);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated feedbackModal');
