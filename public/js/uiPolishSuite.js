/**
 * 🎨 Rankly.Ai — UI/UX Polish Technical Specification Suite (Lead: Sumit)
 * --------------------------------------------------------------------------
 * 1. Global Command Search (Cmd+K / Ctrl+K)
 * 2. Undo Toasts (5-Second Revert Window)
 * 3. Empty States Utility
 * 4. Skeleton Loaders Utility
 * 5. Drag-and-Drop File Uploads
 * 6. Form Auto-Save (Draft Recovery)
 * 7. Offline Network Banner
 * 8. Keyboard Focus Rings (:focus-visible)
 * 9. Dark Mode Toggle
 * 10. Fluid Hover & Active States
 * 11. Sticky Navigation Header Enhancements
 * 12. Back-to-Top Action Button
 * 13. Copy-to-Clipboard Buttons
 * 14. Expandable FAQs (Accordion)
 * 15. Scroll Progress Bar
 * 16. Confirmation Modals (Promise-based)
 * 17. Humanized Last Updated Timestamps
 * 18. Floating Support & Feedback Widget
 * 19. Form Success States
 * 20. Helpful Diagnostic Error States
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. GLOBAL COMMAND SEARCH (Cmd+K / Ctrl+K)
  // =========================================================================
  const COMMAND_ITEMS = [
    { icon: 'fa-solid fa-users', title: 'AI Candidate Queue', subtitle: 'View and rank applicants', category: 'Navigation', action: () => window.switchMainTab?.('tab-candidates') || window.location.assign('#candidates') },
    { icon: 'fa-solid fa-file-invoice', title: 'ATS Calibration Studio', subtitle: 'Score resumes against job descriptions', category: 'Navigation', action: () => window.switchMainTab?.('tab-ats') || window.location.assign('#ats') },
    { icon: 'fa-solid fa-calendar-days', title: 'Schedule Interview', subtitle: 'Launch calendar invite generator', category: 'Actions', action: () => window.openInterviewCalendarModal?.() },
    { icon: 'fa-solid fa-microphone', title: 'Voice Interview Simulator', subtitle: 'Practice speech and answer pacing', category: 'Actions', action: () => window.openVoiceInterviewModal?.() },
    { icon: 'fa-solid fa-vial-circle-check', title: 'Technical Assessment Quiz', subtitle: 'Launch 5-minute technical screening', category: 'Actions', action: () => window.openCandidateAssessmentModal?.() },
    { icon: 'fa-solid fa-briefcase', title: 'Job Listings Directory', subtitle: 'Explore open engineering positions', category: 'Navigation', action: () => window.switchMainTab?.('tab-jobs') || window.location.assign('#jobs') },
    { icon: 'fa-solid fa-id-card', title: 'Candidate Profile Hub', subtitle: 'Edit skills and career dossier', category: 'Navigation', action: () => window.switchMainTab?.('tab-profile') || window.location.assign('#profile') },
    { icon: 'fa-solid fa-clock-rotate-left', title: 'HRMS Attendance & Punch', subtitle: 'Clock-in and attendance logs', category: 'HRMS', action: () => window.switchMainTab?.('tab-attendance') || window.location.assign('#attendance') },
    { icon: 'fa-solid fa-file-excel', title: 'Export Candidates Excel', subtitle: 'Download complete talent database', category: 'Exports', action: () => window.location.assign('/api/export/candidates') },
    { icon: 'fa-solid fa-circle-half-stroke', title: 'Toggle Dark / Light Theme', subtitle: 'Switch interface color scheme', category: 'Preferences', action: () => window.toggleDarkMode?.() },
    { icon: 'fa-solid fa-headset', title: 'Open Floating Support', subtitle: 'Quick help, documentation and feedback', category: 'Support', action: () => window.toggleFloatingSupportDrawer?.() }
  ];

  let selectedCommandIndex = 0;
  let filteredCommands = [...COMMAND_ITEMS];

  window.openGlobalCommandPalette = function() {
    const modal = document.getElementById('globalCommandPaletteModal');
    if (!modal) return;
    const input = document.getElementById('commandPaletteInput');
    selectedCommandIndex = 0;
    filteredCommands = [...COMMAND_ITEMS];
    renderCommandPaletteItems();
    modal.style.display = 'flex';
    modal.classList.add('active');
    setTimeout(() => { 
      if (input) { 
        input.value = ''; 
        if (typeof input.focus === 'function') input.focus(); 
      } 
    }, 50);
  };

  window.closeGlobalCommandPalette = function() {
    const modal = document.getElementById('globalCommandPaletteModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  };

  window.filterCommandPalette = function(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      filteredCommands = [...COMMAND_ITEMS];
    } else {
      filteredCommands = COMMAND_ITEMS.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    selectedCommandIndex = 0;
    renderCommandPaletteItems();
  };

  function renderCommandPaletteItems() {
    const container = document.getElementById('commandPaletteResultsContainer');
    if (!container) return;

    if (filteredCommands.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400 dark:text-zinc-500">
          <i class="fa-solid fa-magnifying-glass text-3xl mb-3 opacity-40"></i>
          <p class="text-sm font-medium">No commands or views match your search.</p>
          <p class="text-xs mt-1 text-gray-500 dark:text-zinc-600">Try searching "Interview", "Export", "Quiz", or "Theme"</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredCommands.map((item, idx) => {
      const isSelected = idx === selectedCommandIndex;
      return `
        <div onclick="executeCommandPaletteItem(${idx})" class="command-palette-item px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          isSelected 
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30' 
            : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-zinc-300 border border-transparent'
        }">
          <div class="flex items-center gap-3.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
              isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
            }">
              <i class="${item.icon}"></i>
            </div>
            <div>
              <div class="text-xs font-bold leading-none ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'}">${item.title}</div>
              <div class="text-[11px] text-gray-400 dark:text-zinc-400 mt-1">${item.subtitle}</div>
            </div>
          </div>
          <span class="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">${item.category}</span>
        </div>
      `;
    }).join('');
  }

  window.executeCommandPaletteItem = function(index) {
    const item = filteredCommands[index];
    if (item && typeof item.action === 'function') {
      window.closeGlobalCommandPalette();
      try { item.action(); } catch (e) { console.warn('Command execution notice:', e); }
    }
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K & Escape & Navigation)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      const modal = document.getElementById('globalCommandPaletteModal');
      if (modal && modal.style.display === 'flex') {
        window.closeGlobalCommandPalette();
      } else {
        window.openGlobalCommandPalette();
      }
    } else if (e.key === 'Escape') {
      window.closeGlobalCommandPalette();
      window.closeFloatingSupportDrawer?.();
    } else {
      const modal = document.getElementById('globalCommandPaletteModal');
      if (modal && modal.style.display === 'flex') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (selectedCommandIndex < filteredCommands.length - 1) {
            selectedCommandIndex++;
            renderCommandPaletteItems();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (selectedCommandIndex > 0) {
            selectedCommandIndex--;
            renderCommandPaletteItems();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          window.executeCommandPaletteItem(selectedCommandIndex);
        }
      }
    }
  });


  // =========================================================================
  // 2. UNDO TOASTS (5-Second Revert Window)
  // =========================================================================
  let undoTimeout = null;

  window.showUndoToast = function(message, undoCallback, durationMs = 5000) {
    const container = document.getElementById('undoToastContainer');
    if (!container) return;

    if (undoTimeout) clearTimeout(undoTimeout);

    container.innerHTML = `
      <div id="activeUndoToast" class="bg-zinc-900 dark:bg-black text-white px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center justify-between gap-4 max-w-md w-full animate-bounce-subtle">
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-clock-rotate-left text-emerald-400 text-sm"></i>
          <span class="text-xs font-medium">${message || 'Action performed.'}</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" id="btnExecuteUndo" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer">
            Undo
          </button>
          <button type="button" onclick="dismissUndoToast()" class="text-gray-400 hover:text-white text-xs p-1 cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `;

    container.classList.remove('hidden', 'translate-y-16', 'opacity-0');
    container.classList.add('translate-y-0', 'opacity-100');

    const undoBtn = document.getElementById('btnExecuteUndo');
    if (undoBtn && typeof undoCallback === 'function') {
      undoBtn.onclick = () => {
        try { undoCallback(); } catch(e) {}
        window.dismissUndoToast();
        if (typeof window.showToast === 'function') window.showToast('Action successfully reverted.', 'success');
      };
    }

    undoTimeout = setTimeout(() => {
      window.dismissUndoToast();
    }, durationMs);
  };

  window.dismissUndoToast = function() {
    const container = document.getElementById('undoToastContainer');
    if (container) {
      container.classList.add('translate-y-16', 'opacity-0');
      setTimeout(() => { container.classList.add('hidden'); }, 300);
    }
  };


  // =========================================================================
  // 3. EMPTY STATES UTILITY
  // =========================================================================
  window.renderEmptyState = function(containerId, {
    icon = 'fa-solid fa-folder-open',
    title = 'No Records Found',
    description = 'There are no active items in this view right now.',
    actionText = 'Refresh Data',
    actionCallback = null
  } = {}) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    container.innerHTML = `
      <div class="py-14 px-6 text-center max-w-sm mx-auto animate-fade-in">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl mb-4 border border-gray-200 dark:border-zinc-700/60 shadow-xs">
          <i class="${icon}"></i>
        </div>
        <h3 class="text-base font-bold text-gray-900 dark:text-white tracking-tight">${title}</h3>
        <p class="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed">${description}</p>
        ${actionText ? `
          <button type="button" id="emptyStateActionBtn" class="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-emerald-500/20 cursor-pointer inline-flex items-center gap-2">
            <i class="fa-solid fa-arrow-rotate-right"></i> ${actionText}
          </button>
        ` : ''}
      </div>
    `;

    if (actionCallback) {
      const btn = container.querySelector('#emptyStateActionBtn');
      if (btn) btn.onclick = actionCallback;
    }
  };


  // =========================================================================
  // 4. SKELETON LOADERS UTILITY (Zero-CLS Placeholders)
  // =========================================================================
  window.renderSkeletonCards = function(containerId, count = 3, type = 'candidate') {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    const skeletons = [];
    for (let i = 0; i < count; i++) {
      if (type === 'candidate') {
        skeletons.push(`
          <div class="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-4 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
                <div class="space-y-1.5">
                  <div class="w-32 h-3.5 bg-gray-200 dark:bg-zinc-800 rounded"></div>
                  <div class="w-20 h-2.5 bg-gray-100 dark:bg-zinc-800/60 rounded"></div>
                </div>
              </div>
              <div class="w-14 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <div class="space-y-2">
              <div class="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded"></div>
              <div class="w-3/4 h-2.5 bg-gray-100 dark:bg-zinc-800 rounded"></div>
            </div>
            <div class="flex gap-2 pt-2">
              <div class="w-16 h-5 bg-gray-100 dark:bg-zinc-800 rounded-md"></div>
              <div class="w-20 h-5 bg-gray-100 dark:bg-zinc-800 rounded-md"></div>
            </div>
          </div>
        `);
      } else {
        // Table row skeleton
        skeletons.push(`
          <tr class="animate-pulse border-b border-gray-100 dark:border-zinc-800">
            <td class="py-4 px-4"><div class="w-28 h-3 bg-gray-200 dark:bg-zinc-800 rounded"></div></td>
            <td class="py-4 px-4"><div class="w-36 h-3 bg-gray-100 dark:bg-zinc-800 rounded"></div></td>
            <td class="py-4 px-4"><div class="w-16 h-5 bg-gray-200 dark:bg-zinc-800 rounded-full"></div></td>
            <td class="py-4 px-4"><div class="w-24 h-3 bg-gray-100 dark:bg-zinc-800 rounded"></div></td>
          </tr>
        `);
      }
    }
    container.innerHTML = skeletons.join('');
  };


  // =========================================================================
  // 5. INTERACTIVE DRAG-AND-DROP FILE UPLOADS
  // =========================================================================
  window.initDragAndDropUpload = function(zoneSelector, fileCallback) {
    const zones = document.querySelectorAll(zoneSelector);
    zones.forEach(zone => {
      ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('border-emerald-500', 'bg-emerald-50/40', 'dark:bg-emerald-950/20', 'scale-[1.01]');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('border-emerald-500', 'bg-emerald-50/40', 'dark:bg-emerald-950/20', 'scale-[1.01]');
        }, false);
      });

      zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0 && typeof fileCallback === 'function') {
          fileCallback(files);
        }
      }, false);
    });
  };


  // =========================================================================
  // 6. FORM AUTO-SAVE (LocalStorage Persistence)
  // =========================================================================
  const autoSaveDebounceMap = new Map();

  window.initFormAutoSave = function(formSelector, storageKey) {
    const form = document.querySelector(formSelector);
    if (!form || !storageKey) return;

    // 1. Restore saved values if available
    try {
      const saved = localStorage.getItem(`draft_${storageKey}`);
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(name => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input && input.type !== 'file' && input.type !== 'password') {
            input.value = data[name];
          }
        });
        showDraftIndicator(form, 'Draft restored');
      }
    } catch (e) {}

    // 2. Listen to inputs and save on debounce
    form.addEventListener('input', () => {
      if (autoSaveDebounceMap.has(storageKey)) {
        clearTimeout(autoSaveDebounceMap.get(storageKey));
      }
      autoSaveDebounceMap.set(storageKey, setTimeout(() => {
        const data = {};
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(el => {
          if (el.name && el.type !== 'file' && el.type !== 'password') {
            data[el.name] = el.value;
          }
        });
        try {
          localStorage.setItem(`draft_${storageKey}`, JSON.stringify(data));
          showDraftIndicator(form, 'Saved locally');
        } catch (e) {}
      }, 400));
    });

    // Clear on submit
    form.addEventListener('submit', () => {
      try { localStorage.removeItem(`draft_${storageKey}`); } catch(e) {}
    });
  };

  function showDraftIndicator(form, text) {
    let badge = form.querySelector('.form-draft-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'form-draft-badge text-[10px] font-mono text-emerald-600 dark:text-emerald-400 ml-2 transition-opacity duration-300';
      const heading = form.querySelector('h1, h2, h3, .form-title');
      if (heading) heading.appendChild(badge);
    }
    badge.textContent = `• ${text}`;
    badge.style.opacity = '1';
    setTimeout(() => { if (badge) badge.style.opacity = '0.6'; }, 2000);
  }


  // =========================================================================
  // 7. OFFLINE NETWORK BANNER
  // =========================================================================
  function initOfflineNetworkMonitor() {
    const banner = document.getElementById('offlineNetworkBanner');
    if (!banner) return;

    function updateOnlineStatus() {
      if (!navigator.onLine) {
        banner.classList.remove('hidden', '-translate-y-full');
        banner.classList.add('translate-y-0');
      } else {
        banner.classList.add('-translate-y-full');
        setTimeout(() => { banner.classList.add('hidden'); }, 300);
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }


  // =========================================================================
  // 8. KEYBOARD FOCUS RINGS (:focus-visible styling)
  // =========================================================================
  function initKeyboardFocusRings() {
    const styleEl = document.createElement('style');
    styleEl.id = 'rankly-focus-rings-style';
    styleEl.textContent = `
      :focus-visible {
        outline: 2px solid var(--text-accent, #10B981) !important;
        outline-offset: 2px !important;
        border-radius: 6px !important;
      }
      button:focus:not(:focus-visible), a:focus:not(:focus-visible) {
        outline: none !important;
      }
    `;
    if (!document.getElementById('rankly-focus-rings-style')) {
      document.head.appendChild(styleEl);
    }
  }


  // =========================================================================
  // 9. UNIFIED DARK / LIGHT MODE TOGGLE
  // =========================================================================
  window.initTheme = function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateThemeToggleIcons();
  };

  window.toggleDarkMode = function() {
    const isDark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {}
    updateThemeToggleIcons();
    if (typeof window.showToast === 'function') {
      window.showToast(`${isDark ? 'Dark' : 'Light'} theme activated.`, 'info');
    }
  };

  function updateThemeToggleIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
      icon.className = `theme-toggle-icon fa-solid ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-gray-700'}`;
    });
  }


  // =========================================================================
  // 10 & 11. HOVER STATES & STICKY NAVIGATION HEADER
  // =========================================================================
  function initStickyHeaderShadow() {
    const header = document.querySelector('header, .app-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('shadow-md', 'backdrop-blur-lg');
      } else {
        header.classList.remove('shadow-md');
      }
    }, { passive: true });
  }


  // =========================================================================
  // 12. BACK-TO-TOP ACTION BUTTON
  // =========================================================================
  window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function initBackToTopButton() {
    const btn = document.getElementById('backToTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.classList.remove('opacity-0', 'translate-y-8', 'pointer-events-none');
        btn.classList.add('opacity-100', 'translate-y-0');
      } else {
        btn.classList.remove('opacity-100', 'translate-y-0');
        btn.classList.add('opacity-0', 'translate-y-8', 'pointer-events-none');
      }
    }, { passive: true });
  }


  // =========================================================================
  // 13. COPY-TO-CLIPBOARD BUTTONS
  // =========================================================================
  window.copyTextToClipboard = async function(text, btnElement) {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      if (btnElement) {
        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check text-emerald-500 mr-1"></i> Copied!';
        setTimeout(() => { btnElement.innerHTML = originalHtml; }, 2000);
      }

      if (typeof window.showToast === 'function') {
        window.showToast('Copied to clipboard!', 'success');
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast('Failed to copy to clipboard.', 'error');
      }
    }
  };


  // =========================================================================
  // 14. EXPANDABLE FAQS (Accordion)
  // =========================================================================
  window.toggleFaqAccordion = function(headerBtn) {
    const content = headerBtn.nextElementSibling;
    const chevron = headerBtn.querySelector('.faq-chevron');
    if (!content) return;

    const isExpanded = !content.classList.contains('hidden');
    if (isExpanded) {
      content.classList.add('hidden');
      headerBtn.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
      content.classList.remove('hidden');
      headerBtn.setAttribute('aria-expanded', 'true');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
  };


  // =========================================================================
  // 15. TOP SCROLL PROGRESS BAR
  // =========================================================================
  function initScrollProgressBar() {
    const bar = document.getElementById('scrollProgressBar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
    }, { passive: true });
  }


  // =========================================================================
  // 16. HIGH-RISK ACTION CONFIRMATION MODALS (Promise-based)
  // =========================================================================
  let confirmResolve = null;

  window.showConfirmationModal = function({
    title = 'Confirm Dangerous Action',
    message = 'Are you sure you want to proceed? This action cannot be undone.',
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel',
    isDestructive = true
  } = {}) {
    return new Promise((resolve) => {
      confirmResolve = resolve;
      const modal = document.getElementById('actionConfirmationModal');
      if (!modal) {
        return resolve(confirm(message));
      }

      const titleEl = document.getElementById('confirmModalTitle');
      const msgEl = document.getElementById('confirmModalMessage');
      const confirmBtn = document.getElementById('btnModalConfirm');
      const cancelBtn = document.getElementById('btnModalCancel');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (confirmBtn) {
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
          isDestructive ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
        }`;
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;

      modal.style.display = 'flex';
      modal.classList.add('active');
    });
  };

  window.resolveConfirmationModal = function(result) {
    const modal = document.getElementById('actionConfirmationModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    if (typeof confirmResolve === 'function') {
      confirmResolve(result);
      confirmResolve = null;
    }
  };


  // =========================================================================
  // 17. HUMANIZED LAST UPDATED TIMESTAMPS
  // =========================================================================
  window.formatRelativeTime = function(dateInput) {
    if (!dateInput) return 'Just now';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffSecs = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSecs < 45) return 'Just now';
    if (diffSecs < 90) return '1 minute ago';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} minutes ago`;
    if (diffSecs < 7200) return '1 hour ago';
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
    if (diffSecs < 172800) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };


  // =========================================================================
  // 18. FLOATING SUPPORT & QUICK HELP WIDGET
  // =========================================================================
  window.toggleFloatingSupportDrawer = function() {
    const drawer = document.getElementById('floatingSupportDrawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    if (isHidden) {
      drawer.classList.remove('hidden', 'scale-95', 'opacity-0');
      drawer.classList.add('scale-100', 'opacity-100');
    } else {
      drawer.classList.remove('scale-100', 'opacity-100');
      drawer.classList.add('scale-95', 'opacity-0');
      setTimeout(() => { drawer.classList.add('hidden'); }, 200);
    }
  };

  window.closeFloatingSupportDrawer = function() {
    const drawer = document.getElementById('floatingSupportDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      drawer.classList.remove('scale-100', 'opacity-100');
      drawer.classList.add('scale-95', 'opacity-0');
      setTimeout(() => { drawer.classList.add('hidden'); }, 200);
    }
  };


  // =========================================================================
  // 19. FORM SUCCESS FEEDBACK STATES
  // =========================================================================
  window.showFormSuccessState = function(formOrContainer, {
    title = 'Success!',
    message = 'Your information has been successfully processed and recorded.',
    resetAfterMs = 3000
  } = {}) {
    const el = typeof formOrContainer === 'string' ? document.querySelector(formOrContainer) : formOrContainer;
    if (!el) return;

    const originalDisplay = el.innerHTML;
    el.innerHTML = `
      <div class="py-8 text-center animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl mb-3 animate-bounce-subtle">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h4 class="text-sm font-bold text-gray-900 dark:text-white">${title}</h4>
        <p class="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">${message}</p>
      </div>
    `;

    if (resetAfterMs > 0) {
      setTimeout(() => {
        el.innerHTML = originalDisplay;
      }, resetAfterMs);
    }
  };


  // =========================================================================
  // 20. HELPFUL DIAGNOSTIC ERROR STATES
  // =========================================================================
  window.showHelpfulError = function(containerSelector, {
    errorTitle = 'Operation Notice',
    errorMessage = 'An unexpected error occurred while processing your request.',
    actionText = 'Retry Request',
    retryCallback = null
  } = {}) {
    const container = typeof containerSelector === 'string' ? document.querySelector(containerSelector) : containerSelector;
    if (!container) {
      if (typeof window.showToast === 'function') window.showToast(errorMessage, 'error');
      return;
    }

    container.innerHTML = `
      <div class="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs flex items-start justify-between gap-3 animate-fade-in my-3">
        <div class="flex items-start gap-2.5">
          <i class="fa-solid fa-circle-exclamation text-rose-600 mt-0.5 text-sm"></i>
          <div>
            <div class="font-bold text-rose-800 dark:text-rose-300">${errorTitle}</div>
            <div class="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">${errorMessage}</div>
          </div>
        </div>
        ${retryCallback ? `
          <button type="button" id="btnHelpfulErrorRetry" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-all cursor-pointer whitespace-nowrap">
            ${actionText}
          </button>
        ` : ''}
      </div>
    `;

    if (retryCallback) {
      const btn = container.querySelector('#btnHelpfulErrorRetry');
      if (btn) btn.onclick = retryCallback;
    }
  };


  // =========================================================================
  // AUTO-INITIALIZE ON DOM READY
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initOfflineNetworkMonitor();
    initKeyboardFocusRings();
    initStickyHeaderShadow();
    initBackToTopButton();
    initScrollProgressBar();
    window.initDragAndDropUpload?.('.drag-drop-zone', (files) => {
      if (typeof window.handleFiles === 'function') window.handleFiles(files);
    });
  });

})();

// ─── 21. MODERN CUSTOM SELECT INITIALIZER (OS Default Override) ───
document.addEventListener('DOMContentLoaded', () => {
    function initCustomSelect(selectElement) {
        if (selectElement.hasAttribute('data-custom-select-init')) return;
        selectElement.setAttribute('data-custom-select-init', 'true');

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        selectElement.parentNode.insertBefore(wrapper, selectElement);
        wrapper.appendChild(selectElement);

        const trigger = document.createElement('div');
        trigger.className = selectElement.className + ' custom-select-trigger';
        trigger.textContent = selectElement.options[selectElement.selectedIndex]?.textContent || 'Select...';
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options custom-scrollbar';

        Array.from(selectElement.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-select-option';
            if (index === selectElement.selectedIndex) optDiv.classList.add('selected');
            optDiv.textContent = option.textContent;
            optDiv.setAttribute('data-value', option.value);

            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectElement.selectedIndex = index;
                trigger.textContent = option.textContent;
                
                Array.from(optionsContainer.children).forEach(c => c.classList.remove('selected'));
                optDiv.classList.add('selected');
                
                wrapper.classList.remove('open');
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            });
            optionsContainer.appendChild(optDiv);
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    }

    document.querySelectorAll('select.form-input').forEach(initCustomSelect);

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'SELECT' && node.classList.contains('form-input')) {
                        initCustomSelect(node);
                    }
                    node.querySelectorAll?.('select.form-input').forEach(initCustomSelect);
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
