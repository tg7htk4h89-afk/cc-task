// /assets/js/sales.js
// KIB Operations Portal — Sales Performance Module

const SALES = (() => {
  let filters = { date: UTILS.todayKuwait(), shift_type: '', team: '', period: 'today' };
  let rankChart, trendChart;

  async function init() {
    AUTH.requireAuth();
    UI.setPageUser(AUTH.getSession());
    UI.initSidebarToggle();
    applyRoleUI();
    await loadSales();
    bindEvents();
  }

  function applyRoleUI() {
    const canEntry = AUTH.canDo('sales.entry');
    document.getElementById('btnSalesEntry') && (document.getElementById('btnSalesEntry').style.display = canEntry ? '' : 'none');
  }

  async function loadSales() {
    UI.showSectionLoader('salesRankings');
    try {
      const data = await API.get('/api/sales/dashboard', filters);
      renderKPIs(data.summary || {});
      renderRankings(data.rankings || []);
      renderCharts(data);
    } catch (e) {
      UI.showEmptyState('salesRankings', 'Failed to load sales data');
    }
  }

  function renderKPIs(s) {
    setText('saleTotal',   UTILS.formatCurrency(s.total_amount || 0));
    setText('saleTotalCt', `${s.total_count || 0} transactions`);
    setText('saleTarget',  UTILS.formatCurrency(s.total_target || 0));
    setText('saleAch',     `${s.achievement_pct || 0}%`);
    setText('saleTop',     s.top_performer || '—');
    setText('saleShift',   s.best_shift || '—');
  }

  function renderRankings(rankings) {
    const container = document.getElementById('salesRankings');
    if (!container) return;
    if (!rankings.length) { UI.showEmptyState('salesRankings', 'No sales data for selected period'); return; }
    container.innerHTML = rankings.map((r, i) => `
      <div class="rank-row ${i === 0 ? 'rank-first' : i === 1 ? 'rank-second' : i === 2 ? 'rank-third' : ''}">
        <div class="rank-pos">${i + 1}</div>
        <div class="rank-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</div>
        <div class="rank-name">${UTILS.escapeHtml(r.employee_name)}</div>
        <div class="rank-team text-muted">${UTILS.escapeHtml(r.employee_team || '')}</div>
        <div class="rank-amount">${UTILS.formatCurrency(r.total_amount || 0)}</div>
        <div class="rank-count">${r.total_count || 0} deals</div>
        <div class="rank-ach" style="color:${UTILS.scoreColor(r.achievement_pct || 0)};font-weight:700">
          ${r.achievement_pct || 0}%
        </div>
        ${UI.renderProgressBar(Math.min(r.achievement_pct || 0, 100), '')}
      </div>`).join('');
  }

  function renderCharts(data) {
    // Rankings bar chart
    const ctx1 = document.getElementById('rankChart')?.getContext('2d');
    if (ctx1 && data.rankings?.length) {
      if (rankChart) rankChart.destroy();
      const top10 = data.rankings.slice(0, 10);
      rankChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: top10.map(r => r.employee_name.split(' ')[0]),
          datasets: [
            { label: 'Sales (KWD)', data: top10.map(r => r.total_amount || 0), backgroundColor: '#1B85B8', borderRadius: 4 },
            { label: 'Target (KWD)', data: top10.map(r => r.total_target || 0), backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
      });
    }

    // Trend line chart
    const ctx2 = document.getElementById('trendChart')?.getContext('2d');
    if (ctx2 && data.trend) {
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: data.trend.map(t => UTILS.formatDate(t.date)),
          datasets: [{
            label: 'Daily Sales (KWD)',
            data: data.trend.map(t => t.amount),
            borderColor: '#1B85B8', backgroundColor: 'rgba(27,133,184,0.1)',
            tension: 0.4, fill: true, pointRadius: 4,
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }
  }

  // ── Sales Entry ────────────────────────────────────────────
  async function submitEntry(payload) {
    try {
      await API.post('/api/sales/entry', payload);
      UI.showToast('Sales record saved', 'success');
      loadSales();
      return true;
    } catch (e) { return false; }
  }

  function bindEvents() {
    document.getElementById('filterDate')?.addEventListener('change', e => { filters.date = e.target.value; loadSales(); });
    document.getElementById('filterShift')?.addEventListener('change', e => { filters.shift_type = e.target.value; loadSales(); });
    document.getElementById('filterPeriod')?.addEventListener('change', e => { filters.period = e.target.value; loadSales(); });
    document.getElementById('btnSalesEntry')?.addEventListener('click', () => showSalesEntryModal());
    document.getElementById('btnRefresh')?.addEventListener('click', loadSales);
  }

  function showSalesEntryModal() {
    const body = `
      <div class="form-group">
        <label>Product / Category</label>
        <select id="meProduct">
          ${CONFIG.sales_products.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Sales Count</label>
          <input type="number" id="meSalesCount" min="0" value="0">
        </div>
        <div class="form-group">
          <label>Amount (KWD)</label>
          <input type="number" id="meSalesAmount" min="0" step="0.001" value="0">
        </div>
      </div>
      <div class="form-group">
        <label>Daily Target (KWD)</label>
        <input type="number" id="meSalesTarget" min="0" step="0.001" value="0">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input type="text" id="meSalesNotes" placeholder="Optional">
      </div>`;
    UI.showModal('Add Sales Record', body,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="SALES.saveEntry()">Save</button>`);
  }

  async function saveEntry() {
    const session = AUTH.getSession();
    const payload = {
      date: UTILS.todayKuwait(),
      shift_type: filters.shift_type || CONFIG.shift_types[0],
      product_or_category: document.getElementById('meProduct')?.value,
      sales_count: Number(document.getElementById('meSalesCount')?.value || 0),
      sales_amount: Number(document.getElementById('meSalesAmount')?.value || 0),
      sales_target: Number(document.getElementById('meSalesTarget')?.value || 0),
      notes: document.getElementById('meSalesNotes')?.value,
    };
    const ok = await submitEntry(payload);
    if (ok) UI.closeModal();
  }

  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  return { init, submitEntry, saveEntry };
})();
