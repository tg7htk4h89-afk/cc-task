// /assets/js/components.js
// KIB Operations Portal — Shared UI Component Templates

const COMPONENTS = (() => {

  function sidebarHTML(activePage) {
    const nav = [
      { href: '/index.html',        icon: 'grid',         label: 'Dashboard',    page: 'dashboard', roles: '' },
      { href: '/tasks.html',        icon: 'check-square', label: 'Tasks',        page: 'tasks',     roles: '' },
      { href: '/handover.html',     icon: 'repeat',       label: 'Handover',     page: 'handover',  roles: '' },
      { href: '/training.html',     icon: 'book-open',    label: 'Training',     page: 'training',  roles: '' },
      { href: '/sales.html',        icon: 'trending-up',  label: 'Sales',        page: 'sales',     roles: '' },
      { href: '/notifications.html',icon: 'bell',         label: 'Notifications',page: 'notif',     roles: '' },
      { href: '/settings.html',     icon: 'settings',     label: 'Settings',     page: 'settings',  roles: 'HoD' },
    ];
    return `
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div style="width:30px;height:30px;background:var(--color-accent);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:11px;letter-spacing:-1px">KIB</div>
          <span class="sidebar-title">Ops Portal</span>
        </div>
        <ul class="sidebar-nav">
          ${nav.map(item => `
            <li class="nav-item ${activePage === item.page ? 'active' : ''}" ${item.roles ? `data-roles="${item.roles}"` : ''}>
              <a href="${item.href}">
                <i data-feather="${item.icon}"></i>
                ${item.label}
              </a>
            </li>`).join('')}
        </ul>
        <div class="sidebar-footer">
          <div class="user-avatar" id="avatarInitials">?</div>
          <div class="user-info">
            <div class="user-name" id="sidebarName">Loading...</div>
            <div class="user-role" id="sidebarRole">—</div>
          </div>
          <button class="btn-logout" onclick="AUTH.logout()" title="Sign Out">
            <i data-feather="log-out"></i>
          </button>
        </div>
      </nav>`;
  }

  function topBarHTML(pageTitle, breadcrumb = '') {
    return `
      <header class="top-bar">
        <button class="sidebar-toggle" id="sidebarToggle">
          <i data-feather="menu"></i>
        </button>
        <div class="breadcrumb">${pageTitle}${breadcrumb ? ' / ' + breadcrumb : ''}</div>
        <div class="top-bar-actions">
          <div class="search-bar">
            <i data-feather="search"></i>
            <input type="text" placeholder="Search..." id="globalSearch">
          </div>
          <button class="notif-bell" id="notifBell" onclick="UI.openNotifDrawer()">
            <i data-feather="bell"></i>
            <span class="notif-badge hidden" id="notifCount">0</span>
          </button>
          <span class="date-display" id="currentDate"></span>
        </div>
      </header>`;
  }

  function notifDrawerHTML() {
    return `
      <div class="notif-drawer hidden" id="notifDrawer">
        <div class="notif-drawer-header">
          <h3>Notifications</h3>
          <button onclick="NOTIFICATIONS.markAllRead()">Mark all read</button>
          <button onclick="UI.closeNotifDrawer()">✕</button>
        </div>
        <div class="notif-list" id="notifDrawerList">
          <div class="notif-empty">Loading...</div>
        </div>
      </div>`;
  }

  function standardScripts(extraScripts = '') {
    return `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/feather-icons/4.29.0/feather.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>
  <script src="/assets/js/config.js"><\/script>
  <script src="/assets/js/utils.js"><\/script>
  <script src="/assets/js/ui.js"><\/script>
  <script src="/assets/js/api.js"><\/script>
  <script src="/assets/js/auth.js"><\/script>
  <script src="/assets/js/components.js"><\/script>
  <script src="/assets/js/notifications.js"><\/script>
  ${extraScripts}`;
  }

  // Render a user chip (for assignee display)
  function userChip(name, role = '') {
    const initials = UTILS.getInitials(name);
    return `<span class="user-chip-inline" title="${UTILS.escapeHtml(name)} — ${role}">
      <span class="user-chip-avatar" style="background:var(--color-primary)">${initials}</span>
      <span>${UTILS.escapeHtml(name)}</span>
    </span>`;
  }

  return { sidebarHTML, topBarHTML, notifDrawerHTML, standardScripts, userChip };
})();
