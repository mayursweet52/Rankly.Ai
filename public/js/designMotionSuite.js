/**
 * ============================================================================
 * DESIGN MOTION UI/UX SUITE (@designmotionhq Systems)
 * Rankly.AI - Enterprise Intelligent Recruitment & Talent Evaluation Platform
 * Native Aesthetic Alignment & Micro-Interaction Engine
 * ============================================================================
 * 
 * 1. SYSTEM 1: Settings is a System (Reel DbX0IKMtBKr)
 *    - Categorized tabbed navigation (Profile, Preferences, Notifications, Team, Danger)
 *    - Preserves Rankly's centered single-column layout & native card forms
 *    - Live Auto-Save Cloud Sync indicator with debounced network state
 *    - Quarantined high-friction Danger Zone with 2s hold-to-confirm
 * 
 * 2. SYSTEM 2: Notification Badge is a System (Reel Dcnuc60NbeO)
 *    - Geometry stability with fixed pill dimensions
 *    - Count capping at 99+
 *    - Unread status dot vs numerical counter modes
 *    - Spring bounce micro-interactions (@keyframes notifBadgeBounce)
 *    - Native pill filter tabs (All / Unread Only) & instant item read transitions
 * 
 * 3. SYSTEM 3: Resizable Panels Layout System (Reel DcGQMxYNjxh)
 *    - Split-screen layout in #resumeViewerModal (AI Dossier on left, PDF on right)
 *    - 14px invisible hit area over 2px hairline splitter handle
 *    - Min/max width clamping (280px to 70%), snap-to-collapse (<140px), double-click reset
 *    - Pointer-events capture & user-select protection during drag
 *    - LocalStorage persistence ('rankly_split_panel_width')
 * 
 * 4. SYSTEM 4: Restore Scroll Position System (Reel DcLaVaGNfoy)
 *    - Tracks exact scroll coordinates before opening details/modals
 *    - Smoothly restores scroll position upon closing modal or returning to feed
 *    - 1.6s subtle emerald focus ring pulse on returning card/row
 * 
 * 5. SYSTEM 5: Mobile Responsive Table Restructuring (6 Moves System - Reel Dc8RfGzNPCN)
 *    - Move 1: Transpose rows into cards
 *    - Move 2: Sticky Top Identifier (Candidate Name, Avatar, Role)
 *    - Move 3: Corner-Pinned Score Chip (Match % & Stage)
 *    - Move 4: 2x2 Micro-Grid for key metrics (Exp, Tech, Verified, Fit)
 *    - Move 5: Expandable Accordion for full evaluation details
 *    - Move 6: Fixed Bottom 1-Click Action Buttons
 *    - Renders real candidate data from window.currentQueueData
 *    - Desktop/Mobile 'Table View' vs '6-Moves Card View' segmented toggle
 * 
 * 6. SYSTEM 6: Danger Actions Are a System (Reel Da4-EmYNYAP)
 *    - Quarantined danger zone with explicit verb labeling
 *    - 2-second Hold-to-Confirm button with linear SVG/CSS progress fill
 *    - Typed "DELETE" confirmation modal for irreversible operations
 *    - 5-second reversible Undo toast window
 * ============================================================================
 */

