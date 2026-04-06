// /assets/js/notifications.js
// KIB Operations Portal — Notification Polling & Rendering

const NOTIFICATIONS = (() => {
  let pollTimer = null;

  async function load() {
    try {
      const data = await API.get('/api/notifications/list', { limit: 20 });
      renderDrawer(data?.notifications || []);
      updateBadge(data?.unread_count || 0);
    } catch (e) { /* silent fail on poll */ }
  }

  function renderDrawer(notifications) {
    const list = document.getElementById('notifDrawerList');
    if (!list) return;
    if (!notifications.length) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read_flag === 'FALSE' || !n.read_flag ? 'unread' : ''} sev-${n.severity}"
           onclick="NOTIFICATIONS.markRead('${n.notification_id}', '${n.action_target || ''}')">
        <div class="notif-icon">${severityIcon(n.severity)}</div>
        <div class="notif-content">
          <div class="notif-title">${UTILS.escapeHtml(n.title)}</div>
          <div class="notif-msg">${UTILS.escapeHtml(n.message)}</div>
          <div class="notif-time">${UTILS.formatDateTime(n.created_datetime)}</div>
        </div>
        ${n.read_flag === 'FALSE' ? '<div class="notif-dot"></div>' : ''}
      </div>`).join('');
  }

  function severityIcon(sev) {
    if (sev === 'critical') return '🔴';
    if (sev === 'warning')  return '🟡';
    return '🔵';
  }

  function updateBadge(count) {
    const badge = document.getElementById('notifCount');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  async function markRead(notifId, actionTarget) {
    try {
      await API.post('/api/notifications/read', { notification_id: notifId });
      load();
      if (actionTarget && actionTarget !== 'undefined') {
        window.location.href = actionTarget;
      }
    } catch (e) {}
  }

  async function markAllRead() {
    try {
      await API.post('/api/notifications/read', { mark_all: true });
      load();
    } catch (e) {}
  }

  function startPolling(interval = 60000) {
    load(); // immediate first load
    pollTimer = setInterval(load, interval);
    document.getElementById('notifBell')?.addEventListener('click', () => {
      UI.openNotifDrawer();
      load();
    });
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
  }

  return { load, markRead, markAllRead, startPolling, stopPolling, updateBadge };
})();
