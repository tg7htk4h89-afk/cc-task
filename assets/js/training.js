// /assets/js/training.js
// KIB Operations Portal — Coaching & Training Module

const TRAINING = (() => {
  let filters = { status: '', employee: '', trainer: '', category: '', page: 1, limit: 20 };

  async function initDashboard() {
    AUTH.requireAuth();
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    applyRoleUI();
    await loadTraining();
    bindEvents();
  }

  function applyRoleUI() {
    const canCreate = AUTH.canDo('training.create');
    document.getElementById('btnCreatePlan') && (document.getElementById('btnCreatePlan').style.display = canCreate ? '' : 'none');
  }

  async function loadTraining() {
    UI.showSectionLoader('trainingCards');
    try {
      const data = await API.get('/api/training/dashboard', filters);
      renderSummaryKPIs(data.summary || {});
      renderTrainingCards(data.plans || []);
      renderDelayedList(data.delayed || []);
    } catch (e) {
      UI.showEmptyState('trainingCards', 'Failed to load training data');
    }
  }

  function renderSummaryKPIs(s) {
    setText('trnActive',    s.active    || 0);
    setText('trnDelayed',   s.delayed   || 0);
    setText('trnCompleted', s.completed || 0);
    setText('trnAvgPct',    s.avg_progress ? Math.round(s.avg_progress) + '%' : '—');
  }

  function renderTrainingCards(plans) {
    const container = document.getElementById('trainingCards');
    if (!container) return;
    if (!plans.length) { UI.showEmptyState('trainingCards', 'No training plans found'); return; }
    container.innerHTML = plans.map(p => {
      const trend = UTILS.trendBadge(p.trend_status);
      const daysLeft = UTILS.daysUntil(p.target_completion_date);
      return `
        <div class="training-card ${p.status === 'Delayed' ? 'delayed' : ''}"
             onclick="TRAINING.openDetail('${p.training_id}')">
          <div class="training-card-header">
            <span class="training-category-tag">${UTILS.escapeHtml(p.category)}</span>
            ${UI.badge(p.status, statusBadge(p.status))}
            ${UI.badge(trend.label, trend.cls)}
          </div>
          <div class="training-subject">${UTILS.escapeHtml(p.subject)}</div>
          <div class="training-people">
            <span>👤 ${UTILS.escapeHtml(p.employee_name)}</span>
            <span>🎓 ${UTILS.escapeHtml(p.trainer_name)}</span>
          </div>
          ${UI.renderProgressBar(p.progress_percentage || 0, `${p.completed_quantity || 0} / ${p.target_quantity || 0}`)}
          <div class="training-footer">
            <span class="${daysLeft < 0 ? 'text-danger' : daysLeft <= 3 ? 'text-warning' : 'text-muted'}">
              ${daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
            </span>
            <span class="text-muted">${UTILS.formatDate(p.target_completion_date)}</span>
          </div>
        </div>`;
    }).join('');
  }

  function statusBadge(s) {
    const m = { Planned:'badge-gray', Assigned:'badge-indigo', Started:'badge-blue', InProgress:'badge-yellow',
                PendingReview:'badge-orange', Completed:'badge-green', Delayed:'badge-red', Cancelled:'badge-gray' };
    return m[s] || 'badge-gray';
  }

  function renderDelayedList(delayed) {
    const list = document.getElementById('delayedList');
    if (!list) return;
    if (!delayed.length) { list.innerHTML = '<div class="empty-state-sm">✅ No delayed plans</div>'; return; }
    list.innerHTML = delayed.map(p => `
      <div class="delayed-item" onclick="TRAINING.openDetail('${p.training_id}')">
        <div class="delayed-name">${UTILS.escapeHtml(p.employee_name)}</div>
        <div class="delayed-subject">${UTILS.escapeHtml(p.subject)}</div>
        <div class="delayed-pct">${p.progress_percentage || 0}%</div>
      </div>`).join('');
  }

  function openDetail(trainingId) {
    window.location.href = `training-detail.html?id=${trainingId}`;
  }

  // ── Progress Update Form ───────────────────────────────────
  async function submitProgress(trainingId, qty, notes) {
    try {
      await API.post('/api/training/progress', {
        training_id: trainingId,
        qty_completed_today: Number(qty),
        session_notes: notes,
      });
      UI.showToast('Progress updated', 'success');
      return true;
    } catch (e) { return false; }
  }

  // ── Create Plan Form ───────────────────────────────────────
  async function initForm() {
    AUTH.requireAuth();
    if (!AUTH.canDo('training.create')) { window.location.href='training.html'; return; }
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    document.getElementById('trnStartDate') && (document.getElementById('trnStartDate').value = UTILS.todayKuwait());
    document.getElementById('trainingForm')?.addEventListener('submit', submitCreatePlan);
  }

  async function submitCreatePlan(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      employee_user_id:       form.trnEmployee?.value,
      trainer_user_id:        form.trnTrainer?.value,
      subject:                form.trnSubject?.value,
      category:               form.trnCategory?.value,
      description:            form.trnDescription?.value,
      start_date:             form.trnStartDate?.value,
      target_completion_date: form.trnTargetDate?.value,
      target_quantity:        Number(form.trnTargetQty?.value || 0),
      next_review_date:       form.trnReviewDate?.value,
    };
    try {
      await API.post('/api/training/create', payload);
      UI.showToast('Training plan created', 'success');
      setTimeout(() => { window.location.href='training.html'; }, 1500);
    } catch (e) {}
  }

  function bindEvents() {
    document.getElementById('filterStatus')?.addEventListener('change', e => { filters.status = e.target.value; loadTraining(); });
    document.getElementById('btnCreatePlan')?.addEventListener('click', () => { window.location.href='training-form.html'; });
    document.getElementById('btnRefresh')?.addEventListener('click', loadTraining);
  }

  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  return { initDashboard, initForm, openDetail, submitProgress };
})();
