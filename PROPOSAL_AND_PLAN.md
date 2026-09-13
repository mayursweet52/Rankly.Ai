# 🔒 Architecture Proposal & Plan: Tab & Browser Close Session Termination (Refresh-Only Persistence)

**Project:** Rankly.ai  
**Primary Architect:** Mayur Jadhav, Sumit Khomne & Vaibhav Aakhade  
**Status:** 🟡 **AWAITING DEVELOPER APPROVAL ("Proceed / Approved")**  

---

## 📌 1. Objective / समस्या aur Solution (Simple Hinglish)

**User Directive:**
> *"dekh bs refresh krne pr na login rakho pr jab na browser band ho ya website ka tab band kiya hain to login hatna chahioye session terminate krdo thiko"*

### Requirement:
1. **Jab user page Refresh kare (F5 ya Ctrl+R)**: Login barkarar rehna chahiye (Dashboard khula rahe, logout na ho).
2. **Jab user Tab close kare ya pura Browser band kare**: Session turant **terminate (destroy)** hona chahiye. Agli baar website open karne par direct **Login Page** dikhna chahiye aur user logged out rehna chahiye.

---

## ⚙️ 2. Root Cause & Technical Mechanism

1. **Abhi kya ho raha tha?**
   - User jab login karta tha, toh `localStorage` me `rankly_remembered_session` aur backend Express cookie me `maxAge: 7 days` save ho jaata tha.
   - `localStorage` aur 7-day cookies hard disk me hamesha store rehti hain, is wajah se browser band karke dobara kholne par bhi auto-login ho jaata tha.

2. **Fix Mechanism (Standard Browser Session Model):**
   - **`sessionStorage` (Tab-Scoped)**:
     - Page refresh karne par `sessionStorage` **survive karta hai** (user login rehta hai).
     - Tab band karne par ya browser close karne par browser khud `sessionStorage` ko **100% delete/clear** kar deta hai.
   - **`localStorage` Cleaning**:
     - `localStorage` se persistent login session keys (`rankly_remembered_session`, `rankly_session`, `user`) ko remove karenge.
   - **Backend Cookie Transient Lifespan**:
     - Cookies ko browser-session-only banayenge (`expires: false`, no persistent 7-day maxAge).
   - **Client App Startup**:
     - Jab page load hoga, agar `sessionStorage` me active session hai (jaise ki Refresh ke time), tabhi user dashboard me rahega. Agar `sessionStorage` khali hai (naya tab / browser reopen), toh directly **Login Page** aayega.

---

## 👥 3. Divided Tripartite Ownership

| Lead | Target Files | Task Description |
| :--- | :--- | :--- |
| **Mayur (Backend Architect)** | `server.js`, `src/controllers/authController.js` | Express session cookies ko browser session mode me configure karna aur `/api/auth/me` ko tab session Bearer token ke sath bind karna. |
| **Sumit (Frontend UI Lead)** | `public/index.html`, `public/index-3.html` | Client login state ko strictly `sessionStorage` par map karna, `localStorage` persistent auto-login ko disable karna, aur 100% byte parity rakhna. |
| **Vaibhav (DB & Infra Lead)** | `src/config/database.js` | Session database tables aur SQLite health check ko steady rakhna. |

---

## 🚦 4. Developer Permission Gate

Aapka plan bilkul ready hai! Jaise hi aap **"Proceed"** ya **"Approved"** ka message denge, hum teenon agents turant code implement karke live verify karenge aur GitHub par push karenge!

