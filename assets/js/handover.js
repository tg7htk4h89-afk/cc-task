// /assets/js/handover.js
// KIB Operations Portal — Shift Handover Module

const HANDOVER = (() => {
  let filters = { date: UTILS.todayKuwait(), shift_type: '', page: 1, limit: 20 };

  // ── Dashboard init ─────────────────────────────────────────
  async function initDashboard() {
    AUTH.requireAuth();
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    applyRoleUI();
    await loadHandovers();
    bindDashboardEvents();
  }

  function applyRoleUI() {
    const canSubmit = AUTH.canDo('handover.submit');
    const canReview = AUTH.canDo('handover.review');
    document.getElementById('btnNewHandover') && (document.getElementById('btnNewHandover').style.display = canSubmit ? '' : 'none');
    document.querySelectorAll('.btn-review-handover').forEach(b => b.style.display = canReview ? '' : 'none');
  }

  async function loadHandovers() {
    UI.showSectionLoader('handoverGrid');
    try {
      const data = await API.get('/api/handover/list', filters);
      renderHandoverGrid(data.handovers || []);
      renderHandoverSummary(data.summary || {});
    } catch (e) {
      UI.showEmptyState('handoverGrid', 'Failed to load handovers');
    }
  }

  function renderHandoverGrid(handovers) {
    const grid = document.getElementById('handoverGrid');
    if (!grid) return;
    if (!handovers.length) { UI.showEmptyState('handoverGrid', 'No handovers for selected date/shift'); return; }
    grid.innerHTML = handovers.map(h => `
      <div class="handover-card ${h.submission_status === 'Missing' ? 'missing' : ''}"
           onclick="HANDOVER.openDetail('${h.handover_id}')">
        <div class="handover-card-header">
          <span class="shift-pill ${h.shift_type.toLowerCase()}">${h.shift_type}</span>
          ${UI.badge(h.submission_status, statusBadge(h.submission_status))}
          ${h.is_late_submission === 'TRUE' ? UI.badge('Late', 'badge-orange') : ''}
        </div>
        <div class="handover-submitter">${UTILS.escapeHtml(h.submitted_by_name || '—')}</div>
        <div class="handover-team">${UTILS.escapeHtml(h.team || '')}</div>
        <div class="handover-meta">
          <span>👥 ${h.staffing_count || '—'} staff</span>
          <span>📦 ${h.sales_count || 0} sales</span>
          <span>💰 ${UTILS.formatCurrency(h.sales_summary_amount || 0)}</span>
        </div>
        <div class="handover-quality">
          Quality: <strong style="color:${UTILS.scoreColor(h.handover_quality_score || 0)}">${h.handover_quality_score || '—'}</strong>/100
        </div>
        <div class="handover-submitted-time">${UTILS.formatDateTime(h.submitted_datetime)}</div>
      </div>`).join('');
  }

  function statusBadge(status) {
    return { Draft: 'badge-gray', Submitted: 'badge-blue', Reviewed: 'badge-green', Missing: 'badge-red' }[status] || 'badge-gray';
  }

  function renderHandoverSummary(summary) {
    setText('hoSubmitted', summary.submitted || 0);
    setText('hoMissing',   summary.missing   || 0);
    setText('hoLate',      summary.late      || 0);
    setText('hoAvgScore',  summary.avg_quality ? Math.round(summary.avg_quality) : '—');
  }

  function openDetail(handoverId) {
    window.location.href = `/handover-detail.html?id=${handoverId}`;
  }

  function bindDashboardEvents() {
    document.getElementById('filterDate')?.addEventListener('change', e => { filters.date = e.target.value; filters.page = 1; loadHandovers(); });
    document.getElementById('filterShift')?.addEventListener('change', e => { filters.shift_type = e.target.value; filters.page = 1; loadHandovers(); });
    document.getElementById('btnNewHandover')?.addEventListener('click', () => { window.location.href = '/handover-form.html'; });
    document.getElementById('btnCompare')?.addEventListener('click', loadCompare);
  }

  // ── Compare view ───────────────────────────────────────────
  async function loadCompare() {
    try {
      const data = await API.get('/api/handover/compare', { date: filters.date });
      renderCompare(data.comparison || []);
    } catch (e) {}
  }

  function renderCompare(rows) {
    const panel = document.getElementById('comparePanel');
    if (!panel) return;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <h3 style="margin-bottom:16px">Shift Comparison — ${filters.date}</h3>
      <div class="compare-grid">
        ${rows.map(r => `
          <div class="compare-card">
            <div class="compare-shift">${r.shift_type}</div>
            <div class="compare-submitter">${UTILS.escapeHtml(r.submitted_by || 'Not submitted')}</div>
            <div class="compare-row"><span>Staff</span><strong>${r.staffing_count || '—'}</strong></div>
            <div class="compare-row"><span>Sales Count</span><strong>${r.sales_count || 0}</strong></div>
            <div class="compare-row"><span>Sales Amount</span><strong>${UTILS.formatCurrency(r.sales_amount || 0)}</strong></div>
            <div class="compare-row"><span>Unresolved Items</span><strong>${r.unresolved_count || 0}</strong></div>
            <div class="compare-row"><span>Escalations</span><strong>${r.escalated_count || 0}</strong></div>
            <div class="compare-row"><span>Quality Score</span>
              <strong style="color:${UTILS.scoreColor(r.handover_quality_score || 0)}">${r.handover_quality_score || '—'}</strong>
            </div>
            ${r.is_late ? UI.badge('Late Submission', 'badge-orange') : ''}
          </div>`).join('')}
      </div>`;
  }

  // ── Form init ──────────────────────────────────────────────
  async function initForm() {
    AUTH.requireAuth();
    if (!AUTH.canDo('handover.submit')) { window.location.href = '/handover.html'; return; }
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    populateFormDefaults();
    bindFormEvents();
  }

  function populateFormDefaults() {
    const dateEl = document.getElementById('hoDate');
    if (dateEl) dateEl.value = UTILS.todayKuwait();
    const session = AUTH.getSession();
    const teamEl = document.getElementById('hoTeam');
    if (teamEl) teamEl.value = session?.team || '';
  }

  function bindFormEvents() {
    document.getElementById('handoverForm')?.addEventListener('submit', submitHandover);
    document.getElementById('btnAddItem')?.addEventListener('click', addChecklistItem);
  }

  async function submitHandover(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;

    const items = [];
    document.querySelectorAll('.checklist-item-row').forEach(row => {
      items.push({
        type: row.querySelector('.item-type')?.value,
        description: row.querySelector('.item-desc')?.value,
        priority: row.querySelector('.item-priority')?.value,
      });
    });

    const payload = {
      date:          form.hoDate?.value,
      shift_type:    form.hoShift?.value,
      shift_start_time: form.hoStart?.value,
      shift_end_time:   form.hoEnd?.value,
      staffing_count: Number(form.hoStaffCount?.value || 0),
      team:          form.hoTeam?.value,
      key_updates:   form.hoKeyUpdates?.value,
      pending_items: form.hoPending?.value,
      escalated_items: form.hoEscalated?.value,
      customer_issues: form.hoCustomer?.value,
      system_issues:   form.hoSystem?.value,
      unresolved_items: form.hoUnresolved?.value,
      priority_items_next_shift: form.hoPriorityNext?.value,
      sales_summary_count: Number(form.hoSalesCount?.value || 0),
      sales_summary_amount: Number(form.hoSalesAmount?.value || 0),
      submission_status: 'Submitted',
      checklist_items: items,
    };

    try {
      await API.post('/api/handover/create', payload);
      UI.showToast('Handover submitted successfully', 'success');
      setTimeout(() => { window.location.href = '/handover.html'; }, 1500);
    } catch (e) {
      btn.disabled = false;
    }
  }

  function addChecklistItem() {
    const container = document.getElementById('checklistItems');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'checklist-item-row';
    row.innerHTML = `
      <select class="item-type">
        <option value="pending">Pending</option>
        <option value="escalated">Escalated</option>
        <option value="customer_issue">Customer Issue</option>
        <option value="system_issue">System Issue</option>
        <option value="followup">Follow-up</option>
      </select>
      <input type="text" class="item-desc" placeholder="Describe the item..." style="flex:1">
      <select class="item-priority">
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Low">Low</option>
      </select>
      <button type="button" onclick="this.closest('.checklist-item-row').remove()" class="btn btn-danger btn-xs">✕</button>`;
    container.appendChild(row);
  }

  function setText(id, val) {
    const el = document.getElementById(id); if (el) el.textContent = val;
  }

  return { initDashboard, initForm, openDetail };
})();
