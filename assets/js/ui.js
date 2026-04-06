// /assets/js/ui.js
// KIB Operations Portal — UI Helpers (Toast, Modal, Loader, Empty State)

const UI = (() => {

  // ── Global loader bar ──────────────────────────────────────
  function showLoader() {
    let el = document.getElementById('_globalLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = '_globalLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:var(--color-accent);z-index:99999;transition:opacity 0.3s';
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
  }
  function hideLoader() {
    const el = document.getElementById('_globalLoader');
    if (el) el.style.opacity = '0';
  }

  // ── Toast ──────────────────────────────────────────────────
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = {
      success: '<polyline points="20 6 9 17 4 12"></polyline>',
      error:   '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>',
      info:    '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${icons[type] || icons.info}</svg>
      <span>${UTILS.escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;color:inherit;font-size:16px;line-height:1">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
  }

  // ── Section skeleton loader ────────────────────────────────
  function showSectionLoader(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="skeleton-wrap">
        ${[1,2,3].map(() => `<div class="skeleton-row"></div>`).join('')}
      </div>`;
  }

  // ── Empty state ────────────────────────────────────────────
  function showEmptyState(containerId, message = 'No data found', subtext = '') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="empty-state-msg">${UTILS.escapeHtml(message)}</p>
        ${subtext ? `<p class="empty-state-sub">${UTILS.escapeHtml(subtext)}</p>` : ''}
      </div>`;
  }

  // ── Set sidebar user info ──────────────────────────────────
  function setPageUser(session) {
    if (!session) return;
    const initials = UTILS.getInitials(session.display_name || session.full_name);
    const el = (id) => document.getElementById(id);
    if (el('avatarInitials'))  el('avatarInitials').textContent  = initials;
    if (el('sidebarName'))     el('sidebarName').textContent     = session.display_name || session.full_name;
    if (el('sidebarRole'))     el('sidebarRole').textContent     = session.role;
    if (el('dashSubtitle'))    el('dashSubtitle').textContent    = `${UTILS.greetingByTime()}, ${session.display_name || session.full_name}`;
    if (el('currentDate'))     el('currentDate').textContent     = UTILS.formatDate(new Date().toISOString());

    // Role-based visibility
    document.querySelectorAll('[data-roles]').forEach(node => {
      const allowed = node.dataset.roles.split(',').map(r => r.trim());
      node.style.display = allowed.includes(session.role) ? '' : 'none';
    });

    // Mark active nav link
    document.querySelectorAll('.nav-item a').forEach(a => {
      a.closest('.nav-item')?.classList.toggle('active', a.href === window.location.href);
    });
  }

  // ── Modal ──────────────────────────────────────────────────
  function showModal(title, bodyHTML, footerHTML = '') {
    closeModal(); // close any existing
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = '_modalOverlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${UTILS.escapeHtml(title)}</h3>
          <button class="modal-close" onclick="UI.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    return overlay;
  }

  function closeModal() {
    document.getElementById('_modalOverlay')?.remove();
    document.body.style.overflow = '';
  }

  // ── Confirm dialog ─────────────────────────────────────────
  function confirm(message, onConfirm, confirmLabel = 'Confirm', danger = false) {
    showModal('Confirm Action',
      `<p style="color:var(--text-secondary);font-size:var(--text-base)">${UTILS.escapeHtml(message)}</p>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="UI.closeModal();(${onConfirm.toString()})()">${confirmLabel}</button>`
    );
  }

  // ── Notification drawer ────────────────────────────────────
  function openNotifDrawer() {
    document.getElementById('notifDrawer')?.classList.remove('hidden');
    document.getElementById('notifDrawer')?.classList.add('open');
  }
  function closeNotifDrawer() {
    document.getElementById('notifDrawer')?.classList.add('hidden');
    document.getElementById('notifDrawer')?.classList.remove('open');
  }

  // ── Sidebar toggle ─────────────────────────────────────────
  function initSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── Progress bar renderer ──────────────────────────────────
  function renderProgressBar(pct, label = '', colorOverride = null) {
    const color = colorOverride || (pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-accent)' : 'var(--color-warning)');
    return `
      <div class="progress-wrap">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${Math.min(100,pct)}%;background:${color}"></div>
        </div>
        <span class="progress-label">${label || pct + '%'}</span>
      </div>`;
  }

  // ── Badge renderer ─────────────────────────────────────────
  function badge(text, cls) {
    return `<span class="badge ${cls}">${UTILS.escapeHtml(text)}</span>`;
  }

  return {
    showLoader, hideLoader, showToast, showSectionLoader, showEmptyState,
    setPageUser, showModal, closeModal, confirm, openNotifDrawer, closeNotifDrawer,
    initSidebarToggle, renderProgressBar, badge
  };
})();
