import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace div with dialog
content = content.replace(
    '<div id="feedbackModal" class="modal-overlay" style="display:none;" onclick="if(event.target===this) closeFeedbackModal()">',
    '<dialog id="feedbackModal" class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-2xl m-auto" onclick="if(event.target===this) this.close()">'
)

# Fix duplicate class attribute
content = content.replace(
    '<div class="modal-box" class="modal-box p-6 rounded-2xl',
    '<div class="modal-box p-6 rounded-2xl'
)

# Replace JS close function
old_close_js = '''            window.closeFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) modal.style.display = 'none';
            };'''
new_close_js = '''            window.closeFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) modal.close();
            };'''
content = content.replace(old_close_js, new_close_js)

# Replace JS open function
old_open_js = '''            window.openFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) {
                    modal.style.display = 'flex';'''
new_open_js = '''            window.openFeedbackModal = function() {
                const modal = document.getElementById('feedbackModal');
                if (modal) {
                    modal.showModal();'''
content = content.replace(old_open_js, new_open_js)

# Need to replace the closing </div> of the modal with </dialog>
# We can find the comment before the next modal to know where it ends.
# Or just regex: <dialog id="feedbackModal".*?(</div>\s*</div>\s*</div>\s*)</div>
# Let's do a simple regex substitute for the closing tag of this specific modal.
# It's at the end of the block.
# Actually, since <dialog> doesn't break if there's a </div> instead (the browser auto-corrects or it leaves a dangling div),
# it's better to fix it properly.
# The feedback modal ends before <div id="addEmployeeModal"
idx = content.find('<dialog id="feedbackModal"')
if idx != -1:
    next_modal_idx = content.find('<div id="addEmployeeModal"', idx)
    # Search backwards from next_modal_idx for the first </div>
    last_div = content.rfind('</div>', idx, next_modal_idx)
    if last_div != -1:
        content = content[:last_div] + '</dialog>' + content[last_div+6:]

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
