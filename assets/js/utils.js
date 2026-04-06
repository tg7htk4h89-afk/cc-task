// /assets/js/utils.js
// KIB Operations Portal — Utility Functions

const UTILS = (() => {
  const KWT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3

  function toKuwaitTime(utcString) {
    const d = new Date(utcString);
    return new Date(d.getTime() + KWT_OFFSET_MS);
  }

  function formatDate(utcString) {
    if (!utcString) return '—';
    const d = toKuwaitTime(utcString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(utcString) {
    if (!utcString) return '—';
    const d = toKuwaitTime(utcString);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatTime(utcString) {
    if (!utcString) return '—';
    const d = toKuwaitTime(utcString);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function todayKuwait() {
    const d = new Date(Date.now() + KWT_OFFSET_MS);
    return d.toISOString().slice(0, 10);
  }

  function timeRemaining(dueDatetime) {
    const now = new Date();
    const due = new Date(dueDatetime);
    const diffMs = due - now;
    if (diffMs < 0) {
      const hrs = Math.abs(Math.floor(diffMs / 3600000));
      const mins = Math.abs(Math.floor((diffMs % 3600000) / 60000));
      return { overdue: true, label: hrs > 0 ? `${hrs}h ${mins}m overdue` : `${mins}m overdue`, diffMs };
    }
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const urgent = diffMs < 2 * 3600000;
    return { overdue: false, urgent, label: hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`, diffMs };
  }

  function priorityColor(priority) {
    return { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#7c3aed' }[priority] || '#94a3b8';
  }

  function statusBadgeClass(status) {
    const map = {
      New: 'badge-blue', Assigned: 'badge-indigo', InProgress: 'badge-yellow',
      Pending: 'badge-orange', WaitingInput: 'badge-orange', UnderReview: 'badge-indigo',
      Completed: 'badge-green', Cancelled: 'badge-gray',
      Overdue: 'badge-red', Escalated: 'badge-purple',
    };
    return map[status] || 'badge-gray';
  }

  function trendBadge(trend) {
    const map = {
      OnTrack: { cls: 'badge-green', label: '✓ On Track' },
      Ahead:   { cls: 'badge-blue',  label: '↑ Ahead' },
      Behind:  { cls: 'badge-orange',label: '↓ Behind' },
      AtRisk:  { cls: 'badge-red',   label: '⚠ At Risk' },
    };
    return map[trend] || { cls: 'badge-gray', label: trend };
  }

  function scoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function formatCurrency(amount) {
    return `KWD ${Number(amount).toFixed(3)}`;
  }

  function pct(val, total) {
    if (!total) return 0;
    return Math.round((val / total) * 100);
  }

  function generateId(prefix) {
    const date = todayKuwait().replace(/-/g, '');
    const seq = String(Date.now()).slice(-4);
    return `${prefix}-${date}-${seq}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function greetingByTime() {
    const h = new Date(Date.now() + KWT_OFFSET_MS).getUTCHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function daysUntil(dateStr) {
    const today = new Date(todayKuwait());
    const target = new Date(dateStr);
    return Math.ceil((target - today) / 86400000);
  }

  function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  return {
    toKuwaitTime, formatDate, formatDateTime, formatTime, todayKuwait,
    timeRemaining, priorityColor, statusBadgeClass, trendBadge, scoreColor,
    debounce, formatCurrency, pct, generateId, escapeHtml, greetingByTime,
    daysUntil, getInitials
  };
})();
