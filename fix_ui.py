with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add sidebar link
sidebar_link = '''                    <button class="nav-item flex items-center justify-between w-full px-4 py-2 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors" onclick="switchMainTab('tab-attendance')" data-tab-btn="tab-attendance">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-clock w-5 text-center text-lg"></i>
                            <span class="text-sm font-semibold">Attendance</span>
                        </div>
                    </button>'''

new_sidebar_link = sidebar_link + '''
                    <button class="nav-item flex items-center justify-between w-full px-4 py-2 rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors" onclick="switchMainTab('tab-onboarding')" data-tab-btn="tab-onboarding">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-clipboard-list w-5 text-center text-lg"></i>
                            <span class="text-sm font-semibold">Onboarding</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">NEW</span>
                    </button>'''

html = html.replace(sidebar_link, new_sidebar_link)

# Add the Tab content
tab_attendance = '<div id="tab-attendance" class="main-tab hidden">'

onboarding_tab = '''
            <!-- ========================================== -->
            <!-- ?? ONBOARDING WORKFLOWS TAB -->
            <!-- ========================================== -->
            <div id="tab-onboarding" class="main-tab hidden">
                <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            Onboarding Pipelines <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">HRMS</span>
                        </h1>
                        <p class="text-sm text-[#4B5563] dark:text-zinc-400 mt-1">Manage new hire checklists and deployment progress.</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn-secondary" onclick="loadOnboardingData()"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
                        <button class="btn-primary" onclick="openAssignOnboardingModal()"><i class="fa-solid fa-plus"></i> Assign Onboarding</button>
                    </div>
                </div>

                <!-- Active Onboardings Grid -->
                <div id="onboardingGrid" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Populated by onboardingSuite.js -->
                </div>
            </div>
'''

html = html.replace(tab_attendance, onboarding_tab + '\n' + tab_attendance)

# Add script tag
html = html.replace('<!-- Include our App Logic -->', '<!-- Include our App Logic -->\n    <script src="/js/onboardingSuite.js"></script>')

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Added Onboarding tab to index.html")
