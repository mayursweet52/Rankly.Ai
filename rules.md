# Rankly.ai — Antigravity Rules & Guidelines

## 🚨 Critical Rules (ALWAYS FOLLOW)

1. **Never rewrite entire files.**
   - Sirf specific line/class/function change karo.
   - Agar multiple lines change karni hain toh pehle mujhe batao.

2. **Always identify the exact file and location.**
   - Pehle batao ki kaunsi file change karni hai.
   - Pehle content dikhao, phir change karo.

3. **No unnecessary HTML changes.**
   - Sirf CSS ya specified section change karo.
   - HTML structure, JavaScript, aur baaki files mat chhedo.

4. **Incremental changes only.**
   - Ek baar mein sirf 1 change karo.
   - Multiple changes ke liye mujhe pehle approve karne do.

5. **Always ask before deleting anything.**
   - Koi bhi code delete karne se pehle mujhe batao.
   - Pehle "ye delete kar sakta hu?" pucho.

## 🎨 UI/UX Rules

1. **Dark theme default hai.**
   - Light theme optional hai.
   - Dark mode ke liye `body.dark-theme` class use karo.

2. **Cohere-style dark theme use karo.**
   - Background: `#0a0a0f` ya `#14141f`
   - Glassmorphism: `backdrop-filter: blur(16px)`
   - Text: white (`#ffffff`) aur light grey (`#a0aec0`)

3. **Indigo-purple gradient use karo.**
   - Primary: `#4f46e5` se `#7c3aed` tak
   - Buttons: gradient with hover scale

4. **Fonts: 'Plus Jakarta Sans' aur 'Inter' use karo.**
   - Heading: Bold, white
   - Body: Light grey

## 📁 File-Specific Rules

### `index-3.html`
- Main UI file hai. Isme HTML, CSS, JavaScript sab hain.
- **CSS changes:** `<style>` section ke andar karo.
- **JavaScript:** `<script>` section ke andar karo.
- **Koi bhi HTML structure change karne se pehle pucho.**

### `server.js`
- Backend file hai. Node.js + Express.
- API endpoints change karne se pehle mujhe batao.
- Database queries change mat karo.

### `hybridAiService.js`
- AI service file hai.
- Sirf local mode (Ollama) changes karo.
- Groq/Gemini mat chhedo (agar local mode nahi hai toh).

## 🛠️ Change Request Process

1. Pehle file ka content dikhao.
2. Phir batao kaunsa line change karna hai.
3. Phir change apply karo.
4. Phir mujhe batao ki kya change hua.

## ❌ Kya Nahi Karna Hai

- ❌ Poori file overwrite mat karo.
- ❌ HTML structure change mat karo (unless main approve karun).
- ❌ `package.json` ya `.env` change mat karo.
- ❌ Database schema change mat karo.
- ❌ Multiple files ek saath change mat karo.

## ✅ Kya Karna Hai

- ✅ Sirf specific line/class change karo.
- ✅ Pehle content dikhao, phir change karo.
- ✅ Ek baar mein sirf 1 change karo.
- ✅ Changes ka reason batao.

---

**Remember:** Main developer hu. Tu mera assistant hai. Main decide karunga ki kaunsa change apply karna hai. Tu sirf suggestions aur options de sakta hai.
