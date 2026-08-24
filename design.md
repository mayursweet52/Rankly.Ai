# 🎨 Design System & UI Specifications – Rankly.ai

**Design Philosophy:** Minimalist, High-Tech, Glassmorphic, and Responsive with distinct Light & Dark Mode identities.

---

## 1. 🌈 Color Palette

### 1.1 Light Theme (Cohere Signature Minimalist)
* **Background Canvas:** `#FAFAF8` / `#F5F5F0` with subtle dot radial grid (`rgba(0, 0, 0, 0.05)`).
* **Card Surface:** `#FFFFFF` with crisp `#E5E5DF` borders and subtle `rgba(0, 0, 0, 0.02)` shadows.
* **Primary Accent:** `#111111` (Matte Charcoal) and `#243E36` (Deep Forest).
* **Brand Coral Accent:** `#D95D39` (Rankly.ai signature coral).
* **Status Badges:**
  * High Fit (80%+): Emerald `#F0FDF4` bg, `#16A34A` text, `#BBF7D0` border.
  * Moderate Fit (65-79%): Blue `#EFF6FF` bg, `#2563EB` text, `#BFDBFE` border.
  * Needs Improvement (<65%): Amber `#FFFBEB` bg, `#D97706` text, `#FDE68A` border.

### 1.2 Dark Theme (Pure Matte Black Obsidian)
* **Background Canvas:** `#0A0A0F` (Deep matte obsidian black, zero harsh blue glow).
* **Card Surface:** `#14141F` with `#1A1A2E` borders and elevated drop shadows (`rgba(0, 0, 0, 0.6)`).
* **Primary Accent:** `#818CF8` (Vibrant Indigo-Violet) and `#A78BFA` (Neon Purple).
* **Floating Glass Pill:** `rgba(18, 22, 36, 0.9)` with `1px solid rgba(255, 255, 255, 0.1)` and `backdrop-filter: blur(20px)`.

---

## 2. 🪨 3D Pebbles Layer (Login Screen)
* Four organic floating pebble gem elements on the Light Mode login screen:
  1. **Matte Grey Pebble:** Smooth deep neutral pebble.
  2. **Coral Terracotta Pebble:** Warm gradient pebble (`#FFA14A` to `#F06A4A`).
  3. **Iridescent Violet Pebble:** Pearlescent multi-chromatic stone (`#B588F7` to `#81E4DA`).
  4. **Sage Stone:** Calm organic green accent.

---

## 3. 🛸 Floating Dock Navigation (Dark Mode)
* **Unified Capsule Container (`.sidebar-dock`):** Single rounded pill capsule (`border-radius: 26px`, `background: rgba(18, 22, 36, 0.9)`, `backdrop-filter: blur(20px)`).
* **Circular Buttons (`.dock-item`):** `44px x 44px` circular items (`border-radius: 50%`).
* **Hover Physics:** `transform: scale(1.14)`, neon glowing purple aura (`box-shadow: 0 0 16px rgba(129, 140, 248, 0.45)`), and side tooltip popup.
* **Seamless Canvas:** Right dividing sidebar border is completely eliminated in Dark Mode for an edge-to-edge floating layout.

---

## 4. 💧 Aceternity Gooey Candidate Search
* **Morphing SVG Filter:** Uses `#aceternity-gooey` (`feGaussianBlur` + `feColorMatrix`) for organic liquid blobs that pulse behind the search bar on hover and focus.
* **Layout:** Centered `540px` pill with dedicated left circular search badge, crisp typography, and dynamic instant-reset clear button (`✕`).