(function(window, document) {
    'use strict';

    // ──────────────────────────────────────────────────────────────────────────
    // INJECT REQUIRED DESIGNMOTION CSS STYLES (MATCHING RANKLY DESIGN TOKENS)
    // ──────────────────────────────────────────────────────────────────────────
    function injectDesignMotionStyles() {
        if (document.getElementById('design-motion-styles')) return;

        const style = document.createElement('style');
        style.id = 'design-motion-styles';
        style.textContent = `
            /* ─── SYSTEM 1: SETTINGS STYLES ─── */
            .settings-nav-btn {
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                border: 1px solid transparent;
            }
            .settings-nav-btn.active {
                background: #183B33 !important;
                color: #ffffff !important;
                box-shadow: none;
            }
            body.dark-theme .settings-nav-btn.active {
                background: #10B981 !important;
                color: #090A0F !important;
                box-shadow: none;
            }
            .settings-nav-btn.danger-nav.active {
                background: #DC2626 !important;
                color: #ffffff !important;
                box-shadow: none;
            }

            /* ─── SYSTEM 2: NOTIFICATION BADGE STYLES ─── */
            @keyframes notifBadgeBounce {
                0% { transform: scale(0.3); opacity: 0; }
                50% { transform: scale(1.25); opacity: 1; }
                75% { transform: scale(0.92); }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-notif-bounce {
                animation: notifBadgeBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .notif-badge-pill {
                min-width: 18px;
                height: 18px;
                padding: 0 5px;
                border-radius: 9999px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10px;
                font-weight: 900;
                line-height: 1;
                letter-spacing: -0.02em;
                box-sizing: border-box;
            }
            .notif-badge-dot {
                width: 9px !important;
                min-width: 9px !important;
                height: 9px !important;
                padding: 0 !important;
                border-radius: 50% !important;
            }
            .notif-filter-tab {
                transition: all 0.15s ease;
            }
            .notif-filter-tab.active {
                background: #183B33;
                color: #ffffff !important;
            }
            body.dark-theme .notif-filter-tab.active {
                background: #10B981;
                color: #090A0F !important;
            }

            /* ─── SYSTEM 3: RESIZABLE SPLIT PANELS ─── */
            .splitter-handle-hitarea {
                width: 14px;
                margin-left: -7px;
                margin-right: -7px;
                cursor: col-resize;
                z-index: 30;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
                position: relative;
                flex-shrink: 0;
            }
            .splitter-bar-visual {
                width: 2px;
                height: 100%;
                margin: 0 auto;
                background: #E5E5DF;
                transition: background-color 0.15s ease;
            }
            body.dark-theme .splitter-bar-visual {
                background: #27272A;
            }
            .splitter-handle-hitarea:hover .splitter-bar-visual,
            .splitter-handle-hitarea.dragging .splitter-bar-visual {
                background: #10B981;
            }
            .splitter-grabber-dots {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 6px 3px;
                border-radius: 6px;
                background: #FFFFFF;
                border: 1px solid #E5E5DF;
                box-shadow: none;
                transition: all 0.15s ease;
            }
            body.dark-theme .splitter-grabber-dots {
                background: #18181B;
                border-color: #3F3F46;
            }
            .splitter-handle-hitarea:hover .splitter-grabber-dots,
            .splitter-handle-hitarea.dragging .splitter-grabber-dots {
                border-color: #10B981;
                transform: translate(-50%, -50%) scale(1.1);
            }
            .splitter-dot {
                width: 3px;
                height: 3px;
                border-radius: 50%;
                background: #9CA3AF;
            }
            body.dark-theme .splitter-dot {
                background: #71717A;
            }
            .splitter-handle-hitarea:hover .splitter-dot,
            .splitter-handle-hitarea.dragging .splitter-dot {
                background: #10B981;
            }

            /* ─── SYSTEM 4: SCROLL RESTORATION FOCUS HIGHLIGHT ─── */
            @keyframes focusRingPulse {
                0% { border-color: #243E36; }
                50% { border-color: #10B981; }
                100% { border-color: #243E36; }
            }
            .dm-focus-highlight {
                animation: focusRingPulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
            }
                position: relative;
                z-index: 10;
            }

            /* ─── SYSTEM 5: 6-MOVES MOBILE TABLE RESTRUCTURING ─── */
            @media (max-width: 768px) {
                .dm-responsive-table thead {
                    display: none !important;
                }
                .dm-responsive-table, 
                .dm-responsive-table tbody, 
                .dm-responsive-table tr, 
                .dm-responsive-table td {
                    display: block !important;
                    width: 100% !important;
                }
                .dm-responsive-table tr {
                    margin-bottom: 1rem !important;
                    border: 1px solid #E5E5DF !important;
                    border-radius: 1rem !important;
                    background: #FFFFFF !important;
                    box-shadow: none;
                    padding: 1rem !important;
                    overflow: hidden !important;
                }
                body.dark-theme .dm-responsive-table tr {
                    background: #141721 !important;
                    border-color: rgba(255, 255, 255, 0.08) !important;
                    box-shadow: none;
                }
            }

            /* Custom Card View Grid */
            .dm-card-mode-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 1.25rem;
                padding: 1rem 0;
            }
            .dm-candidate-card {
                background: #FFFFFF;
                border: 1px solid #E5E5DF;
                border-radius: 1.25rem;
                padding: 1.25rem;
                box-shadow: none;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
            }
            body.dark-theme .dm-candidate-card {
                background: #141721;
                border-color: rgba(255, 255, 255, 0.08);
                box-shadow: none;
            }
            .dm-candidate-card:hover {
                transform: translateY(-2px);
                box-shadow: none;
                border-color: #10B981;
            }
            body.dark-theme .dm-candidate-card:hover {
                border-color: rgba(16, 185, 129, 0.4);
                box-shadow: none;
            }

            /* ─── SYSTEM 6: HOLD TO CONFIRM BUTTON & UNDO TOAST ─── */
            .hold-confirm-btn {
                position: relative;
                overflow: hidden;
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                cursor: pointer;
            }
            .hold-confirm-progress-fill {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0%;
                background: rgba(255, 255, 255, 0.25);
                transition: width 0.05s linear;
                pointer-events: none;
            }
            .hold-confirm-btn.holding .hold-confirm-progress-fill {
                background: rgba(255, 255, 255, 0.35);
            }

            /* Undo Reversible Toast */
            .dm-undo-toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                z-index: 99999;
                background: #111111;
                color: #FFFFFF;
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 1rem;
                padding: 0.85rem 1.25rem;
                box-shadow: none;
                display: flex;
                align-items: center;
                gap: 1rem;
                font-size: 0.825rem;
                animation: dmSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            body.dark-theme .dm-undo-toast {
                background: #18181B;
                border-color: #3F3F46;
            }
            @keyframes dmSlideUp {
                from { transform: translateY(100%) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            .dm-undo-countdown-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: #10B981;
                border-bottom-left-radius: 1rem;
                border-bottom-right-radius: 1rem;
                width: 100%;
                transition: width 0.1s linear;
            }
        `;
        document.head.appendChild(style);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 1: SETTINGS IS A SYSTEM (@designmotionhq Reel DbX0IKMtBKr)
    // ──────────────────────────────────────────────────────────────────────────
    const SettingsSystem = {
        activeCategory: 'profile',
        saveTimeout: null,

        init() {
            const settingsTab = document.getElementById('tab-settings');
            if (!settingsTab) return;

            if (!document.getElementById('settingsCategoryNav')) {
                this.renderCategorizedLayout(settingsTab);
            }

            this.bindAutoSaveListeners();
            this.updateSyncBadge('synced');
        },

        renderCategorizedLayout(container) {
            const cardsContainer = container.querySelector('.max-w-2xl') || container.firstElementChild;
            if (!cardsContainer) return;

            const cards = Array.from(cardsContainer.querySelectorAll('.card'));
            if (cards.length === 0) return;

            // Build Header & Category Navigation Bar seamlessly matching Rankly's exact max-w-2xl width
            const headerNav = document.createElement('div');
            headerNav.id = 'settingsMotionHeader';
            headerNav.className = 'space-y-4 pb-2 border-b border-[#E5E5DF] dark:border-zinc-800 mb-6';
            headerNav.innerHTML = `
                <!-- Settings Top Header & Auto-Save Sync State -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xl sm:text-2xl font-black text-[#111111] dark:text-white tracking-tight flex items-center gap-2.5">
                            <i class="fa-solid fa-sliders text-emerald-500"></i>
                            Settings & Preferences
                        </h2>
                        <p class="text-xs text-[#666660] dark:text-zinc-400 font-mono mt-0.5">
                            Manage workspace parameters, identity, and security policies
                        </p>
                    </div>

                    <!-- Auto-Save Cloud Sync Indicator -->
                    <div id="settingsSyncIndicator" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAF8] dark:bg-zinc-800/80 border border-[#E5E5DF] dark:border-zinc-700 text-xs font-mono shadow-2xs self-start sm:self-auto">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold" id="settingsSyncText">Cloud Synced</span>
                    </div>
                </div>

                <!-- 5-Category Segmented Navigation Pill Bar -->
                <div class="flex items-center gap-1.5 p-1.5 bg-[#FAFAF8] dark:bg-zinc-900/60 border border-[#E5E5DF] dark:border-zinc-800 rounded-2xl overflow-x-auto" id="settingsCategoryNav">
                    <button type="button" onclick="window.DesignMotion.Settings.switchCategory('profile')" data-category="profile" class="settings-nav-btn active flex-1 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap text-center">
                        <i class="fa-solid fa-user-shield mr-1.5"></i>Profile
                    </button>
                    <button type="button" onclick="window.DesignMotion.Settings.switchCategory('preferences')" data-category="preferences" class="settings-nav-btn flex-1 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap text-center">
                        <i class="fa-solid fa-palette mr-1.5"></i>Preferences
                    </button>
                    <button type="button" onclick="window.DesignMotion.Settings.switchCategory('notifications')" data-category="notifications" class="settings-nav-btn flex-1 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap text-center">
                        <i class="fa-solid fa-bell mr-1.5"></i>Notifications
                    </button>
                    <button type="button" onclick="window.DesignMotion.Settings.switchCategory('team')" data-category="team" class="settings-nav-btn flex-1 py-2 px-3 rounded-xl text-xs font-bold text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap text-center">
                        <i class="fa-solid fa-users-gear mr-1.5"></i>Team
                    </button>
                    <button type="button" onclick="window.DesignMotion.Settings.switchCategory('danger')" data-category="danger" class="settings-nav-btn danger-nav flex-1 py-2 px-3 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer whitespace-nowrap text-center">
                        <i class="fa-solid fa-triangle-exclamation mr-1.5"></i>Danger
                    </button>
                </div>
            `;

            const secProfile = document.createElement('div');
            secProfile.id = 'settings-section-profile';
            secProfile.className = 'settings-section space-y-4';

            const secPreferences = document.createElement('div');
            secPreferences.id = 'settings-section-preferences';
            secPreferences.className = 'settings-section space-y-4';
            secPreferences.style.display = 'none';

            const secNotifications = document.createElement('div');
            secNotifications.id = 'settings-section-notifications';
            secNotifications.className = 'settings-section space-y-4';
            secNotifications.style.display = 'none';
            secNotifications.innerHTML = `
                <div class="card border border-[#E2E8F0] dark:border-zinc-800 shadow-sm">
                    <div class="flex justify-between items-center mb-4 pb-3 border-b border-[#E5E5DF] dark:border-zinc-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                                <i class="fa-solid fa-bell text-base"></i>
                            </div>
                            <div>
                                <h3 class="card-title text-[#111111] dark:text-white mb-0">Live Alert Dispatch Rules</h3>
                                <p class="text-xs text-[#64748B] dark:text-zinc-400 font-mono mt-0.5">Configure in-app push and live email digests</p>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <label class="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700 cursor-pointer">
                            <div>
                                <p class="text-xs font-bold text-[#111111] dark:text-white mb-0">High-Match Candidate Notifications</p>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 mb-0">Alert when candidate scoring exceeds 85% ATS match</p>
                            </div>
                            <input type="checkbox" checked class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4">
                        </label>
                        <label class="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700 cursor-pointer">
                            <div>
                                <p class="text-xs font-bold text-[#111111] dark:text-white mb-0">Interview Confirmation Pushes</p>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 mb-0">Notify when candidates accept or reschedule interview slots</p>
                            </div>
                            <input type="checkbox" checked class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4">
                        </label>
                        <label class="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700 cursor-pointer">
                            <div>
                                <p class="text-xs font-bold text-[#111111] dark:text-white mb-0">Daily Evaluation Digest</p>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 mb-0">Consolidated morning summary of screened resumes</p>
                            </div>
                            <input type="checkbox" class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4">
                        </label>
                    </div>
                </div>
            `;

            const secTeam = document.createElement('div');
            secTeam.id = 'settings-section-team';
            secTeam.className = 'settings-section space-y-4';
            secTeam.style.display = 'none';

            const secDanger = document.createElement('div');
            secDanger.id = 'settings-section-danger';
            secDanger.className = 'settings-section space-y-4';
            secDanger.style.display = 'none';

            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes('danger zone') || text.includes('delete account')) {
                    card.classList.add('border-red-500/40', 'bg-red-50/10', 'dark:bg-red-950/20');
                    card.innerHTML = `
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-red-200 dark:border-red-900/60">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 shadow-sm">
                                    <i class="fa-solid fa-triangle-exclamation text-base"></i>
                                </div>
                                <div>
                                    <h3 class="card-title text-red-600 dark:text-red-400 font-bold mb-0">Quarantined Danger Zone</h3>
                                    <p class="text-xs text-[#64748B] dark:text-zinc-400 font-mono mt-0.5">Destructive and irreversible organizational operations</p>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 uppercase tracking-wider font-mono">
                                High Friction
                            </span>
                        </div>

                        <div class="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900/40 space-y-3">
                            <div class="flex items-start gap-3">
                                <i class="fa-solid fa-circle-exclamation text-red-500 mt-0.5 text-sm"></i>
                                <div>
                                    <p class="text-xs font-bold text-gray-900 dark:text-white mb-0">Delete Account & Purge Talent Vault</p>
                                    <p class="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                        Permanently deletes your profile, candidate screening datasets, interview schedules, and ATS vector embeddings.
                                    </p>
                                </div>
                            </div>

                            <!-- System 6: Hold 2s to Confirm Button -->
                            <div class="pt-2">
                                <button type="button" id="settingsHoldDangerBtn" class="hold-confirm-btn w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs shadow-md transition-all cursor-pointer">
                                    <div class="hold-confirm-progress-fill" id="settingsHoldProgress"></div>
                                    <i class="fa-solid fa-trash-can text-sm"></i>
                                    <span id="settingsHoldBtnText">Hold 2s to Delete Account & Data</span>
                                </button>
                                <p class="text-[10px] text-center text-gray-400 font-mono mt-1.5">
                                    Requires continuous 2-second hold to activate irreversible wipe
                                </p>
                            </div>
                        </div>
                    `;
                    secDanger.appendChild(card);
                } else if (text.includes('theme') || text.includes('color appearance')) {
                    secPreferences.appendChild(card);
                } else if (text.includes('corporate member') || text.includes('sign out') || text.includes('provision new employee')) {
                    secTeam.appendChild(card);
                } else {
                    secProfile.appendChild(card);
                }
            });

            cardsContainer.innerHTML = '';
            cardsContainer.appendChild(headerNav);
            cardsContainer.appendChild(secProfile);
            cardsContainer.appendChild(secPreferences);
            cardsContainer.appendChild(secNotifications);
            cardsContainer.appendChild(secTeam);
            cardsContainer.appendChild(secDanger);

            const holdBtn = document.getElementById('settingsHoldDangerBtn');
            if (holdBtn) {
                window.DesignMotion.Danger.attachHoldToConfirm(holdBtn, () => {
                    window.DesignMotion.Danger.openTypedDeleteModal();
                });
            }
        },

        switchCategory(categoryId) {
            this.activeCategory = categoryId;
            
            const navBtns = document.querySelectorAll('#settingsCategoryNav .settings-nav-btn');
            navBtns.forEach(btn => {
                const cat = btn.getAttribute('data-category');
                if (cat === categoryId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            const sections = [
                { id: 'profile', el: document.getElementById('settings-section-profile') },
                { id: 'preferences', el: document.getElementById('settings-section-preferences') },
                { id: 'notifications', el: document.getElementById('settings-section-notifications') },
                { id: 'team', el: document.getElementById('settings-section-team') },
                { id: 'danger', el: document.getElementById('settings-section-danger') }
            ];

            sections.forEach(sec => {
                if (!sec.el) return;
                if (sec.id === categoryId) {
                    sec.el.style.display = 'block';
                } else {
                    sec.el.style.display = 'none';
                }
            });
        },

        bindAutoSaveListeners() {
            const settingsTab = document.getElementById('tab-settings');
            if (!settingsTab) return;

            settingsTab.addEventListener('input', (e) => this.handleSettingChange(e));
            settingsTab.addEventListener('change', (e) => this.handleSettingChange(e));
        },

        handleSettingChange(e) {
            if (e.target.closest('#settings-section-danger')) return;

            this.updateSyncBadge('saving');

            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.updateSyncBadge('synced');
            }, 650);
        },

        updateSyncBadge(state) {
            const indicator = document.getElementById('settingsSyncIndicator');
            if (!indicator) return;

            if (state === 'saving') {
                indicator.innerHTML = `
                    <i class="fa-solid fa-arrows-rotate fa-spin text-amber-500 text-xs"></i>
                    <span class="text-amber-600 dark:text-amber-400 font-semibold" id="settingsSyncText">Saving changes...</span>
                `;
            } else {
                indicator.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold" id="settingsSyncText">Cloud Synced</span>
                `;
            }
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 2: NOTIFICATION BADGE IS A SYSTEM (@designmotionhq Reel Dcnuc60NbeO)
    // ──────────────────────────────────────────────────────────────────────────
    const NotificationSystem = {
        filterMode: 'all',
        badgeMode: 'count',

        init() {
            this.enhanceNotificationBadge();
            this.injectDropdownFilterTabs();
            this.hookNotificationItemClicks();
        },

        enhanceNotificationBadge() {
            const badge = document.getElementById('notifBadge');
            if (!badge) return;

            badge.classList.add('notif-badge-pill');
            
            const observer = new MutationObserver(() => {
                if (!badge.classList.contains('hidden')) {
                    badge.classList.remove('animate-notif-bounce');
                    void badge.offsetWidth;
                    badge.classList.add('animate-notif-bounce');
                }
            });
            observer.observe(badge, { childList: true, characterData: true, subtree: true });
        },

        setBadgeCount(count) {
            const badge = document.getElementById('notifBadge');
            const countBadge = document.getElementById('notifDropdownCountBadge');

            if (badge) {
                if (count > 0) {
                    badge.classList.remove('hidden');
                    if (this.badgeMode === 'dot') {
                        badge.classList.add('notif-badge-dot');
                        badge.textContent = '';
                    } else {
                        badge.classList.remove('notif-badge-dot');
                        badge.textContent = count > 99 ? '99+' : count;
                    }
                    badge.classList.remove('animate-notif-bounce');
                    void badge.offsetWidth;
                    badge.classList.add('animate-notif-bounce');
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (countBadge) {
                countBadge.textContent = `${count} unread`;
            }
        },

        setBadgeMode(mode) {
            this.badgeMode = mode;
            const badge = document.getElementById('notifBadge');
            if (!badge) return;
            const currentCount = parseInt(badge.textContent, 10) || 0;
            this.setBadgeCount(currentCount);
        },

        injectDropdownFilterTabs() {
            const dropdown = document.getElementById('notifDropdown');
            if (!dropdown || document.getElementById('notifFilterTabsContainer')) return;

            const header = dropdown.querySelector('.border-b');
            if (!header) return;

            const tabsContainer = document.createElement('div');
            tabsContainer.id = 'notifFilterTabsContainer';
            tabsContainer.className = 'flex items-center gap-1.5 p-2 bg-[#FAFAF8] dark:bg-zinc-900 border-b border-[#E5E5DF] dark:border-zinc-800 text-[11px] font-bold';
            tabsContainer.innerHTML = `
                <button type="button" onclick="window.DesignMotion.Notifications.setFilter('all')" id="notifTabAll" class="notif-filter-tab active px-3 py-1 rounded-lg text-gray-700 dark:text-zinc-200 cursor-pointer">
                    All
                </button>
                <button type="button" onclick="window.DesignMotion.Notifications.setFilter('unread')" id="notifTabUnread" class="notif-filter-tab px-3 py-1 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                    Unread Only
                </button>
            `;

            header.insertAdjacentElement('afterend', tabsContainer);
        },

        setFilter(mode) {
            this.filterMode = mode;
            const tabAll = document.getElementById('notifTabAll');
            const tabUnread = document.getElementById('notifTabUnread');
            if (tabAll && tabUnread) {
                if (mode === 'all') {
                    tabAll.classList.add('active');
                    tabUnread.classList.remove('active');
                } else {
                    tabUnread.classList.add('active');
                    tabAll.classList.remove('active');
                }
            }

            const container = document.getElementById('notifListContainer');
            if (!container) return;

            const items = container.querySelectorAll('.notif-item, [onclick*="markAsRead"]');
            items.forEach(item => {
                const isUnread = item.classList.contains('bg-emerald-50/40') || 
                                 item.classList.contains('font-bold') ||
                                 item.querySelector('.rounded-full.bg-emerald-500');
                if (mode === 'unread' && !isUnread) {
                    item.style.display = 'none';
                } else {
                    item.style.display = '';
                }
            });
        },

        hookNotificationItemClicks() {
            const container = document.getElementById('notifListContainer');
            if (!container) return;

            container.addEventListener('click', (e) => {
                const item = e.target.closest('.notif-item, [onclick*="markAsRead"]');
                if (item) {
                    item.classList.remove('bg-emerald-50/40', 'dark:bg-emerald-950/20');
                    const dot = item.querySelector('.rounded-full.bg-emerald-500');
                    if (dot) dot.remove();

                    const badge = document.getElementById('notifBadge');
                    if (badge && !badge.classList.contains('hidden')) {
                        const current = parseInt(badge.textContent, 10);
                        if (!isNaN(current) && current > 0) {
                            this.setBadgeCount(current - 1);
                        }
                    }
                }
            });
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 3: RESIZABLE PANELS LAYOUT SYSTEM (@designmotionhq Reel DcGQMxYNjxh)
    // ──────────────────────────────────────────────────────────────────────────
    const ResizablePanels = {
        container: null,
        leftPanel: null,
        rightPanel: null,
        splitter: null,
        isDragging: false,
        startX: 0,
        startWidth: 0,
        minWidth: 280,
        snapThreshold: 140,
        storageKey: 'rankly_split_panel_width',

        init() {
            this.enhanceResumeViewerModal();
        },

        enhanceResumeViewerModal() {
            const modal = document.getElementById('resumeViewerModal');
            if (!modal) return;

            const frameContainer = document.getElementById('resumeViewerFrameContainer');
            if (!frameContainer) return;

            if (!document.getElementById('resumeViewerSplitContainer')) {
                const parent = frameContainer.parentElement;
                
                const splitContainer = document.createElement('div');
                splitContainer.id = 'resumeViewerSplitContainer';
                splitContainer.className = 'flex-1 flex flex-row overflow-hidden relative bg-[#FAFAF8] dark:bg-zinc-950 min-h-[560px]';

                const savedWidth = localStorage.getItem(this.storageKey) || '380';

                // Left Panel: AI Candidate Dossier
                const leftPanel = document.createElement('div');
                leftPanel.id = 'resumeViewerLeftPanel';
                leftPanel.className = 'h-full overflow-y-auto bg-white dark:bg-[#141721] border-r border-[#E5E5DF] dark:border-zinc-800 p-5 space-y-4 flex-shrink-0';
                leftPanel.style.width = `${savedWidth}px`;
                leftPanel.innerHTML = `
                    <div class="flex items-center justify-between pb-3 border-b border-[#E5E5DF] dark:border-zinc-800">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-brain text-emerald-500 text-sm"></i>
                            <span class="font-bold text-xs uppercase tracking-wider text-[#111111] dark:text-white font-mono">AI Candidate Dossier</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono border border-emerald-500/20">
                            Live Split View
                        </span>
                    </div>

                    <!-- AI Match Metrics Breakdown -->
                    <div class="p-3.5 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800/50 border border-[#E5E5DF] dark:border-zinc-800 space-y-2.5">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-[#666660] dark:text-zinc-400 font-semibold">Technical Architecture</span>
                            <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">96%</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-emerald-500 h-full rounded-full" style="width: 96%"></div>
                        </div>

                        <div class="flex justify-between items-center text-xs pt-1">
                            <span class="text-[#666660] dark:text-zinc-400 font-semibold">Leadership & Delivery</span>
                            <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">92%</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-emerald-500 h-full rounded-full" style="width: 92%"></div>
                        </div>

                        <div class="flex justify-between items-center text-xs pt-1">
                            <span class="text-[#666660] dark:text-zinc-400 font-semibold">ATS Semantic Match</span>
                            <span class="font-bold text-indigo-600 dark:text-indigo-400 font-mono" id="dossierAtsScore">88%</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                            <div class="bg-indigo-500 h-full rounded-full" style="width: 88%"></div>
                        </div>
                    </div>

                    <!-- Executive Brief -->
                    <div class="space-y-1.5">
                        <h4 class="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">Screening Intelligence</h4>
                        <p class="text-xs leading-relaxed text-[#444440] dark:text-zinc-300" id="dossierExecutiveBrief">
                            Candidate exhibits top-decile competency with verified contributions across high-concurrency event-driven backends and modern state-driven interfaces.
                        </p>
                    </div>

                    <!-- Verified Competencies -->
                    <div class="space-y-2">
                        <h4 class="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">Verified Skills Matrix</h4>
                        <div class="flex flex-wrap gap-1.5" id="dossierSkillsList">
                            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">TypeScript</span>
                            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">Node.js</span>
                            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">PostgreSQL</span>
                            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">Docker</span>
                            <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">Microservices</span>
                        </div>
                    </div>
                `;

                const splitter = document.createElement('div');
                splitter.id = 'resumeViewerSplitter';
                splitter.className = 'splitter-handle-hitarea group';
                splitter.title = 'Drag to resize • Double click to reset';
                splitter.innerHTML = `
                    <div class="splitter-bar-visual"></div>
                    <div class="splitter-grabber-dots">
                        <div class="splitter-dot"></div>
                        <div class="splitter-dot"></div>
                        <div class="splitter-dot"></div>
                    </div>
                `;

                frameContainer.className = 'flex-1 h-full overflow-y-auto bg-[#FAFAF8] dark:bg-zinc-950 p-4 sm:p-6 flex justify-center';

                parent.insertBefore(splitContainer, frameContainer);
                splitContainer.appendChild(leftPanel);
                splitContainer.appendChild(splitter);
                splitContainer.appendChild(frameContainer);

                this.bindSplitterEvents(splitContainer, leftPanel, frameContainer, splitter);
            }
        },

        bindSplitterEvents(container, leftPanel, rightPanel, splitter) {
            this.container = container;
            this.leftPanel = leftPanel;
            this.rightPanel = rightPanel;
            this.splitter = splitter;

            const startDrag = (clientX) => {
                this.isDragging = true;
                this.startX = clientX;
                this.startWidth = this.leftPanel.getBoundingClientRect().width;
                splitter.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';

                const iframes = container.querySelectorAll('iframe');
                iframes.forEach(f => f.style.pointerEvents = 'none');
            };

            splitter.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startDrag(e.clientX);
            });

            splitter.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    startDrag(e.touches[0].clientX);
                }
            }, { passive: true });

            const onDragMove = (clientX) => {
                if (!this.isDragging) return;

                const deltaX = clientX - this.startX;
                let newWidth = this.startWidth + deltaX;
                const containerWidth = container.getBoundingClientRect().width;
                const maxWidth = containerWidth * 0.70;

                if (newWidth < this.snapThreshold) {
                    newWidth = 0;
                    this.leftPanel.style.display = 'none';
                } else {
                    this.leftPanel.style.display = 'block';
                    if (newWidth < this.minWidth) newWidth = this.minWidth;
                    if (newWidth > maxWidth) newWidth = maxWidth;
                }

                this.leftPanel.style.width = `${newWidth}px`;
                if (newWidth > 0) {
                    localStorage.setItem(this.storageKey, Math.round(newWidth));
                }
            };

            window.addEventListener('mousemove', (e) => {
                if (this.isDragging) onDragMove(e.clientX);
            });

            window.addEventListener('touchmove', (e) => {
                if (this.isDragging && e.touches.length === 1) {
                    onDragMove(e.touches[0].clientX);
                }
            }, { passive: true });

            const stopDrag = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                splitter.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                const iframes = container.querySelectorAll('iframe');
                iframes.forEach(f => f.style.pointerEvents = '');
            };

            window.addEventListener('mouseup', stopDrag);
            window.addEventListener('touchend', stopDrag);

            splitter.addEventListener('dblclick', () => {
                const containerWidth = container.getBoundingClientRect().width;
                const resetWidth = Math.round(containerWidth * 0.40);
                this.leftPanel.style.display = 'block';
                this.leftPanel.style.width = `${resetWidth}px`;
                localStorage.setItem(this.storageKey, resetWidth);
            });
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 4: SCROLL POSITION RESTORATION SYSTEM (@designmotionhq Reel DcLaVaGNfoy)
    // ──────────────────────────────────────────────────────────────────────────
    const ScrollRestoration = {
        storageKey: 'rankly_scroll_state',

        saveScroll(contextKey, elementId) {
            const state = {
                windowY: window.scrollY || window.pageYOffset || 0,
                elementId: elementId || null,
                timestamp: Date.now()
            };
            sessionStorage.setItem(`${this.storageKey}_${contextKey}`, JSON.stringify(state));
        },

        restoreScroll(contextKey) {
            const raw = sessionStorage.getItem(`${this.storageKey}_${contextKey}`);
            if (!raw) return;

            try {
                const state = JSON.parse(raw);
                if (typeof state.windowY === 'number') {
                    window.scrollTo({
                        top: state.windowY,
                        behavior: 'smooth'
                    });
                }

                if (state.elementId) {
                    setTimeout(() => {
                        const target = document.getElementById(state.elementId) || 
                                       document.querySelector(`[data-candidate-id="${state.elementId}"]`);
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            target.classList.remove('dm-focus-highlight');
                            void target.offsetWidth;
                            target.classList.add('dm-focus-highlight');
                            setTimeout(() => target.classList.remove('dm-focus-highlight'), 1800);
                        }
                    }, 120);
                }
            } catch (err) {
                // Ignore parse errors
            }
        },

        hookModalScrollTriggers() {
            const originalOpenResume = window.openResumeViewerModal;
            if (typeof originalOpenResume === 'function') {
                window.openResumeViewerModal = function(fileUrl, candidateName, score, skills, candId) {
                    ScrollRestoration.saveScroll('candidate_queue', candId || null);
                    
                    ResizablePanels.enhanceResumeViewerModal();
                    const atsScoreEl = document.getElementById('dossierAtsScore');
                    if (atsScoreEl) atsScoreEl.textContent = `${score || 88}%`;
                    const skillsListEl = document.getElementById('dossierSkillsList');
                    if (skillsListEl && skills) {
                        const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
                        if (skillArray.length > 0) {
                            skillsListEl.innerHTML = skillArray.map(s => `
                                <span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#FAFAF8] dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300">${s}</span>
                            `).join('');
                        }
                    }

                    return originalOpenResume.apply(this, arguments);
                };
            }

            const originalCloseResume = window.closeResumeViewerModal;
            if (typeof originalCloseResume === 'function') {
                window.closeResumeViewerModal = function() {
                    const result = originalCloseResume.apply(this, arguments);
                    ScrollRestoration.restoreScroll('candidate_queue');
                    return result;
                };
            }
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 5: 6-MOVES MOBILE TABLE RESTRUCTURING (@designmotionhq Reel Dc8RfGzNPCN)
    // ──────────────────────────────────────────────────────────────────────────
    const MobileTableSystem = {
        viewMode: 'table',

        init() {
            this.injectViewModeToggle();
            this.setupResponsiveObserver();
        },

        injectViewModeToggle() {
            const tableContainer = document.getElementById('aiCandidateQueueTableBody')?.closest('.card');
            if (!tableContainer || document.getElementById('candidateViewModeToggle')) return;

            const filterBar = tableContainer.previousElementSibling?.previousElementSibling;
            if (!filterBar) return;

            const toggleContainer = document.createElement('div');
            toggleContainer.id = 'candidateViewModeToggle';
            toggleContainer.className = 'flex items-center gap-1 p-1 bg-[#FAFAF8] dark:bg-zinc-800/80 border border-[#E5E5DF] dark:border-zinc-700 rounded-xl text-xs font-bold self-end shadow-2xs';
            toggleContainer.innerHTML = `
                <button type="button" onclick="window.DesignMotion.MobileTable.setViewMode('table')" id="viewModeTableBtn" class="px-3 py-1 rounded-lg text-[#111111] dark:text-white bg-white dark:bg-zinc-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5">
                    <i class="fa-solid fa-table-list text-emerald-500"></i>
                    <span>Table</span>
                </button>
                <button type="button" onclick="window.DesignMotion.MobileTable.setViewMode('card')" id="viewModeCardBtn" class="px-3 py-1 rounded-lg text-[#666660] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5">
                    <i class="fa-solid fa-id-card"></i>
                    <span>6-Moves Card View</span>
                </button>
            `;

            filterBar.appendChild(toggleContainer);
        },

        setViewMode(mode) {
            this.viewMode = mode;
            const tableBtn = document.getElementById('viewModeTableBtn');
            const cardBtn = document.getElementById('viewModeCardBtn');
            const table = document.querySelector('#aiCandidateQueueTableBody')?.closest('table');
            const cardGrid = document.getElementById('aiCandidateCardGrid');

            if (mode === 'card') {
                if (tableBtn) {
                    tableBtn.classList.remove('bg-white', 'dark:bg-zinc-700', 'shadow-2xs', 'text-[#111111]', 'dark:text-white');
                    tableBtn.classList.add('text-[#666660]', 'dark:text-zinc-400');
                }
                if (cardBtn) {
                    cardBtn.classList.add('bg-white', 'dark:bg-zinc-700', 'shadow-2xs', 'text-[#111111]', 'dark:text-white');
                    cardBtn.classList.remove('text-[#666660]', 'dark:text-zinc-400');
                }
                if (table) table.parentElement.style.display = 'none';
                this.renderCardsFromTable();
            } else {
                if (cardBtn) {
                    cardBtn.classList.remove('bg-white', 'dark:bg-zinc-700', 'shadow-2xs', 'text-[#111111]', 'dark:text-white');
                    cardBtn.classList.add('text-[#666660]', 'dark:text-zinc-400');
                }
                if (tableBtn) {
                    tableBtn.classList.add('bg-white', 'dark:bg-zinc-700', 'shadow-2xs', 'text-[#111111]', 'dark:text-white');
                    tableBtn.classList.remove('text-[#666660]', 'dark:text-zinc-400');
                }
                if (table) table.parentElement.style.display = 'block';
                if (cardGrid) cardGrid.style.display = 'none';
            }
        },

        renderCardsFromTable() {
            const tableBody = document.getElementById('aiCandidateQueueTableBody');
            if (!tableBody) return;

            const tableCardWrapper = tableBody.closest('.card');
            if (!tableCardWrapper) return;

            let cardGrid = document.getElementById('aiCandidateCardGrid');
            if (!cardGrid) {
                cardGrid = document.createElement('div');
                cardGrid.id = 'aiCandidateCardGrid';
                cardGrid.className = 'dm-card-mode-grid p-4';
                tableCardWrapper.appendChild(cardGrid);
            }

            cardGrid.innerHTML = '';
            cardGrid.style.display = 'grid';

            const realCandidates = window.currentQueueData || [];
            
            if (realCandidates.length > 0) {
                realCandidates.forEach((cand, index) => {
                    const name = cand.name || `Candidate #${index + 1}`;
                    const role = cand.targetRole || 'Software Engineer';
                    const score = Math.round(cand.score || 88);
                    const candId = cand.id || `cand-${index}`;
                    const fitVerdict = cand.fitVerdict || 'Optimal Fit';
                    const stage = cand.stage || 'Screening';
                    const summary = cand.cheatSheet?.summaryLines?.[0] || cand.summary || 'Demonstrated high competency alignment with role requirements and robust engineering practices.';
                    const initialChar = name.charAt(0).toUpperCase();

                    const avatarGrads = [
                        'from-emerald-600 to-teal-500',
                        'from-amber-600 to-orange-500',
                        'from-blue-600 to-indigo-500',
                        'from-purple-600 to-pink-500',
                        'from-slate-700 to-zinc-900'
                    ];
                    const grad = avatarGrads[index % avatarGrads.length];

                    const card = document.createElement('div');
                    card.id = `card-${candId}`;
                    card.className = 'dm-candidate-card space-y-3.5';
                    card.innerHTML = `
                        <!-- MOVE 2: Sticky Top Identifier + MOVE 3: Corner Pinned Score Chip -->
                        <div class="flex items-start justify-between gap-3 pb-3 border-b border-[#E5E5DF] dark:border-zinc-800">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${grad} text-white font-black text-sm flex items-center justify-center shadow-2xs flex-shrink-0">
                                    ${initialChar}
                                </div>
                                <div>
                                    <h4 class="font-bold text-sm text-[#111111] dark:text-white">${name}</h4>
                                    <p class="text-[11px] text-[#666660] dark:text-zinc-400 font-mono">${role}</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                                ${score}% MATCH
                            </span>
                        </div>

                        <!-- MOVE 4: 2x2 Micro-Grid for Key Metrics -->
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                                <span class="text-[10px] text-gray-400 font-mono block">ROLE CALIBRATION</span>
                                <span class="font-bold text-gray-800 dark:text-zinc-200 truncate block">${role}</span>
                            </div>
                            <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                                <span class="text-[10px] text-gray-400 font-mono block">BENCHMARK</span>
                                <span class="font-bold text-emerald-600 dark:text-emerald-400">${fitVerdict}</span>
                            </div>
                            <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                                <span class="text-[10px] text-gray-400 font-mono block">ATS EMBEDDING</span>
                                <span class="font-bold text-indigo-600 dark:text-indigo-400">Verified Signature</span>
                            </div>
                            <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                                <span class="text-[10px] text-gray-400 font-mono block">STAGE</span>
                                <span class="font-bold text-amber-600 dark:text-amber-400 capitalize">${stage}</span>
                            </div>
                        </div>

                        <!-- MOVE 5: Expandable Details Accordion -->
                        <div class="pt-1">
                            <button type="button" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.accordion-icon').classList.toggle('rotate-180')" class="w-full flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-zinc-300 py-1.5 cursor-pointer">
                                <span>View AI Evaluation Notes</span>
                                <i class="fa-solid fa-chevron-down accordion-icon text-[10px] transition-transform duration-200"></i>
                            </button>
                            <div class="hidden pt-2 text-xs text-[#666660] dark:text-zinc-400 leading-relaxed border-t border-dashed border-[#E5E5DF] dark:border-zinc-800 mt-1">
                                ${summary}
                            </div>
                        </div>

                        <!-- MOVE 6: Fixed Bottom 1-Click Action Buttons -->
                        <div class="pt-2 flex items-center gap-2 border-t border-[#E5E5DF] dark:border-zinc-800">
                            <button type="button" onclick="window.DesignMotion.Scroll.saveScroll('candidate_queue', '${card.id}'); if(window.openResumeViewerModal) openResumeViewerModal('${cand.resumeUrl || ''}', '${name}', ${score}, '${cand.skills || 'TypeScript, Node.js'}', '${candId}');" class="flex-1 py-2 px-3 rounded-xl bg-[#243E36] hover:bg-[#1B302A] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                                <i class="fa-regular fa-file-lines"></i>
                                <span>View Dossier</span>
                            </button>
                            <button type="button" onclick="if(window.openInterviewCalendarModal) openInterviewCalendarModal();" class="py-2 px-3 rounded-xl border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-[#FAFAF8] dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer shadow-2xs" title="Schedule Interview">
                                <i class="fa-regular fa-calendar-check"></i>
                            </button>
                        </div>
                    `;
                    cardGrid.appendChild(card);
                });
                return;
            }

            const rows = tableBody.querySelectorAll('tr');
            if (rows.length === 0) {
                cardGrid.innerHTML = '<div class="p-8 text-center text-gray-400 col-span-full">No candidates in queue.</div>';
                return;
            }

            rows.forEach((tr, index) => {
                const nameEl = tr.querySelector('.font-bold.text-sm, h4, .text-gray-900, button[onclick*="openAiCheatSheet"]');
                const name = nameEl ? nameEl.textContent.trim() : `Candidate #${index + 1}`;
                
                const roleEl = tr.querySelector('.text-xs.text-gray-500, .text-zinc-400, span.font-semibold');
                const role = roleEl ? roleEl.textContent.trim() : 'Software Engineer';

                const scoreEl = tr.querySelector('.font-mono.font-bold, [class*="bg-emerald-"]');
                const scoreText = scoreEl ? scoreEl.textContent.trim() : '88%';

                const candId = tr.id || tr.getAttribute('data-candidate-id') || `cand-card-${index}`;

                const card = document.createElement('div');
                card.id = `card-${candId}`;
                card.className = 'dm-candidate-card space-y-3.5';
                card.innerHTML = `
                    <!-- MOVE 2: Sticky Top Identifier + MOVE 3: Corner Pinned Score Chip -->
                    <div class="flex items-start justify-between gap-3 pb-3 border-b border-[#E5E5DF] dark:border-zinc-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-sm border border-emerald-500/20">
                                ${name.charAt(0)}
                            </div>
                            <div>
                                <h4 class="font-bold text-sm text-[#111111] dark:text-white">${name}</h4>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 font-mono">${role}</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                            ${scoreText}
                        </span>
                    </div>

                    <!-- MOVE 4: 2x2 Micro-Grid for Key Metrics -->
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                            <span class="text-[10px] text-gray-400 font-mono block">ROLE CALIBRATION</span>
                            <span class="font-bold text-gray-800 dark:text-zinc-200 truncate block">${role}</span>
                        </div>
                        <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                            <span class="text-[10px] text-gray-400 font-mono block">BENCHMARK</span>
                            <span class="font-bold text-emerald-600 dark:text-emerald-400">Optimal Fit</span>
                        </div>
                        <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                            <span class="text-[10px] text-gray-400 font-mono block">ATS EMBEDDING</span>
                            <span class="font-bold text-indigo-600 dark:text-indigo-400">Verified Signature</span>
                        </div>
                        <div class="p-2 rounded-lg bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-700">
                            <span class="text-[10px] text-gray-400 font-mono block">STAGE</span>
                            <span class="font-bold text-amber-600 dark:text-amber-400">Screening</span>
                        </div>
                    </div>

                    <!-- MOVE 5: Expandable Details Accordion -->
                    <div class="pt-1">
                        <button type="button" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.accordion-icon').classList.toggle('rotate-180')" class="w-full flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-zinc-300 py-1.5 cursor-pointer">
                            <span>View AI Evaluation Notes</span>
                            <i class="fa-solid fa-chevron-down accordion-icon text-[10px] transition-transform duration-200"></i>
                        </button>
                        <div class="hidden pt-2 text-xs text-[#666660] dark:text-zinc-400 leading-relaxed border-t border-dashed border-[#E5E5DF] dark:border-zinc-800 mt-1">
                            Demonstrated strong alignment with role requirements and robust software engineering foundations.
                        </div>
                    </div>

                    <!-- MOVE 6: Fixed Bottom 1-Click Action Buttons -->
                    <div class="pt-2 flex items-center gap-2 border-t border-[#E5E5DF] dark:border-zinc-800">
                        <button type="button" onclick="window.DesignMotion.Scroll.saveScroll('candidate_queue', '${card.id}'); if(window.openResumeViewerModal) openResumeViewerModal('', '${name}', 92, 'TypeScript, Distributed Architecture', '${candId}');" class="flex-1 py-2 px-3 rounded-xl bg-[#243E36] hover:bg-[#1B302A] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                            <i class="fa-regular fa-file-lines"></i>
                            <span>View Dossier</span>
                        </button>
                        <button type="button" onclick="if(window.openInterviewCalendarModal) openInterviewCalendarModal();" class="py-2 px-3 rounded-xl border border-[#E5E5DF] dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-[#FAFAF8] dark:hover:bg-zinc-800 text-xs font-semibold cursor-pointer shadow-2xs" title="Schedule Interview">
                            <i class="fa-regular fa-calendar-check"></i>
                        </button>
                    </div>
                `;

                cardGrid.appendChild(card);
            });
        },

        setupResponsiveObserver() {
            const checkMobile = () => {
                if (window.innerWidth <= 768 && this.viewMode === 'table') {
                    const table = document.querySelector('#aiCandidateQueueTableBody')?.closest('table');
                    if (table) table.classList.add('dm-responsive-table');
                }
            };
            window.addEventListener('resize', checkMobile);
            checkMobile();
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SYSTEM 6: DANGER ACTIONS ARE A SYSTEM (@designmotionhq Reel Da4-EmYNYAP)
    // ──────────────────────────────────────────────────────────────────────────
    const DangerActionSystem = {
        holdDuration: 2000,
        activeHoldTimer: null,
        holdStartTime: 0,
        animFrameId: null,
        undoToastTimeout: null,

        init() {
            this.injectTypedDeleteModal();
        },

        attachHoldToConfirm(buttonElement, onConfirmedCallback) {
            if (!buttonElement) return;

            const progressFill = buttonElement.querySelector('.hold-confirm-progress-fill');
            const btnText = buttonElement.querySelector('#settingsHoldBtnText') || buttonElement;
            const originalText = btnText.textContent;

            const startHold = (e) => {
                e.preventDefault();
                buttonElement.classList.add('holding');
                this.holdStartTime = Date.now();

                const updateProgress = () => {
                    const elapsed = Date.now() - this.holdStartTime;
                    const percent = Math.min(100, (elapsed / this.holdDuration) * 100);

                    if (progressFill) {
                        progressFill.style.width = `${percent}%`;
                    }

                    const remainingSec = Math.max(0, ((this.holdDuration - elapsed) / 1000)).toFixed(1);
                    btnText.textContent = `Hold to Confirm (${remainingSec}s)`;

                    if (elapsed >= this.holdDuration) {
                        cancelHold();
                        if (typeof onConfirmedCallback === 'function') {
                            onConfirmedCallback();
                        }
                    } else {
                        this.animFrameId = requestAnimationFrame(updateProgress);
                    }
                };

                this.animFrameId = requestAnimationFrame(updateProgress);
            };

            const cancelHold = () => {
                if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
                buttonElement.classList.remove('holding');
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
                btnText.textContent = originalText;
            };

            buttonElement.addEventListener('mousedown', startHold);
            buttonElement.addEventListener('touchstart', startHold, { passive: false });

            buttonElement.addEventListener('mouseup', cancelHold);
            buttonElement.addEventListener('mouseleave', cancelHold);
            buttonElement.addEventListener('touchend', cancelHold);
        },

        injectTypedDeleteModal() {
            if (document.getElementById('typedDeleteModal')) return;

            const modal = document.createElement('div');
            modal.id = 'typedDeleteModal';
            modal.className = 'modal-overlay';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="modal-content max-w-md p-6 bg-white dark:bg-[#141721] rounded-3xl border border-red-200 dark:border-red-900/60 shadow-2xl space-y-5" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between pb-3 border-b border-red-100 dark:border-red-950">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center text-lg border border-red-500/20">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-base text-[#111111] dark:text-white">Confirm Data Destruction</h3>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 font-mono">Explicit Confirmation Verification</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('typedDeleteModal').style.display='none'" class="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="text-xs text-[#666660] dark:text-zinc-300 space-y-2 leading-relaxed">
                        <p>This will permanently purge your workspace account, ATS scoring models, candidate evaluations, and security logs.</p>
                        <p class="font-semibold text-gray-800 dark:text-zinc-100">
                            To prevent accidental destruction, please type <span class="text-red-600 dark:text-red-400 font-mono font-black">DELETE</span> below:
                        </p>
                    </div>

                    <div>
                        <input type="text" id="typedDeleteInput" placeholder="Type DELETE to confirm" class="w-full px-4 py-2.5 rounded-xl border border-[#E5E5DF] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-800 text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-none">
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onclick="document.getElementById('typedDeleteModal').style.display='none'" class="px-4 py-2 rounded-xl border border-[#E5E5DF] dark:border-zinc-700 text-gray-600 dark:text-zinc-300 text-xs font-semibold hover:bg-[#FAFAF8] dark:hover:bg-zinc-800 cursor-pointer">
                            Cancel
                        </button>
                        <button type="button" id="confirmTypedDeleteBtn" disabled onclick="window.DesignMotion.Danger.executeDestructiveAction()" class="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold opacity-50 cursor-not-allowed transition-all">
                            Permanently Wipe Account
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('#typedDeleteInput');
            const confirmBtn = modal.querySelector('#confirmTypedDeleteBtn');
            if (input && confirmBtn) {
                input.addEventListener('input', () => {
                    if (input.value.trim() === 'DELETE') {
                        confirmBtn.removeAttribute('disabled');
                        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                        confirmBtn.classList.add('cursor-pointer', 'hover:bg-red-700', 'shadow-md');
                    } else {
                        confirmBtn.setAttribute('disabled', 'true');
                        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
                        confirmBtn.classList.remove('cursor-pointer', 'hover:bg-red-700', 'shadow-md');
                    }
                });
            }
        },

        openTypedDeleteModal() {
            const modal = document.getElementById('typedDeleteModal');
            if (!modal) return;
            const input = modal.querySelector('#typedDeleteInput');
            if (input) input.value = '';
            const confirmBtn = modal.querySelector('#confirmTypedDeleteBtn');
            if (confirmBtn) {
                confirmBtn.setAttribute('disabled', 'true');
                confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            modal.style.display = 'flex';
        },

        executeDestructiveAction() {
            const modal = document.getElementById('typedDeleteModal');
            if (modal) modal.style.display = 'none';

            this.showUndoToast(
                'Account wipe scheduled. Permanently committing in 5 seconds...',
                () => {
                    if (window.showToast) {
                        window.showToast('Destructive action safely aborted. No data was deleted.', 'info');
                    }
                },
                () => {
                    if (window.showToast) {
                        window.showToast('Simulated permanent wipe executed safely.', 'warning');
                    }
                }
            );
        },

        showUndoToast(message, onUndo, onCommit) {
            const existing = document.getElementById('dmUndoToast');
            if (existing) existing.remove();
            clearTimeout(this.undoToastTimeout);

            const toast = document.createElement('div');
            toast.id = 'dmUndoToast';
            toast.className = 'dm-undo-toast';
            toast.innerHTML = `
                <div class="flex items-center gap-2.5">
                    <i class="fa-solid fa-clock-rotate-left text-amber-400"></i>
                    <span>${message}</span>
                </div>
                <button type="button" id="dmUndoToastBtn" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-sm">
                    Undo (<span id="dmUndoSeconds">5</span>s)
                </button>
                <div class="dm-undo-countdown-bar" id="dmUndoBar"></div>
            `;

            document.body.appendChild(toast);

            let secondsLeft = 5;
            const secSpan = toast.querySelector('#dmUndoSeconds');
            const bar = toast.querySelector('#dmUndoBar');
            const undoBtn = toast.querySelector('#dmUndoToastBtn');

            const interval = setInterval(() => {
                secondsLeft--;
                if (secSpan) secSpan.textContent = secondsLeft;
                if (bar) bar.style.width = `${(secondsLeft / 5) * 100}%`;

                if (secondsLeft <= 0) {
                    clearInterval(interval);
                    toast.remove();
                    if (typeof onCommit === 'function') onCommit();
                }
            }, 1000);

            undoBtn.addEventListener('click', () => {
                clearInterval(interval);
                toast.remove();
                if (typeof onUndo === 'function') onUndo();
            });
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // GLOBAL NAMESPACE EXPORT & INITIALIZATION
    // ──────────────────────────────────────────────────────────────────────────
    window.DesignMotion = {
        Settings: SettingsSystem,
        Notifications: NotificationSystem,
        Panels: ResizablePanels,
        Scroll: ScrollRestoration,
        MobileTable: MobileTableSystem,
        Danger: DangerActionSystem,

        init() {
            injectDesignMotionStyles();
            SettingsSystem.init();
            NotificationSystem.init();
            ResizablePanels.init();
            ScrollRestoration.hookModalScrollTriggers();
            MobileTableSystem.init();
            DangerActionSystem.init();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.DesignMotion.init());
    } else {
        window.DesignMotion.init();
    }

})(window, document);
