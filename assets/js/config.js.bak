// /assets/js/config.js
// KIB Operations Portal — Configuration
// UPDATE n8n_base_url before deployment

const CONFIG = Object.freeze({
  n8n_base_url: 'https://YOUR-N8N-INSTANCE.app.n8n.cloud/webhook',

  session_key: 'kib_ops_session',
  session_duration_hrs: 8,
  polling_interval_ms: 60000,

  kuwait_tz_offset_hrs: 3,

  sla_options_hours: [1, 2, 3, 4, 5, 6, 7],
  sla_options_days:  [1, 2, 3, 4, 5, 6, 7, 14, 30],

  shift_types: ['Morning', 'Afternoon', 'Evening', 'Night'],
  priority_levels: ['Low', 'Medium', 'High', 'Critical'],

  task_statuses: ['New','Assigned','InProgress','Pending','WaitingInput','UnderReview','Completed','Cancelled','Overdue','Escalated'],
  task_categories: ['Managerial','Operational','QA','BackOffice','TeamLeadership','AssistantLeadership','Compliance','FollowUp','Escalation','Handover','Coaching','Training','Sales','General'],
  training_statuses: ['Planned','Assigned','Started','InProgress','PendingReview','Completed','Delayed','Cancelled'],
  training_categories: ['Product','Procedure','Compliance','Soft Skills','Systems','Sales Technique','QA','General'],
  sales_products: ['Current Account','Savings','Cards','Personal Finance','Investment','General'],

  pages: {
    login:         '/login.html',
    dashboard:     '/index.html',
    tasks:         '/tasks.html',
    taskDetail:    '/task-detail.html',
    taskForm:      '/task-form.html',
    recurring:     '/recurring.html',
    handover:      '/handover.html',
    handoverForm:  '/handover-form.html',
    handoverDetail:'/handover-detail.html',
    training:      '/training.html',
    trainingForm:  '/training-form.html',
    trainingDetail:'/training-detail.html',
    sales:         '/sales.html',
    notifications: '/notifications.html',
    settings:      '/settings.html',
  },

  handover_roles: ['HoD', 'Manager', 'TL', 'AL'],
  sales_roles:    ['HoD', 'Manager', 'TL', 'AL'],

  score_labels: {
    task_completion:   'Task Completion',
    sla_compliance:    'SLA Compliance',
    handover_quality:  'Handover Quality',
    training_progress: 'Training Progress',
    sales_achievement: 'Sales Achievement',
  },

  chart_colors: {
    primary:  '#0F4C75',
    accent:   '#1B85B8',
    success:  '#22c55e',
    warning:  '#f59e0b',
    danger:   '#ef4444',
    critical: '#7c3aed',
    muted:    '#94a3b8',
  }
});

// ─── Google Sheets Database ──────────────────────────────
// This is read-only info for reference. The actual Sheets ID
// is used server-side by n8n — not directly by the frontend.
// sheets_id: '1YoyhyUHkOGa-RKfXEYO3aYfltQQdGBML'
// sheets_url: 'https://docs.google.com/spreadsheets/d/1YoyhyUHkOGa-RKfXEYO3aYfltQQdGBML/edit'
