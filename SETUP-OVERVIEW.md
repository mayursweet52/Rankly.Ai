# Rankly.ai - Complete Setup Overview

## 📦 What Was Created

### Launch Files
- **`start.bat`** - Direct launcher (checks dependencies, creates .env, starts server)
- **`setup.bat`** - Complete setup wizard (installs npm packages, creates shortcuts, verifies everything)

### Configuration & Tools
- **`Create-Shortcut.ps1`** - PowerShell script to manually create/update desktop shortcuts
- **`create_icon.py`** - Python script to generate a custom Rankly.ai icon
- **`.env`** - Configuration file (auto-created by start.bat)

### Documentation
- **`ONE-CLICK-SETUP.md`** - Complete detailed guide (you're reading references to this!)
- **`QUICK-REFERENCE.txt`** - Quick lookup reference card

---

## 🎯 Quick Start (Right Now!)

### Step 1: Initial Setup
```
1. Right-click setup.bat
2. Select "Run as Administrator"
3. Wait for installation to complete
4. Check your Desktop for "Rankly.ai" shortcut
```

### Step 2: Launch Application
```
1. Double-click "Rankly.ai" shortcut on Desktop
   OR
2. Double-click start.bat
3. Browser opens to http://localhost:3000
```

### Step 3: Use Application
```
- Login with API Key: rankly-secret-key
- Upload PDF resumes
- View AI-ranked candidates
```

---

## 🎨 Optional: Add Custom Icon

### Method 1: Auto-Generated Icon (Easiest)
```bash
python create_icon.py
```
Creates a modern "R" icon automatically

### Method 2: Online Tool
1. Go to https://icoconvert.com/
2. Upload your design (256x256 PNG)
3. Download .ico file
4. Rename to `rankly-icon.ico`
5. Place in app folder

### Method 3: Windows System Icon
Already configured! Uses Windows icon by default.

---

## 📋 File Purpose Reference

| File | Purpose | When to Use |
|------|---------|-----------|
| `start.bat` | Launch server | Every day - main launcher |
| `setup.bat` | Install & configure | First time only |
| `Create-Shortcut.ps1` | Create desktop shortcut | If shortcut missing/broken |
| `create_icon.py` | Generate icon | To customize appearance |
| `.env` | App configuration | Modify settings |
| `ONE-CLICK-SETUP.md` | Detailed guide | When stuck/questions |
| `QUICK-REFERENCE.txt` | Quick lookup | Fast answers |

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────┐
│  FIRST TIME (One-Time Setup)                │
├─────────────────────────────────────────────┤
│  1. Right-click setup.bat                   │
│  2. Run as Administrator                    │
│  3. Wait for completion                     │
│  4. Desktop shortcut created                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  EVERY DAY (Daily Launch)                   │
├─────────────────────────────────────────────┤
│  1. Double-click "Rankly.ai" shortcut       │
│  2. Terminal opens (server running)         │
│  3. Browser opens (http://localhost:3000)   │
│  4. Use application normally                │
│  5. Close terminal to stop                  │
└─────────────────────────────────────────────┘
```

---

## 🎯 Directory Structure After Setup

```
Rankly.ai/
├── 🚀 start.bat                    ← Your main launcher
├── 🔧 setup.bat                    ← Run for setup
├── 📜 Create-Shortcut.ps1          ← Shortcut management
├── 🎨 create_icon.py               ← Icon generator
├── 🎨 rankly-icon.ico              ← Custom icon (if created)
├── ⚙️  .env                         ← Configuration
│
├── 📁 public/                      ← Frontend (HTML, CSS, JS)
│   ├── index.html                  ← Main web interface
│   └── js/upload.js                ← File upload handler
│
├── 📁 prisma/                      ← Database schema
│   └── schema.prisma               ← Data models
│
├── 📁 uploads/                     ← Uploaded PDF files
│
├── 📁 node_modules/                ← Dependencies (auto-created)
│
├── 📄 server.js                    ← Main server
├── 📄 package.json                 ← Project config
├── 📄 package-lock.json            ← Dependency lock
│
├── 📊 rankly_candidates.db         ← SQLite database
├── 📋 combined.log                 ← All logs
└── ❌ error.log                    ← Error logs
```

---

## 🔐 Security & Configuration

### Default Setup
```
PORT: 3000
API Key: rankly-secret-key
Ollama: http://localhost:11434
Model: llama3.2:3b
```

### Before Production
1. **Change API_KEY** in `.env`
2. **Update Ollama settings** if different
3. **Enable HTTPS** if exposed to internet
4. **Set secure PORT** (not default)

---

## ⚙️ System Requirements

### Minimum
- Windows 7 or later
- Node.js v14+
- 2GB RAM
- 500MB disk space

### Recommended
- Windows 10/11
- Node.js v18+
- 4GB RAM
- 2GB disk space
- Ollama running locally

---

## 🚦 Troubleshooting Flowchart

```
App won't start?
├─ Node.js installed?
│  └─ No → Install from nodejs.org
│  └─ Yes → Continue
├─ Run: setup.bat
│  ├─ Success → Launch with shortcut
│  └─ Error → Check combined.log
├─ Port 3000 in use?
│  └─ Yes → Change PORT in .env to 3001
├─ Dependencies missing?
│  └─ Run: npm install
└─ Still not working?
   └─ Check error.log file
```

---

## 📱 Advanced Features

### For Developers

**View Logs in Real-Time**
```bash
tail -f combined.log
```

**Run with Auto-Reload**
```bash
npm run dev
```

**Check Database**
```bash
sqlite3 rankly_candidates.db
SELECT * FROM candidates;
```

### For Power Users

**Custom Port**
```
Edit .env:
PORT=8080
```

**Different AI Model**
```
Edit .env:
OLLAMA_MODEL=llama2:latest
```

**Custom API Key**
```
Edit .env:
API_KEY=your-secret-key-here
```

---

## 🎓 Learning & Support

### Included Documentation
1. **ONE-CLICK-SETUP.md** - Full setup guide
2. **QUICK-REFERENCE.txt** - Quick answers
3. **This file** - Complete overview

### External Resources
- **Node.js**: https://nodejs.org/docs
- **Ollama**: https://ollama.ai
- **Express**: https://expressjs.com
- **Socket.io**: https://socket.io/docs

---

## ✨ You're All Set!

Your Rankly.ai application is ready to launch with one click.

### Next Steps:
1. **Right-click `setup.bat`** and select "Run as Administrator"
2. **Wait for completion** (1-2 minutes depending on internet)
3. **Double-click the "Rankly.ai" shortcut** on your Desktop
4. **Open** http://localhost:3000 in your browser
5. **Start using** Rankly.ai to rank candidate resumes!

### That's it! 🎉

For any issues, refer to:
- `ONE-CLICK-SETUP.md` - Detailed troubleshooting
- `QUICK-REFERENCE.txt` - Quick answers
- `combined.log` - Error details

---

**Happy recruiting! 🚀**
