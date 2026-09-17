with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re

settings_match = re.search(r'(<!-- Card 1: Vault Security.*?)(<!-- Card 2: )', html, re.MULTILINE | re.DOTALL)

iam_ui = '''<!-- Card IAM: Enterprise Security & IP Whitelisting -->
                            <div class="card p-6 border border-[#E5E5DF] dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs relative overflow-hidden group">
                                <div class="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent dark:from-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div class="relative z-10">
                                    <div class="flex items-center gap-3 mb-5">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <i class="fa-solid fa-shield-halved text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 class="font-bold text-gray-900 dark:text-white">Enterprise IAM Security</h3>
                                            <p class="text-xs text-gray-500">Configure Strict Contextual Network Restrictions</p>
                                        </div>
                                    </div>
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700">
                                            <div>
                                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Strict IP Whitelisting</h4>
                                                <p class="text-[11px] text-gray-500">Only allow logins from approved office networks</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="ipRestrictionToggle" class="sr-only peer" onchange="toggleIpConfig()">
                                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        <div id="ipListContainer" class="hidden space-y-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700">
                                            <label class="form-label text-xs">Approved IPv4/IPv6 Addresses (Comma Separated)</label>
                                            <textarea id="allowedIpsInput" class="form-input w-full h-20 text-xs font-mono" placeholder="e.g. 192.168.1.1, 203.0.113.50"></textarea>
                                            <div class="flex justify-end">
                                                <button class="btn-primary text-xs py-1.5 px-3" onclick="saveSecuritySettings()"><i class="fa-solid fa-save"></i> Save Security Policy</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            '''

if settings_match:
    html = html.replace(settings_match.group(1), settings_match.group(1) + iam_ui)
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected IAM UI into settings tab")
else:
    print("Could not find settings tab")
