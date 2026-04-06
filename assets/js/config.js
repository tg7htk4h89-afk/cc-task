// KIB Operations Portal — Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbybaA6t5DeEIkSW8hMw42g-ZKx-EhQ39O2pzdf6mGA1KlouF3jNoapMU2dok3PTUiENTg/exec';

const API = {
  async get(action, params) {
    const url = new URL(GAS_URL);
    url.searchParams.set('action', action);
    const s = AUTH ? AUTH.getSession() : null;
    if (s) url.searchParams.set('session_token', s.session_token);
    Object.keys(params || {}).forEach(k => url.searchParams.set(k, params[k]));
    const res  = await fetch(url.toString());
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'API error');
    return data.data;
  },
  async post(action, body) {
    const s = AUTH ? AUTH.getSession() : null;
    if (s) body.session_token = s.session_token;
    body.action = action;
    const res  = await fetch(GAS_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'API error');
    return data.data;
  }
};

const CONFIG = Object.freeze({
  gas_url:              GAS_URL,
  session_key:          'kib_ops_session',
  session_duration_hrs: 8,
  polling_interval_ms:  60000,
  kuwait_tz_offset_hrs: 3,
  shift_types:     ['Morning','Afternoon','Evening','Night'],
  priority_levels: ['Low','Medium','High','Critical'],
  task_statuses:   ['New','Assigned','InProgress','Pending','WaitingInput','UnderReview','Completed','Cancelled','Overdue','Escalated'],
  task_categories: ['Managerial','Operational','QA','BackOffice','TeamLeadership','AssistantLeadership','Compliance','FollowUp','Escalation','Handover','Coaching','Training','Sales','General'],
  training_categories: ['Product','Procedure','Compliance','Soft Skills','Systems','Sales Technique','QA','General'],
  sales_products:  ['Current Account','Savings','Cards','Personal Finance','Investment','General'],
  sla_options_hours: [1,2,3,4,5,6,7],
  sla_options_days:  [1,2,3,4,5,6,7,14,30],
});
