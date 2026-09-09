/**
 * Rankly.ai Real-time Client Notification Engine
 * - Polls unread count
 * - Shows live toast alerts without refreshing
 * - Dropdown list with unread markers & mark all as read
 */

(function() {
    'use strict';

    let lastUnreadCount = 0;
    let pollInterval = null;

    async function fetchUnreadCount() {
        try {
            const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && typeof data.count === 'number') {
                updateBadge(data.count);

                // If unread count increased, trigger a live toast alert!
                if (data.count > lastUnreadCount && lastUnreadCount !== 0) {
                    fetchLatestAndToast();
                }
                lastUnreadCount = data.count;
            }
        } catch (err) {
            // Silently swallow background poll errors
        }
    }

    async function fetchLatestAndToast() {
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            const list = data.notifications || data;
            if (Array.isArray(list) && list.length > 0) {
                const latest = list[0];
                if (!latest.isRead && typeof window.showToast === 'function') {
                    window.showToast(latest.title + ': ' + latest.message, latest.type === 'warning' ? 'warning' : 'info');
                }
            }
        } catch (_) {}
    }

    function updateBadge(count) {
        if (window.DesignMotion && window.DesignMotion.Notifications && typeof window.DesignMotion.Notifications.setBadgeCount === 'function') {
            window.DesignMotion.Notifications.setBadgeCount(count);
            return;
        }
        const badge = document.getElementById('notifBadge');
        const countBadge = document.getElementById('notifDropdownCountBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        if (countBadge) {
            countBadge.textContent = count + ' unread';
        }
    }

    window.toggleNotificationDropdown = async function() {
        const dropdown = document.getElementById('notifDropdown');
        if (!dropdown) return;

        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
            dropdown.classList.remove('hidden');
            await window.loadNotificationsList();
        } else {
            dropdown.classList.add('hidden');
        }
    };

    window.loadNotificationsList = async function() {
        const container = document.getElementById('notifListContainer');
        if (!container) return;

        try {
            container.innerHTML = '<div class="p-6 text-center text-gray-400 font-mono text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading notifications...</div>';
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (!res.ok) {
                container.innerHTML = '<div class="p-6 text-center text-gray-400 text-xs">Please log in to view notifications.</div>';
                return;
            }
            const data = await res.json();
            const list = data.notifications || data;

            if (!Array.isArray(list) || list.length === 0) {
                container.innerHTML = `
                    <div class="p-8 text-center text-gray-400">
                        <i class="fa-regular fa-bell-slash text-2xl mb-2 text-gray-300 dark:text-zinc-600 block"></i>
                        <span>No notifications yet. You are all caught up!</span>
                    </div>
                `;
                return;
            }

            container.innerHTML = list.map(n => {
                const timeStr = formatTimeAgo(n.createdAt);
                const unreadClass = !n.isRead ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : '';
                const unreadDot = !n.isRead ? '<span class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>' : '';
                let iconClass = 'fa-circle-info text-blue-500';
                if (n.type === 'success') iconClass = 'fa-circle-check text-emerald-500';
                if (n.type === 'warning') iconClass = 'fa-triangle-exclamation text-amber-500';

                return `
                    <div class="p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer ${unreadClass} flex items-start gap-3" onclick="handleNotificationClick('${n.id}', '${n.link || ''}')">
                        <div class="mt-0.5 text-sm">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-1 mb-0.5">
                                <span class="font-bold text-gray-900 dark:text-white truncate">${escapeHtml(n.title)}</span>
                                <span class="text-[10px] text-gray-400 whitespace-nowrap font-mono">${timeStr}</span>
                            </div>
                            <p class="text-gray-600 dark:text-zinc-300 text-[11px] leading-relaxed line-clamp-2">${escapeHtml(n.message)}</p>
                        </div>
                        ${unreadDot}
                    </div>
                `;
            }).join('');
        } catch (err) {
            container.innerHTML = '<div class="p-6 text-center text-red-500 text-xs">Failed to load notifications.</div>';
        }
    };

    window.handleNotificationClick = async function(id, link) {
        try {
            await fetch('/api/notifications/' + id + '/read', {
                method: 'PATCH',
                credentials: 'include'
            });
            fetchUnreadCount();
        } catch (_) {}

        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.add('hidden');

        if (link) {
            if (link.startsWith('#tab-')) {
                const tabId = link.replace('#tab-', '');
                if (typeof window.switchTab === 'function') {
                    window.switchTab(tabId);
                }
            } else if (link.startsWith('/')) {
                window.location.href = link;
            }
        }
    };

    window.markAllNotificationsAsRead = async function() {
        try {
            await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                credentials: 'include'
            });
            updateBadge(0);
            window.loadNotificationsList();
            if (typeof window.showToast === 'function') {
                window.showToast('All notifications marked as read', 'success');
            }
        } catch (err) {
            console.error('Mark all read error:', err);
        }
    };

    function formatTimeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const past = new Date(dateStr);
        const diffSec = Math.floor((now - past) / 1000);
        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
        if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
        return Math.floor(diffSec / 86400) + 'd ago';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
        const wrapper = document.getElementById('notifBellWrapper');
        const dropdown = document.getElementById('notifDropdown');
        if (wrapper && dropdown && !dropdown.classList.contains('hidden')) {
            if (!wrapper.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        }
    });

    // Initialize polling on DOM load
    document.addEventListener('DOMContentLoaded', function() {
        fetchUnreadCount();
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchUnreadCount, 15000);
    });
})();
