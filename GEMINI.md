# Antigravity Agent Rules for Rankly.Ai

## Automatic Git Pull on Every Interaction (MANDATORY USER RULE)
- **Rule**: You MUST ALWAYS pull the latest changes from GitHub (`git pull origin main`) before starting any new task and after every result/turn. This ensures the workspace is always 100% in sync with changes committed by teammates and prevents merge conflicts.

## Automatic Git Push on Every Update (MANDATORY USER RULE)
- **Rule**: After completing ANY code modification, bug fix, feature addition, or file update requested by the user, you MUST ALWAYS immediately stage, commit, and push the changes directly to GitHub:
  1. Pull latest remote updates (`git pull origin main`).
  2. Stage all modified and added files (`git add .`).
  3. Commit with an informative, descriptive commit message.
  4. Push immediately to `origin main` (and the active feature branch) on GitHub (`git push origin main`).
- Do NOT wait for the user to remind you to push or pull. It must happen proactively on EVERY turn and update.
- Keep the local server daemon up to date and verified.
