with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

access_section = '''
                <!-- ZOHO-STYLE GRANULAR ACCESS CONTROL -->
                <div class="mb-5 mt-2 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-zinc-700">
                    <h4 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-emerald-500"></i> Role & Permissions
                    </h4>
                    
                    <div class="space-y-3">
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="relative flex items-center justify-center mt-0.5">
                                <input type="checkbox" name="empAccess" value="ats_manage" class="peer sr-only">
                                <div class="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100"></i>
                                </div>
                            </div>
                            <div>
                                <span class="block text-sm font-semibold text-gray-800 dark:text-zinc-200">ATS & Recruiting</span>
                                <span class="block text-[11px] text-gray-500 dark:text-zinc-400">Can view, rank, and edit candidate pipelines</span>
                            </div>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="relative flex items-center justify-center mt-0.5">
                                <input type="checkbox" name="empAccess" value="leave_approve" class="peer sr-only">
                                <div class="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100"></i>
                                </div>
                            </div>
                            <div>
                                <span class="block text-sm font-semibold text-gray-800 dark:text-zinc-200">Leave Approvals</span>
                                <span class="block text-[11px] text-gray-500 dark:text-zinc-400">Can approve or reject team leave requests</span>
                            </div>
                        </label>

                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="relative flex items-center justify-center mt-0.5">
                                <input type="checkbox" name="empAccess" value="timesheet_manage" class="peer sr-only">
                                <div class="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100"></i>
                                </div>
                            </div>
                            <div>
                                <span class="block text-sm font-semibold text-gray-800 dark:text-zinc-200">Timesheet Manager</span>
                                <span class="block text-[11px] text-gray-500 dark:text-zinc-400">Can review and edit employee attendance logs</span>
                            </div>
                        </label>
                        
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="relative flex items-center justify-center mt-0.5">
                                <input type="checkbox" name="empAccess" value="payroll_view" class="peer sr-only">
                                <div class="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100"></i>
                                </div>
                            </div>
                            <div>
                                <span class="block text-sm font-semibold text-gray-800 dark:text-zinc-200">Finance & Payroll</span>
                                <span class="block text-[11px] text-gray-500 dark:text-zinc-400">Can view salary data and compliance docs</span>
                            </div>
                        </label>
                    </div>
                </div>
'''

target_block = '''                </div>
                <div class="modal-actions flex justify-end gap-2 pt-3 border-t border-[#E5E5DF] dark:border-zinc-800">'''

if target_block in html:
    html = html.replace(target_block, '                </div>\n' + access_section + '                <div class="modal-actions flex justify-end gap-2 pt-3 border-t border-[#E5E5DF] dark:border-zinc-800">', 1)
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected successfully")
else:
    print("Could not find target block")
