
        /* ==========================================================================
           Global Email Duplicate Protection & Instant Alert Modal
           ========================================================================== */
        window.checkEmailAvailabilityClient = async function(email) {
            if (!email || !email.includes('@')) return { exists: false };
            try {
                const res = await fetch('/api/auth/check-email?email=' + encodeURIComponent(email.trim().toLowerCase()), {
                    headers: { 'Accept': 'application/json' }
                });
                const data = await res.json();
                const exists = (res.status === 409 || data.alreadyRegistered === true || data.isAvailable === false);
                return { exists, message: data.message || 'An account with this email already exists.' };
            } catch (_) {
                return { exists: false };
            }
        };

        window.showEmailAlreadyExistsPopup = function(email) {
            const existing = document.getElementById('emailAlreadyExistsModal');
            if (existing) existing.remove();

            const safeEmail = email ? String(email).replace(/[&<>"']/g, '').trim() : '';
            const overlay = document.createElement('div');
            overlay.id = 'emailAlreadyExistsModal';
            overlay.className = 'modal-overlay active';
            overlay.style.cssText = 'display:flex !important; align-items:center !important; justify-content:center !important; position:fixed !important; inset:0 !important; z-index:99999999 !important; background:rgba(0,0,0,0.8) !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; padding:16px !important; opacity:1 !important; visibility:visible !important; pointer-events:auto !important;';

            overlay.innerHTML = `
                <div class="modal-box text-center" style="max-width:440px; width:100%; padding:36px 26px; border-radius:24px; background:var(--bg-card, #ffffff); border:2px solid #ef4444; box-shadow:0 25px 60px -12px rgba(239,68,68,0.35), 0 0 40px rgba(0,0,0,0.5); position:relative; animation:fadeIn 0.2s ease;">
                    <button type="button" onclick="closeEmailAlreadyExistsPopup()" aria-label="Close email notification" style="position:absolute; top:16px; right:16px; width:34px; height:34px; border-radius:50%; border:none; background:rgba(0,0,0,0.06); color:#64748b; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                        ✕
                    </button>
                    <div style="width:76px; height:76px; margin:0 auto 18px; border-radius:50%; background:rgba(239, 68, 68, 0.12); color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:36px; border:2px solid rgba(239, 68, 68, 0.3); box-shadow:0 0 24px rgba(239, 68, 68, 0.25);">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3 style="font-size:22px; font-weight:800; color:var(--text-primary, #0f172a); margin-bottom:8px; letter-spacing:-0.4px;">
                        Account Already Exists!
                    </h3>
                    ${safeEmail ? `
                    <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.25); padding:6px 16px; border-radius:999px; font-size:13px; font-weight:700; color:#dc2626; margin-bottom:16px;">
                        <i class="fa-solid fa-envelope"></i>
                        <span>${safeEmail}</span>
                    </div>
                    ` : ''}
                    <p style="font-size:14px; line-height:1.6; color:var(--text-muted, #64748b); margin-bottom:24px;">
                        An account is already registered with this email address. Verification code (OTP) cannot be sent for duplicate registration. Please sign in to your existing account.
                    </p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button type="button" onclick="goToSignInFromExistsPopup('${safeEmail}')" style="width:100%; padding:14px 22px; border-radius:14px; background:#183B33; color:#ffffff; font-size:15px; font-weight:700; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 20px -3px rgba(24, 59, 51, 0.4); transition:all 0.2s;">
                            <span>Sign In with This Account</span>
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                        <button type="button" onclick="closeEmailAlreadyExistsPopup()" style="width:100%; padding:11px 18px; border-radius:12px; background:transparent; color:#64748b; font-size:13px; font-weight:600; border:1px solid var(--border-color, #e2e8f0); cursor:pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Hide any opened OTP boxes
            const candBox = document.getElementById('candOtpContainer');
            if (candBox) candBox.classList.add('hidden');
            const orgBox = document.getElementById('orgOtpContainer');
            if (orgBox) orgBox.classList.add('hidden');
            const empRow = document.getElementById('empEmailOtpRow');
            if (empRow) empRow.style.display = 'none';
            const emailRow = document.getElementById('emailOtpRow');
            if (emailRow) emailRow.style.display = 'none';

            // Mark matching input border red
            const inputs = ['slideRegEmail', 'orgWorkEmailInput', 'signupEmail', 'empEmail'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.value.trim().toLowerCase() === safeEmail.toLowerCase()) {
                    el.style.borderColor = '#ef4444';
                }
            });
        };

        window.closeEmailAlreadyExistsPopup = function() {
            const el = document.getElementById('emailAlreadyExistsModal');
            if (el) el.remove();
        };

        window.goToSignInFromExistsPopup = function(email) {
            window.closeEmailAlreadyExistsPopup();
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
            if (typeof toggleAuthSlide === 'function') toggleAuthSlide('login');
            if (typeof switchOrgPortalTab === 'function') switchOrgPortalTab('login');
            if (typeof flipEntireAuthCard === 'function') flipEntireAuthCard(false);
            if (typeof openModal === 'function') openModal('loginModal');

            const loginInputs = [
                document.getElementById('loginUsername'),
                document.getElementById('loginIdentifier'),
                document.getElementById('slideLoginIdentifier'),
                document.getElementById('orgLoginIdentifier')
            ];
            for (const inp of loginInputs) {
                if (inp) inp.value = email || '';
            }
            const pwdInputs = [
                document.getElementById('loginPassword'),
                document.getElementById('slideLoginPassword'),
                document.getElementById('orgLoginPassword')
            ];
            for (const p of pwdInputs) {
                if (p && p.offsetParent !== null) {
                    p.focus();
                    break;
                }
            }
        };

        window.attachEmailDuplicateWatchers = function() {
            const fields = [
                { id: 'slideRegEmail', warnId: 'candEmailExistsWarn' },
                { id: 'orgWorkEmailInput', warnId: 'orgWorkEmailWarning' },
                { id: 'signupEmail', warnId: 'signupEmailExistsWarn' },
                { id: 'empEmail', warnId: 'empEmailExistsWarn' }
            ];

            fields.forEach(({ id, warnId }) => {
                const inp = document.getElementById(id);
                if (!inp || inp._hasDuplicateWatcher) return;
                inp._hasDuplicateWatcher = true;

                const checkEmail = async () => {
                    const email = (inp.value || '').trim();
                    if (!email || !email.includes('@') || !email.includes('.')) return;
                    const res = await window.checkEmailAvailabilityClient(email);
                    if (res && res.exists) {
                        inp.style.borderColor = '#ef4444';
                        let warn = document.getElementById(warnId);
                        if (!warn) {
                            warn = document.createElement('p');
                            warn.id = warnId;
                            warn.className = 'text-xs text-red-600 font-semibold mt-1 flex items-center gap-1';
                            if (inp.parentElement && inp.parentElement.parentElement) {
                                inp.parentElement.parentElement.appendChild(warn);
                            }
                        }
                        warn.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1 text-red-500"></i> An account with this email already exists. <a href="javascript:void(0)" onclick="goToSignInFromExistsPopup(\'' + email + '\')" class="underline font-bold text-[#183B33] ml-1">Sign In</a>';
                        warn.classList.remove('hidden');
                        warn.style.display = 'flex';
                    } else {
                        inp.style.borderColor = '';
                        const warn = document.getElementById(warnId);
                        if (warn && id !== 'orgWorkEmailInput') {
                            warn.classList.add('hidden');
                            warn.style.display = 'none';
                        }
                    }
                };

                inp.addEventListener('blur', checkEmail);
                let timer = null;
                inp.addEventListener('input', () => {
                    clearTimeout(timer);
                    timer = setTimeout(checkEmail, 400);
                });
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.attachEmailDuplicateWatchers);
        } else {
            setTimeout(window.attachEmailDuplicateWatchers, 500);
        }
    