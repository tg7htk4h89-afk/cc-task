// /assets/js/tasks.js
// KIB Operations Portal — Task Management Module

const TASKS = (() => {
  let filters = { status: '', priority: '', category: '', team: '', search: '', page: 1, limit: 25, sort: 'due_datetime:asc' };
  let lookups = {};

  async function init() {
    AUTH.requireAuth();
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    applyRoleUI();
    await loadLookups();
    await loadTasks();
    bindEvents();
  }

  function applyRoleUI() {
    const canCreate = AUTH.canDo('tasks.create');
    const canReassign = AUTH.canDo('tasks.reassign');
    document.getElementById('btnCreateTask') && (document.getElementById('btnCreateTask').style.display = canCreate ? '' : 'none');
    document.querySelectorAll('.btn-reassign').forEach(b => b.style.display = canReassign ? '' : 'none');
  }

  async function loadLookups() {
    try { lookups = await API.get('/api/lookups'); } catch (e) {}
  }

  async function loadTasks() {
    UI.showSectionLoader('taskListBody');
    try {
      const data = await API.get('/api/tasks/list', { ...filters });
      renderTaskTable(data.tasks || []);
      renderPagination(data.total || 0);
      updateStatusCounts(data.counts || {});
    } catch (e) {
      UI.showEmptyState('taskListBody', 'Failed to load tasks', 'Check your connection and try again');
    }
  }

  function renderTaskTable(tasks) {
    const body = document.getElementById('taskListBody');
    if (!body) return;
    if (!tasks.length) { UI.showEmptyState('taskListBody', 'No tasks match your filters'); return; }
    body.innerHTML = tasks.map(t => {
      const tr = UTILS.timeRemaining(t.due_datetime);
      return `
        <tr class="${t.is_overdue === 'TRUE' || t.is_overdue === true ? 'row-overdue' : ''}"
            onclick="TASKS.openDetail('${t.task_id}')" style="cursor:pointer">
          <td>
            <span class="priority-dot" style="background:${UTILS.priorityColor(t.priority)}" title="${t.priority}"></span>
            <span class="task-id-cell mono">${t.task_id}</span>
          </td>
          <td>
            <div class="task-title-cell">${UTILS.escapeHtml(t.title)}</div>
            <div class="task-meta-cell">${UTILS.escapeHtml(t.category)}</div>
          </td>
          <td>${UTILS.escapeHtml(t.assigned_to_name)}</td>
          <td>${UI.badge(t.priority, 'badge-' + priorityBadge(t.priority))}</td>
          <td>${UI.badge(t.status, UTILS.statusBadgeClass(t.status))}</td>
          <td>
            <span class="${tr.overdue ? 'text-danger' : tr.urgent ? 'text-warning' : ''}" style="font-size:12px;font-weight:600">${tr.label}</span>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="progress-bar-wrap" style="width:60px">
                <div class="progress-bar-fill" style="width:${t.progress_percentage || 0}%"></div>
              </div>
              <span style="font-size:12px">${t.progress_percentage || 0}%</span>
            </div>
          </td>
          <td onclick="event.stopPropagation()">
            <button class="btn btn-secondary btn-xs" onclick="TASKS.openDetail('${t.task_id}')">View</button>
          </td>
        </tr>`;
    }).join('');
  }

  function priorityBadge(p) {
    return { Low: 'green', Medium: 'yellow', High: 'red', Critical: 'purple' }[p] || 'gray';
  }

  function renderPagination(total) {
    const pages = Math.ceil(total / filters.limit);
    const pag = document.getElementById('pagination');
    if (!pag || pages <= 1) { if (pag) pag.innerHTML = ''; return; }
    pag.innerHTML = `
      <button class="btn btn-secondary btn-xs" onclick="TASKS.changePage(${filters.page - 1})" ${filters.page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span style="font-size:12px;color:var(--text-muted)">Page ${filters.page} of ${pages} (${total} tasks)</span>
      <button class="btn btn-secondary btn-xs" onclick="TASKS.changePage(${filters.page + 1})" ${filters.page >= pages ? 'disabled' : ''}>Next →</button>`;
  }

  function updateStatusCounts(counts) {
    Object.entries(counts).forEach(([status, count]) => {
      const el = document.getElementById(`count-${status}`);
      if (el) el.textContent = count;
    });
  }

  function openDetail(taskId) {
    window.location.href = `/task-detail.html?id=${taskId}`;
  }

  function changePage(page) {
    if (page < 1) return;
    filters.page = page;
    loadTasks();
  }

  function setFilter(key, value) {
    filters[key] = value;
    filters.page = 1;
    loadTasks();
  }

  function bindEvents() {
    document.getElementById('filterStatus')?.addEventListener('change', e => setFilter('status', e.target.value));
    document.getElementById('filterPriority')?.addEventListener('change', e => setFilter('priority', e.target.value));
    document.getElementById('filterCategory')?.addEventListener('change', e => setFilter('category', e.target.value));
    document.getElementById('filterTeam')?.addEventListener('change', e => setFilter('team', e.target.value));
    document.getElementById('searchInput')?.addEventListener('input', UTILS.debounce(e => setFilter('search', e.target.value), 400));
    document.getElementById('btnCreateTask')?.addEventListener('click', () => { window.location.href = '/task-form.html'; });
    document.getElementById('btnRefresh')?.addEventListener('click', loadTasks);
  }

  return { init, openDetail, changePage, setFilter };
})();
