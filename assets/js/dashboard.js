// /assets/js/dashboard.js
// KIB Operations Portal — Main Dashboard

const DASHBOARD = (() => {
  let taskChart, salesChart, scoreChart;

  async function init() {
    AUTH.requireAuth();
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    await loadDashboard();
  }

  async function loadDashboard() {
    try {
      const data = await API.get('/api/dashboard/summary');
      renderKPIs(data);
      renderCharts(data);
      renderAlerts(data.alerts || []);
      renderTrainingMini(data.training_mini || []);
      renderScore(data.scores || {});
    } catch (e) {
      UI.showToast('Could not load dashboard data.', 'error');
    }
  }

  function renderKPIs(data) {
    setText('kpiTasksOpen',    data.tasks?.open ?? '—');
    setText('kpiTasksSub',     `${data.tasks?.total ?? 0} total tasks`);
    setText('kpiOverdue',      data.tasks?.overdue ?? '—');
    setText('kpiSLARate',      `${data.tasks?.completion_rate ?? 0}% completion`);
    setText('kpiHandoverSubmitted', `${data.handovers?.today_submitted ?? 0} submitted`);
    const missing = data.handovers?.today_missing ?? 0;
    const missingEl = document.getElementById('kpiHandoverMissing');
    if (missingEl) {
      missingEl.textContent = missing > 0 ? `${missing} missing` : 'All submitted';
      missingEl.className = 'kpi-sub' + (missing > 0 ? ' danger-text' : '');
    }
    setText('kpiSalesAmt',     UTILS.formatCurrency(data.sales?.today_amount ?? 0));
    setText('kpiSalesAch',     `${data.sales?.achievement_pct ?? 0}% of target`);
  }

  function renderCharts(data) {
    // Task completion weekly bar chart
    const ctx1 = document.getElementById('taskCompletionChart')?.getContext('2d');
    if (ctx1) {
      if (taskChart) taskChart.destroy();
      taskChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: data.tasks?.weekly_labels || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
          datasets: [
            { label: 'Completed', data: data.tasks?.weekly_completed || [0,0,0,0,0,0,0], backgroundColor: 'rgba(27,133,184,0.8)', borderRadius: 4 },
            { label: 'Overdue',   data: data.tasks?.weekly_overdue   || [0,0,0,0,0,0,0], backgroundColor: 'rgba(239,68,68,0.7)',   borderRadius: 4 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { family: 'IBM Plex Sans', size: 12 } } } },
          scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
        }
      });
    }

    // Sales by shift doughnut
    const ctx2 = document.getElementById('salesByShiftChart')?.getContext('2d');
    if (ctx2) {
      if (salesChart) salesChart.destroy();
      salesChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: data.sales?.shift_labels || ['Morning','Afternoon','Evening','Night'],
          datasets: [{ data: data.sales?.shift_amounts || [0,0,0,0], backgroundColor: ['#0F4C75','#1B85B8','#22c55e','#f59e0b'], borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans', size: 12 } } } }
        }
      });
    }
  }

  function renderScore(scores) {
    const myScore = scores.my_today ?? 0;
    setText('myScore', Math.round(myScore));
    const ctx = document.getElementById('scoreRingChart')?.getContext('2d');
    if (ctx) {
      if (scoreChart) scoreChart.destroy();
      scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [myScore, 100 - myScore],
            backgroundColor: [UTILS.scoreColor(myScore), '#e2e8f0'],
            borderWidth: 0,
          }]
        },
        options: { cutout: '78%', plugins: { legend: { display: false } }, animation: { duration: 800 } }
      });
    }

    const breakdown = document.getElementById('scoreBreakdown');
    if (breakdown && scores.breakdown) {
      breakdown.innerHTML = Object.entries(scores.breakdown).map(([key, val]) => `
        <div class="score-row">
          <span class="score-row-label">${CONFIG.score_labels[key] || key}</span>
          <span class="score-row-val" style="color:${UTILS.scoreColor(val)}">${Math.round(val)}</span>
        </div>`).join('');
    }
  }

  function renderAlerts(alerts) {
    const list = document.getElementById('alertList');
    if (!list) return;
    if (!alerts.length) { list.innerHTML = '<div class="empty-state-sm">No active alerts</div>'; return; }
    list.innerHTML = alerts.map(a => `
      <div class="alert-item sev-${a.severity}">
        <div class="alert-icon">${a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : 'ℹ️'}</div>
        <div class="alert-content">
          <div class="alert-title">${UTILS.escapeHtml(a.title)}</div>
          <div class="alert-time">${UTILS.formatDateTime(a.created_datetime)}</div>
        </div>
      </div>`).join('');
  }

  function renderTrainingMini(plans) {
    const list = document.getElementById('trainingMiniList');
    if (!list) return;
    if (!plans.length) { list.innerHTML = '<div class="empty-state-sm">No active plans</div>'; return; }
    list.innerHTML = plans.slice(0, 5).map(p => `
      <div class="training-mini-item">
        <div class="training-mini-name">${UTILS.escapeHtml(p.employee_name)}</div>
        <div class="training-mini-subject">${UTILS.escapeHtml(p.subject)}</div>
        ${UI.renderProgressBar(p.progress_percentage, p.progress_percentage + '%')}
        ${UI.badge(p.trend_status || 'OnTrack', UTILS.trendBadge(p.trend_status).cls)}
      </div>`).join('');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { init };
})();
