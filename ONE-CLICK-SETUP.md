# Rankly.ai - One-Click Startup Guide

## Quick Start (Easiest Method)

### For Windows Users:

#### **Method 1: Automatic Setup (Recommended)**

1. **Run the setup script** (run as Administrator for best results):
   - Double-click `setup.bat`
   - This will:
     - Install all dependencies (npm install)
     - Create a `.env` configuration file
     - Create a desktop shortcut for easy access
     - Verify the installation

2. **Launch the application**:
   - Look for "Rankly.ai" shortcut on your Desktop
   - Double-click it to start the server
   - The application will open at `http://localhost:3000`

#### **Method 2: Manual Setup**

If automatic setup doesn't work:

1. **Open Command Prompt** in the application folder
2. **Install dependencies**:
   ```batch
   npm install
   ```

3. **Create .env file** (create a new text file named `.env`):
   ```
   PORT=3000
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2:3b
   API_KEY=rankly-secret-key
   ```

4. **Run start script**:
   ```batch
   start.bat
   ```

---

## Custom Icon Setup

### Option 1: Use Default Icon (No Extra Steps)
The setup will use a Windows system icon automatically.

### Option 2: Create Custom Icon

#### **Using Python (Recommended)**

1. **Install Pillow library**:
   ```bash
   pip install Pillow
   ```

2. **Run icon generator**:
   ```bash
   python create_icon.py
   ```

3. This creates `rankly-icon.ico` in your app folder

#### **Using Online Tools**

1. Go to https://icoconvert.com/
2. Upload or design your icon
3. Download as `.ico` format
4. Save as `rankly-icon.ico` in the app folder

#### **Design Your Own Icon**

Create a 256x256 pixel PNG image with:
- **Background**: Indigo/Blue (#6366F1)
- **Symbol**: Letter "R" or recruitment symbol
- **Style**: Modern, flat design

Then convert to `.ico` using:
- https://convertio.co/png-ico/
- https://icoconvert.com/

---

## File Structure

```
Rankly.ai/
├── start.bat                 ← Double-click to launch
├── setup.bat                 ← Run once for setup
├── Create-Shortcut.ps1       ← PowerShell shortcut creator
├── create_icon.py            ← Icon generator script
├── rankly-icon.ico           ← Custom icon (optional)
├── server.js                 ← Main server file
├── package.json              ← Dependencies
├── .env                      ← Configuration (auto-created)
├── public/                   ← Frontend files
├── prisma/                   ← Database schema
└── uploads/                  ← Uploaded PDFs
```

---

## First Time Setup

### Prerequisites
- **Node.js** (v14+) - Download from https://nodejs.org/
- **npm** (comes with Node.js)

### Initial Setup Steps

1. **Download the application** to any folder
2. **Right-click `setup.bat`** → Select "Run as Administrator"
3. **Wait for installation** to complete
4. **Check Desktop** for "Rankly.ai" shortcut
5. **Double-click shortcut** to start

---

## Configuration

### Environment Variables (.env file)

Edit the `.env` file created by setup to customize:

```env
# Server port (default: 3000)
PORT=3000

# Ollama API endpoint
OLLAMA_URL=http://localhost:11434

# AI model to use
OLLAMA_MODEL=llama3.2:3b

# API authentication key
API_KEY=rankly-secret-key
```

⚠️ **Change API_KEY before using in production!**

---

## Running the Application

### Option 1: Desktop Shortcut (Easiest)
- Double-click "Rankly.ai" on desktop

### Option 2: Batch File
- Navigate to app folder
- Double-click `start.bat`

### Option 3: Command Line
```batch
cd path\to\Rankly.ai
node server.js
```

---

## Accessing the Application

Once running, open your browser and go to:
```
http://localhost:3000
```

Default API Key: `rankly-secret-key`

---

## Stopping the Application

1. **Close the terminal window**, OR
2. **Press `Ctrl + C`** in the terminal

---

## Troubleshooting

### Issue: "Node.js is not installed"
**Solution**: Download and install from https://nodejs.org/

### Issue: Port 3000 already in use
**Solution**: Change PORT in `.env` to another number (e.g., 3001)

### Issue: Shortcut doesn't work
**Solution**: 
- Run `setup.bat` again as Administrator
- OR manually run `Create-Shortcut.ps1` as Administrator

### Issue: Dependencies not installing
**Solution**:
```batch
cd path\to\Rankly.ai
npm cache clean --force
npm install
```

### Issue: Ollama connection fails
**Solution**:
- Make sure Ollama is running on your machine
- Check OLLAMA_URL in `.env` matches your setup
- Or set `OLLAMA_URL=http://localhost:11434`

---

## Creating a Portable Version

To make the app run on any computer without setup:

1. **Install pkg** (Node.js to executable converter):
   ```bash
   npm install -g pkg
   ```

2. **Package your app**:
   ```bash
   pkg . -o rankly-app
   ```

3. This creates `rankly-app.exe` that can run standalone

---

## Advanced: Create Windows Service

To run Rankly.ai as a background Windows service:

1. **Install node-windows**:
   ```bash
   npm install node-windows
   ```

2. **Create `service.js`**:
   ```javascript
   const Service = require('node-windows').Service;
   
   const svc = new Service({
     name: 'Rankly.ai',
     description: 'Rankly AI Recruitment Platform',
     script: 'server.js'
   });
   
   svc.on('install', () => {
     svc.start();
   });
   
   svc.install();
   ```

3. **Install service**:
   ```bash
   node service.js
   ```

---

## Support & Tips

- **Logs**: Check `combined.log` and `error.log` in the app folder
- **Database**: Stored in `rankly_candidates.db`
- **Uploads**: PDF files stored in `uploads/` folder
- **Performance**: Indexing configured in database for speed

---

## File Customization

### Adding Your Own Icon

1. Create 256×256 PNG with your design
2. Convert to `.ico` using online tool
3. Save as `rankly-icon.ico` in app folder
4. Run `Create-Shortcut.ps1` to update shortcut icon

### Changing App Name/Description

Edit `setup.bat` and change:
```batch
set "ShortcutName=Your Custom Name"
```

---

**Your Rankly.ai application is now ready for one-click launching!** 🚀
