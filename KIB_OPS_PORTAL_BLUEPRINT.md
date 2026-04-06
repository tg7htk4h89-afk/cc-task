# KIB Internal Operations Portal — Complete Implementation Blueprint
**Version 1.0 | Architect: Senior Solutions Blueprint**
**Stack: HTML + CSS + JS + Google Sheets + n8n**

---

## EXECUTIVE SOLUTION OVERVIEW

This document is a full, implementation-ready blueprint for a unified internal operations portal covering five major modules: Task Management, Shift Handover, Coaching & Training, Sales Performance, and Dashboards/Analytics/Scoring.

**Architecture at a glance:**
- **Frontend:** Multi-page HTML/CSS/JS application hosted on GitHub Pages or any static host
- **Backend/API:** n8n Cloud workflows as REST webhook endpoints
- **Database:** Google Sheets (19 tabs) as the operational data store
- **Charts:** Chart.js (CDN) for all visualization
- **Auth Model:** Role-bootstrapped via URL token or localStorage session; validated server-side on every n8n call
- **Notifications:** In-app notification panel; placeholders for WhatsApp/email via n8n

**Assumed organization structure:**
- ~100 staff total
- 6 roles: Head of Department (HoD), Manager, Team Leader (TL), Assistant Leader (AL), QA, Back Office
- Multiple teams (e.g., Morning Team, Evening Team, QA Team, Back Office Team)
- Shifts: Morning, Afternoon, Evening, Night
- Kuwait Standard Time (AST, UTC+3) used throughout

---

## ASSUMPTIONS

1. No SSO or Active Directory — sessions are bootstrapped by user selecting their name/ID and a PIN stored in Google Sheets
2. n8n Cloud handles all backend logic; no Node/Python server needed
3. Google Sheets is single-spreadsheet, multi-tab (not multiple spreadsheets)
4. All datetime stored as ISO 8601 UTC strings; displayed in AST (UTC+3)
5. Mobile means iOS Safari + Android Chrome — no native app needed
6. Chart.js loaded from CDN (cdnjs.cloudflare.com)
7. No real-time websockets — polling every 60s for notifications
8. Scoring weights are configurable in ScoreConfig tab
9. "Carry-forward" of unresolved handover items is automatic via n8n scheduler
10. Recurring tasks are generated daily by a scheduled n8n workflow
11. All IDs are auto-generated strings: `{PREFIX}-{YYYYMMDD}-{4-digit-seq}` e.g. `TASK-20250401-0042`
12. Training progress uses quantity-based model as default (target_qty / completed_qty)
13. Sales data entered manually per shift per employee (no ERP integration assumed)
14. Timezone: All n8n nodes use Kuwait Time (Asia/Kuwait, UTC+3)

---

# PHASE 1 — SOLUTION ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│               BROWSER (HTML/CSS/JS)                  │
│  index.html │ tasks.html │ handover.html │ ...       │
│  ┌─────────────────────────────────────────────┐    │
│  │  api.js (fetch wrapper → n8n webhooks)      │    │
│  │  auth.js │ ui.js │ utils.js │ config.js     │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS POST/GET
                       ▼
┌─────────────────────────────────────────────────────┐
│                  n8n CLOUD                           │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Webhook      │  │ Scheduled    │                │
│  │ Workflows    │  │ Workflows    │                │
│  │ (API layer)  │  │ (Automations)│                │
│  └──────┬───────┘  └──────┬───────┘                │
│         └────────┬─────────┘                        │
│                  │                                   │
│  ┌───────────────▼───────────────┐                  │
│  │  Google Sheets Node (R/W)     │                  │
│  └───────────────────────────────┘                  │
└──────────────────────┬──────────────────────────────┘
                       │ Sheets API
                       ▼
┌─────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (19 tabs)                 │
│  Users │ Tasks │ ShiftHandovers │ CoachingTraining  │
│  SalesPerformance │ DailyScores │ Notifications...  │
└─────────────────────────────────────────────────────┘
```

**Data flow for a user action (e.g., Create Task):**
1. User fills form → JS calls `api.post('/api/tasks/create', payload)`
2. `api.js` adds session token to headers → fetch to n8n webhook
3. n8n validates token → checks permission → writes to Tasks tab → logs to AuditLog → sends notification → returns JSON
4. JS renders success toast and refreshes task list

---

# PHASE 2 — ROLE & PERMISSION MATRIX

## 2.1 Module-Level Access Matrix

| Module              | HoD | Manager | TL  | AL  | QA  | BO  |
|---------------------|-----|---------|-----|-----|-----|-----|
| Task Dashboard      | R   | R       | R   | R   | R   | R   |
| Task Create         | W   | W       | —   | —   | —   | —   |
| Task Update (own)   | W   | W       | W   | W   | W   | W   |
| Task Reassign       | W   | W       | —   | —   | —   | —   |
| Task View (all)     | R   | R       | Scoped | Scoped | Own | Own |
| Recurring Task Mgmt | W   | W       | —   | —   | —   | —   |
| Handover Submit     | W   | W       | W   | W   | —   | —   |
| Handover Review     | W   | W       | R   | —   | —   | —   |
| Handover Dashboard  | R   | R       | Scoped | — | — | —  |
| Training Create     | W   | W       | —   | —   | —   | —   |
| Training Update     | W   | W       | W   | W   | —   | —   |
| Training Dashboard  | R   | R       | Scoped | Scoped | — | — |
| Sales Entry         | W   | W       | W   | W   | —   | —   |
| Sales Dashboard     | R   | R       | Scoped | — | — | —   |
| Global Dashboard    | R   | R       | —   | —   | —   | —   |
| Score Dashboard     | R   | R       | Own | Own | Own | Own |
| Settings/Admin      | W   | R       | —   | —   | —   | —   |
| Notifications       | R   | R       | R   | R   | R   | R   |
| User Management     | W   | —       | —   | —   | —   | —   |

**R = Read, W = Read+Write, — = No Access, Scoped = Own team/data only**

## 2.2 Action-Level Permission Table

| Action                        | HoD | Manager | TL  | AL  | QA  | BO  |
|-------------------------------|-----|---------|-----|-----|-----|-----|
| Assign task to HoD            | ✓   | ✗       | ✗   | ✗   | ✗   | ✗   |
| Assign task to Manager        | ✓   | ✗       | ✗   | ✗   | ✗   | ✗   |
| Assign task to TL/AL/QA/BO    | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| Change task status            | ✓   | ✓       | Own | Own | Own | Own |
| Delete/Cancel task            | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| Create recurring task         | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| Review handover               | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| Create training plan          | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| Update training progress      | ✓   | ✓       | ✓   | ✓   | ✗   | ✗   |
| Configure score weights       | ✓   | ✗       | ✗   | ✗   | ✗   | ✗   |
| View all teams                | ✓   | ✓       | ✗   | ✗   | ✗   | ✗   |
| View own team                 | ✓   | ✓       | ✓   | ✓   | ✗   | ✗   |

## 2.3 Frontend Visibility Rules

Role is stored in `localStorage` as part of the session object after bootstrap:
```json
{
  "user_id": "USR-001",
  "name": "Talal Al Jarki",
  "role": "HoD",
  "team": "Management",
  "session_token": "abc123xyz",
  "expires_at": "2025-04-01T23:59:00Z"
}
```

In every page's `init()` function:
```javascript
function applyRoleVisibility(role) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',');
    el.style.display = allowed.includes(role) ? '' : 'none';
  });
}
```

HTML usage:
```html
<button data-roles="HoD,Manager" id="btn-create-task">+ New Task</button>
<div data-roles="HoD" id="admin-panel">...</div>
```

## 2.4 Backend Validation Rules

Every n8n webhook workflow must:
1. Extract `session_token` from request header `X-Session-Token`
2. Look up token in Users tab → verify `session_token` column matches and not expired
3. Extract user's role
4. Validate the requested action against a hardcoded permission map in a Function node
5. Return 403 if unauthorized, continue if authorized

```javascript
// n8n Function node: validatePermission
const ACTION_PERMISSIONS = {
  'tasks.create':      ['HoD', 'Manager'],
  'tasks.update_own':  ['HoD', 'Manager', 'TL', 'AL', 'QA', 'BackOffice'],
  'tasks.reassign':    ['HoD', 'Manager'],
  'tasks.cancel':      ['HoD', 'Manager'],
  'handover.create':   ['HoD', 'Manager', 'TL', 'AL'],
  'handover.review':   ['HoD', 'Manager'],
  'training.create':   ['HoD', 'Manager'],
  'training.update':   ['HoD', 'Manager', 'TL', 'AL'],
  'sales.entry':       ['HoD', 'Manager', 'TL', 'AL'],
  'scores.configure':  ['HoD'],
};
const action = $input.first().json.action;
const userRole = $input.first().json.userRole;
const allowed = ACTION_PERMISSIONS[action] || [];
if (!allowed.includes(userRole)) {
  return [{ json: { error: 'Forbidden', code: 403 } }];
}
return $input.all();
```

---

# PHASE 3 — FULL GOOGLE SHEETS SCHEMA

**Spreadsheet name:** `KIB_OPS_PORTAL_DB`
**All IDs:** `{PREFIX}-{YYYYMMDD}-{4-digit zero-padded sequential}`
**All datetimes:** ISO 8601 UTC string (e.g. `2025-04-01T09:30:00Z`)
**Boolean fields:** `TRUE` / `FALSE` as text strings

---

## Tab 1: Users

**Purpose:** Master user registry. Single source of truth for authentication and role lookup.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| user_id | String | ✓ | `USR-001` sequential |
| full_name | String | ✓ | Display name |
| display_name | String | ✓ | Short name for UI |
| role | String | ✓ | HoD, Manager, TL, AL, QA, BackOffice |
| team | String | ✓ | Morning, Evening, QA, BackOffice, Management |
| shift_default | String | ✗ | Morning, Afternoon, Evening, Night |
| email | String | ✗ | For future email notifications |
| phone | String | ✗ | For future WhatsApp |
| pin_hash | String | ✓ | SHA-256 of 4-digit PIN |
| session_token | String | ✗ | Updated on login |
| session_expires | Datetime | ✗ | UTC expiry |
| last_login | Datetime | ✗ | UTC |
| active_flag | Boolean | ✓ | TRUE/FALSE |
| created_datetime | Datetime | ✓ | UTC |
| notes | String | ✗ | HR notes |

**Example row:**
```
USR-001 | Talal Al Jarki | Talal | HoD | Management | Morning | talal@kib.com | +96599001122 | [sha256] | tok_abc | 2025-04-02T00:00:00Z | 2025-04-01T07:02:00Z | TRUE | 2024-01-01T00:00:00Z |
```

---

## Tab 2: RolesPermissions

**Purpose:** Optional fine-grained permission overrides per user (complements role defaults).

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| permission_id | String | ✓ | `PERM-001` |
| user_id | String | ✓ | FK → Users |
| module | String | ✓ | tasks, handover, training, sales, dashboard |
| action | String | ✓ | create, read, update, delete |
| allowed | Boolean | ✓ | TRUE/FALSE override |
| granted_by | String | ✗ | FK → Users |
| granted_datetime | Datetime | ✗ | UTC |
| notes | String | ✗ | |

---

## Tab 3: Tasks

**Purpose:** Core task records.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| task_id | String | ✓ | `TASK-20250401-0001` |
| title | String | ✓ | Max 200 chars |
| description | String | ✗ | Rich text stored as plain text |
| category | String | ✓ | Managerial, Operational, QA, BackOffice, TL, AL, Compliance, FollowUp, Escalation, Handover, Coaching, Training, Sales, General |
| task_type | String | ✓ | Standard, Recurring-Child, Escalation |
| assigned_by_user_id | String | ✓ | FK → Users |
| assigned_by_name | String | ✓ | Denormalized for speed |
| assigned_to_user_id | String | ✓ | FK → Users |
| assigned_to_name | String | ✓ | Denormalized |
| assigned_to_role | String | ✓ | Denormalized |
| assigned_to_team | String | ✓ | Denormalized |
| priority | String | ✓ | Low, Medium, High, Critical |
| status | String | ✓ | New, Assigned, InProgress, Pending, WaitingInput, UnderReview, Completed, Cancelled, Overdue, Escalated |
| sla_value | Number | ✓ | e.g. 4 |
| sla_unit | String | ✓ | hours, days |
| sla_label | String | ✓ | e.g. "4 hours" |
| due_datetime | Datetime | ✓ | UTC |
| created_datetime | Datetime | ✓ | UTC |
| updated_datetime | Datetime | ✓ | UTC |
| started_datetime | Datetime | ✗ | When status→InProgress |
| completed_datetime | Datetime | ✗ | When status→Completed |
| progress_percentage | Number | ✗ | 0–100 |
| reminder_enabled | Boolean | ✓ | TRUE/FALSE |
| reminder_sent_pre | Boolean | ✗ | Reminder before due sent |
| reminder_sent_due | Boolean | ✗ | Reminder at due sent |
| escalation_enabled | Boolean | ✓ | TRUE/FALSE |
| escalation_sent | Boolean | ✗ | |
| recurring_flag | Boolean | ✓ | TRUE/FALSE |
| recurrence_type | String | ✗ | Daily, Weekly, Monthly |
| parent_recurring_id | String | ✗ | FK → RecurringTasks |
| completion_notes | String | ✗ | Free text on completion |
| closure_reason | String | ✗ | For Cancelled status |
| tags | String | ✗ | Comma-separated |
| active_flag | Boolean | ✓ | FALSE when archived |
| is_overdue | Boolean | ✗ | Computed and written by scheduler |
| overdue_duration_hrs | Number | ✗ | Hours overdue |
| completed_on_time | Boolean | ✗ | Set on completion |
| overdue_escalation_level | Number | ✗ | 0=none, 1=Manager, 2=HoD |

**Status Transition Rules:**
```
New → Assigned → InProgress → (Pending | WaitingInput | UnderReview) → Completed
Any non-terminal → Cancelled (Manager/HoD only)
Any non-terminal → Overdue (system only, via scheduler)
Overdue → InProgress (assignee acknowledges)
Overdue → Completed (late completion — completed_on_time = FALSE)
Escalated → InProgress | Completed
```

---

## Tab 4: TaskComments

**Purpose:** Per-task threaded comments and notes.

| Column | Type | Required |
|--------|------|----------|
| comment_id | String | ✓ | `CMT-20250401-0001` |
| task_id | String | ✓ | FK → Tasks |
| author_user_id | String | ✓ | FK → Users |
| author_name | String | ✓ | Denormalized |
| author_role | String | ✓ | Denormalized |
| comment_text | String | ✓ | |
| is_manager_note | Boolean | ✓ | Visible only to Manager/HoD if TRUE |
| created_datetime | Datetime | ✓ | |

---

## Tab 5: TaskActivityLog

**Purpose:** Full audit trail of every status/assignment change.

| Column | Type | Required |
|--------|------|----------|
| log_id | String | ✓ | `TLOG-20250401-0001` |
| task_id | String | ✓ | |
| action_type | String | ✓ | created, status_changed, reassigned, commented, reminder_sent, escalated, completed, cancelled |
| from_value | String | ✗ | Previous status/assignee |
| to_value | String | ✗ | New status/assignee |
| performed_by_user_id | String | ✓ | |
| performed_by_name | String | ✓ | |
| performed_datetime | Datetime | ✓ | UTC |
| notes | String | ✗ | |

---

## Tab 6: RecurringTasks

**Purpose:** Master records for recurring task templates.

| Column | Type | Required |
|--------|------|----------|
| recurring_id | String | ✓ | `REC-20250401-0001` |
| title | String | ✓ | |
| description | String | ✗ | |
| category | String | ✓ | |
| assigned_to_user_id | String | ✓ | |
| assigned_to_name | String | ✓ | |
| assigned_to_role | String | ✓ | |
| assigned_to_team | String | ✓ | |
| assigned_by_user_id | String | ✓ | |
| priority | String | ✓ | |
| sla_value | Number | ✓ | |
| sla_unit | String | ✓ | |
| recurrence_type | String | ✓ | Daily, Weekly, Monthly |
| recurrence_day_of_week | Number | ✗ | 1=Mon…7=Sun, for Weekly |
| recurrence_day_of_month | Number | ✗ | 1–28, for Monthly |
| start_date | Date | ✓ | |
| end_date | Date | ✗ | NULL = no end |
| last_generated_date | Date | ✗ | Last child task creation date |
| next_due_date | Date | ✗ | |
| total_generated | Number | ✗ | Count of child tasks |
| status | String | ✓ | Active, Paused, Cancelled |
| created_by_user_id | String | ✓ | |
| created_datetime | Datetime | ✓ | |
| reminder_enabled | Boolean | ✓ | |
| escalation_enabled | Boolean | ✓ | |
| tags | String | ✗ | |

---

## Tab 7: Notifications

**Purpose:** In-app notification inbox.

| Column | Type | Required |
|--------|------|----------|
| notification_id | String | ✓ | `NOTIF-20250401-0001` |
| recipient_user_id | String | ✓ | FK → Users |
| notification_type | String | ✓ | task_reminder, task_overdue, task_completed, all_tasks_done, recurring_generated, handover_missing, handover_late, training_delayed, training_completed, performance_alert, escalation |
| module_name | String | ✓ | tasks, handover, training, sales, system |
| source_record_id | String | ✗ | FK to relevant module record |
| severity | String | ✓ | info, warning, critical |
| title | String | ✓ | Short message |
| message | String | ✓ | Full description |
| read_flag | Boolean | ✓ | FALSE default |
| read_datetime | Datetime | ✗ | |
| created_datetime | Datetime | ✓ | |
| action_target | String | ✗ | Page/anchor to navigate to |

---

## Tab 8: ShiftHandovers

**Purpose:** Main handover record per shift per day.

| Column | Type | Required |
|--------|------|----------|
| handover_id | String | ✓ | `HO-20250401-0001` |
| date | Date | ✓ | Calendar date (Kuwait) |
| business_date | Date | ✓ | Operational date (may differ for night shift) |
| shift_type | String | ✓ | Morning, Afternoon, Evening, Night |
| shift_start_time | Time | ✓ | e.g. 08:00 |
| shift_end_time | Time | ✓ | e.g. 16:00 |
| submitted_by_user_id | String | ✓ | |
| submitted_by_name | String | ✓ | |
| submitted_by_role | String | ✓ | |
| team | String | ✓ | |
| staffing_count | Number | ✓ | |
| staff_on_shift | String | ✗ | Comma-separated user_ids |
| key_updates | String | ✗ | Free text |
| pending_items | String | ✗ | Free text |
| escalated_items | String | ✗ | Free text |
| customer_issues | String | ✗ | |
| system_issues | String | ✗ | |
| operational_issues | String | ✗ | |
| unresolved_items | String | ✗ | |
| important_followups | String | ✗ | |
| incident_summary | String | ✗ | |
| service_notes | String | ✗ | |
| priority_items_next_shift | String | ✗ | |
| sales_summary_count | Number | ✗ | |
| sales_summary_amount | Number | ✗ | KWD |
| linked_sales_flag | Boolean | ✗ | TRUE if sales records linked |
| checklist_json | String | ✗ | JSON stringified checklist |
| handover_quality_score | Number | ✗ | 0–100, computed |
| submission_status | String | ✓ | Draft, Submitted, Reviewed |
| submitted_datetime | Datetime | ✗ | |
| reviewed_by_user_id | String | ✗ | |
| reviewed_by_name | String | ✗ | |
| reviewed_datetime | Datetime | ✗ | |
| carry_forward_flag | Boolean | ✗ | Items carried to next shift |
| carry_forward_source_id | String | ✗ | Source handover_id |
| is_late_submission | Boolean | ✗ | |
| created_datetime | Datetime | ✓ | |
| updated_datetime | Datetime | ✓ | |

---

## Tab 9: ShiftHandoverItems

**Purpose:** Structured checklist line items within a handover.

| Column | Type | Required |
|--------|------|----------|
| item_id | String | ✓ | `HOI-20250401-0001` |
| handover_id | String | ✓ | FK → ShiftHandovers |
| item_type | String | ✓ | pending, escalated, customer_issue, system_issue, followup, incident |
| description | String | ✓ | |
| status | String | ✓ | Open, Resolved, CarriedForward |
| priority | String | ✗ | Low, Medium, High |
| carried_to_handover_id | String | ✗ | FK if carried forward |
| resolved_in_handover_id | String | ✗ | FK when resolved |
| created_datetime | Datetime | ✓ | |

---

## Tab 10: CoachingTraining

**Purpose:** Training/coaching plan records.

| Column | Type | Required |
|--------|------|----------|
| training_id | String | ✓ | `TRN-20250401-0001` |
| employee_user_id | String | ✓ | FK → Users |
| employee_name | String | ✓ | |
| employee_role | String | ✓ | |
| employee_team | String | ✓ | |
| assigned_by_user_id | String | ✓ | |
| assigned_by_name | String | ✓ | |
| trainer_user_id | String | ✓ | FK → Users |
| trainer_name | String | ✓ | |
| subject | String | ✓ | |
| category | String | ✓ | Product, Procedure, Compliance, Soft Skills, Systems, Sales Technique, QA, General |
| description | String | ✗ | |
| start_date | Date | ✓ | |
| target_completion_date | Date | ✓ | |
| actual_completion_date | Date | ✗ | |
| status | String | ✓ | Planned, Assigned, Started, InProgress, PendingReview, Completed, Delayed, Cancelled |
| progress_percentage | Number | ✓ | 0–100, computed |
| target_quantity | Number | ✓ | e.g. 1000 |
| completed_quantity | Number | ✓ | |
| remaining_quantity | Number | ✓ | Computed: target - completed |
| expected_daily_rate | Number | ✗ | target / business_days |
| actual_daily_rate | Number | ✗ | completed / days_elapsed |
| trend_status | String | ✗ | OnTrack, Behind, Ahead, AtRisk |
| last_3_day_progress | String | ✗ | JSON: [{date, qty},...] |
| next_review_date | Date | ✗ | |
| coaching_notes | String | ✗ | |
| trainer_notes | String | ✗ | |
| manager_notes | String | ✗ | |
| followup_required | Boolean | ✗ | |
| created_datetime | Datetime | ✓ | |
| updated_datetime | Datetime | ✓ | |
| active_flag | Boolean | ✓ | |

**Delayed Logic:**
- `status = Delayed` when: `progress_percentage < expected_percentage AND days_remaining < 3`
- `expected_percentage = (days_elapsed / total_days) * 100`

---

## Tab 11: TrainingProgressLogs

**Purpose:** Daily progress update entries for each training record.

| Column | Type | Required |
|--------|------|----------|
| log_id | String | ✓ | `TPLOG-20250401-0001` |
| training_id | String | ✓ | FK → CoachingTraining |
| log_date | Date | ✓ | |
| qty_completed_today | Number | ✓ | |
| cumulative_completed | Number | ✓ | |
| progress_percentage | Number | ✓ | |
| trainer_user_id | String | ✓ | |
| trainer_name | String | ✓ | |
| session_notes | String | ✗ | |
| created_datetime | Datetime | ✓ | |

---

## Tab 12: SalesPerformance

**Purpose:** Daily sales records per employee per shift.

| Column | Type | Required |
|--------|------|----------|
| sales_record_id | String | ✓ | `SAL-20250401-0001` |
| date | Date | ✓ | |
| business_date | Date | ✓ | |
| shift_type | String | ✓ | |
| employee_user_id | String | ✓ | |
| employee_name | String | ✓ | |
| employee_role | String | ✓ | |
| employee_team | String | ✓ | |
| product_or_category | String | ✓ | Current Account, Savings, Cards, Personal Finance, Investment, General |
| sales_count | Number | ✓ | |
| sales_amount | Number | ✓ | KWD |
| sales_target | Number | ✗ | Daily target in KWD |
| achievement_percentage | Number | ✗ | Computed |
| notes | String | ✗ | |
| linked_handover_id | String | ✗ | FK → ShiftHandovers |
| created_datetime | Datetime | ✓ | |
| updated_datetime | Datetime | ✓ | |

---

## Tab 13: DailyScores

**Purpose:** Computed performance scores per user per day.

| Column | Type | Required |
|--------|------|----------|
| score_id | String | ✓ | `SCR-20250401-0001` |
| score_date | Date | ✓ | |
| user_id | String | ✓ | |
| user_name | String | ✓ | |
| role | String | ✓ | |
| team | String | ✓ | |
| task_completion_score | Number | ✗ | 0–100 |
| sla_compliance_score | Number | ✗ | 0–100 |
| handover_quality_score | Number | ✗ | 0–100 |
| training_progress_score | Number | ✗ | 0–100 |
| sales_achievement_score | Number | ✗ | 0–100 |
| total_weighted_score | Number | ✓ | 0–100 |
| penalty_points | Number | ✗ | Deducted for overdue/missing |
| final_score | Number | ✓ | total - penalty |
| missing_data_flags | String | ✗ | Comma list of modules missing data |
| calculated_datetime | Datetime | ✓ | |

---

## Tab 14: ScoreConfig

**Purpose:** Configurable scoring weights (HoD-only editable).

| Column | Value |
|--------|-------|
| config_key | String |
| config_value | Number |
| description | String |
| updated_by | String |
| updated_datetime | Datetime |

**Default rows:**
```
weight_task_completion   | 30  | Task completion rate weight (%)
weight_sla_compliance    | 20  | SLA on-time compliance weight (%)
weight_handover_quality  | 15  | Handover quality score weight (%)
weight_training_progress | 15  | Training progress weight (%)
weight_sales_achievement | 20  | Sales achievement weight (%)
penalty_overdue_per_task | 2   | Points deducted per overdue task
penalty_missing_handover | 5   | Points deducted per missing handover
score_calc_time          | 23:00 | Nightly score calculation time (Kuwait)
reminder_hours_before    | 2   | Hours before SLA to send reminder
escalation_overdue_hours | 4   | Hours overdue before escalation to Manager
escalation_critical_hours| 2   | Hours overdue for Critical priority escalation
```

---

## Tab 15: LookupLists

**Purpose:** Dropdown/select option values used throughout the app.

| Column | Type |
|--------|------|
| lookup_id | String |
| list_name | String |
| list_value | String |
| display_label | String |
| sort_order | Number |
| active_flag | Boolean |

**Populated lists:** task_category, task_type, task_priority, task_status, sla_options, shift_types, training_category, training_status, sales_product, roles, teams

---

## Tab 16: Settings

**Purpose:** System-wide configuration key-value store.

| Column | Type |
|--------|------|
| setting_key | String |
| setting_value | String |
| data_type | String |
| description | String |
| updated_by | String |
| updated_datetime | Datetime |

**Key rows:**
```
portal_name              | KIB Operations Portal
timezone                 | Asia/Kuwait
default_session_duration | 480  (minutes = 8 hours)
max_pin_attempts         | 5
handover_submission_deadline | 30 (minutes after shift end)
carry_forward_auto       | TRUE
dashboard_refresh_interval | 60 (seconds)
```

---

## Tab 17: AuditLog

**Purpose:** System-wide audit trail for all create/update/delete operations.

| Column | Type |
|--------|------|
| audit_id | String | `AUD-20250401-0001` |
| timestamp | Datetime | UTC |
| actor_user_id | String | |
| actor_name | String | |
| actor_role | String | |
| module | String | |
| action | String | create, update, delete, login, logout |
| record_id | String | Affected record ID |
| record_type | String | task, handover, training, etc |
| before_snapshot | String | JSON of previous state |
| after_snapshot | String | JSON of new state |
| ip_address | String | From request headers if available |
| session_token | String | |
| status | String | success, failed |

---

## Tab 18: DashboardCache (Optional)

**Purpose:** Pre-computed summary rows refreshed by scheduled n8n workflow every 15 min, to reduce latency on dashboard loads.

| Column | Type |
|--------|------|
| cache_key | String |
| cache_value | String | JSON |
| computed_datetime | Datetime |
| expiry_datetime | Datetime |

---

## Tab 19: HandoverExpectedLog

**Purpose:** Track which shifts are expected per day to detect missing handovers.

| Column | Type |
|--------|------|
| expected_id | String |
| expected_date | Date |
| shift_type | String |
| team | String |
| expected_by_user_id | String |
| handover_id | String | NULL if not yet submitted |
| status | String | Expected, Submitted, Missing, Late |
| checked_datetime | Datetime |

---

# PHASE 4 — N8N WORKFLOW ARCHITECTURE

## Workflow Inventory (28 workflows)

### Webhook Workflows (triggered by frontend HTTP requests)

| # | Workflow Name | Trigger | Path |
|---|---------------|---------|------|
| W01 | User Bootstrap / Login | POST Webhook | `/api/user/bootstrap` |
| W02 | Get Dashboard Summary | GET Webhook | `/api/dashboard/summary` |
| W03 | Create Task | POST Webhook | `/api/tasks/create` |
| W04 | Update Task | POST Webhook | `/api/tasks/update` |
| W05 | Get Task List | GET Webhook | `/api/tasks/list` |
| W06 | Get Task Detail | GET Webhook | `/api/tasks/detail` |
| W07 | Add Task Comment | POST Webhook | `/api/tasks/comment` |
| W08 | Get Handover List | GET Webhook | `/api/handover/list` |
| W09 | Create Handover | POST Webhook | `/api/handover/create` |
| W10 | Update Handover | POST Webhook | `/api/handover/update` |
| W11 | Get Handover Compare | GET Webhook | `/api/handover/compare` |
| W12 | Create Training Plan | POST Webhook | `/api/training/create` |
| W13 | Update Training Progress | POST Webhook | `/api/training/progress` |
| W14 | Get Training Dashboard | GET Webhook | `/api/training/dashboard` |
| W15 | Submit/Update Sales Entry | POST Webhook | `/api/sales/entry` |
| W16 | Get Sales Dashboard | GET Webhook | `/api/sales/dashboard` |
| W17 | Get Notifications | GET Webhook | `/api/notifications/list` |
| W18 | Mark Notification Read | POST Webhook | `/api/notifications/read` |
| W19 | Get Lookup Lists | GET Webhook | `/api/lookups` |
| W20 | Get User List | GET Webhook | `/api/users/list` |

### Scheduled Workflows (cron-triggered)

| # | Workflow Name | Schedule |
|---|---------------|----------|
| W21 | Overdue Task Marker | Every 30 min |
| W22 | Task Reminder Sender | Every 30 min |
| W23 | Task Escalation Handler | Every 60 min |
| W24 | Recurring Task Generator | Daily at 00:01 KWT |
| W25 | Missing Handover Checker | 30 min after each shift end |
| W26 | Delayed Training Checker | Daily at 08:00 KWT |
| W27 | Daily Score Calculator | Daily at 23:00 KWT |
| W28 | Dashboard Cache Refresher | Every 15 min |

---

## Detailed Workflow Designs

### W01 — User Bootstrap / Login

**Purpose:** Authenticate user, create session, return user profile.

**Trigger:** POST `/api/user/bootstrap`

**Request body:**
```json
{ "user_id": "USR-001", "pin": "1234" }
```

**n8n Node sequence:**
```
[Webhook] → [Function: Hash PIN] → [Sheets: Read Users tab, filter user_id]
→ [Function: Compare pin_hash] → [IF: match?]
  → YES: [Function: Generate session token] → [Sheets: Write session_token + expires]
         → [Sheets: Write last_login] → [Respond: user profile JSON]
  → NO:  [Respond: 401 Unauthorized]
```

**Logic (Function node — Hash PIN):**
```javascript
const crypto = require('crypto');
const pin = $input.first().json.pin;
return [{ json: { ...($input.first().json), pin_hash: crypto.createHash('sha256').update(pin).digest('hex') } }];
```

**Logic (Function node — Generate token):**
```javascript
const token = 'tok_' + Math.random().toString(36).substr(2, 16) + Date.now();
const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
return [{ json: { ...($input.first().json), session_token: token, session_expires: expiresAt } }];
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "user_id": "USR-001",
    "full_name": "Talal Al Jarki",
    "display_name": "Talal",
    "role": "HoD",
    "team": "Management",
    "session_token": "tok_abc123xyz",
    "expires_at": "2025-04-01T23:00:00Z"
  }
}
```

---

### W03 — Create Task

**Purpose:** Create a new task record with full validation, SLA calculation, notification generation, and audit logging.

**Trigger:** POST `/api/tasks/create`

**n8n Node sequence:**
```
[Webhook] → [Function: Validate Auth] → [Function: Check Permission tasks.create]
→ [Sheets: Read Users - verify assignee exists and active]
→ [Function: Validate fields (required, SLA range)]
→ [Function: Calculate due_datetime]
→ [Function: Generate task_id]
→ [Sheets: Read Tasks - get last sequential for today]
→ [Function: Build task row]
→ [Sheets: Append to Tasks tab]
→ [Function: Build activity log row]
→ [Sheets: Append to TaskActivityLog]
→ [Function: Build notification for assignee]
→ [Sheets: Append to Notifications]
→ [IF: assigned_to != assigned_by] → [Notify assigner too if manager notif enabled]
→ [AuditLog Append]
→ [Respond: success + task_id]
```

**SLA Calculation Logic:**
```javascript
const now = new Date();
const slaValue = $input.first().json.sla_value;
const slaUnit = $input.first().json.sla_unit;
let dueDatetime;
if (slaUnit === 'hours') {
  dueDatetime = new Date(now.getTime() + slaValue * 60 * 60 * 1000);
} else if (slaUnit === 'days') {
  dueDatetime = new Date(now.getTime() + slaValue * 24 * 60 * 60 * 1000);
}
return [{ json: { ...($input.first().json), due_datetime: dueDatetime.toISOString(), created_datetime: now.toISOString(), updated_datetime: now.toISOString() } }];
```

---

### W21 — Overdue Task Marker (Scheduled)

**Purpose:** Scan all non-completed tasks, mark overdue, generate notifications.

**Schedule:** Every 30 minutes

**Logic:**
```
[Schedule Trigger]
→ [Sheets: Read Tasks where status NOT IN (Completed, Cancelled, Overdue)]
→ [Function: For each task, check if now > due_datetime]
  → If overdue AND is_overdue = FALSE:
    → Set is_overdue = TRUE
    → Calculate overdue_duration_hrs
    → Set status = Overdue
    → [Sheets: Update task row]
    → [Sheets: Append TaskActivityLog: status_changed → Overdue]
    → [Sheets: Append Notification to assignee: task_overdue]
    → [Sheets: Append Notification to manager: task_overdue (if escalation_enabled)]
```

---

### W24 — Recurring Task Generator (Scheduled)

**Purpose:** Daily at 00:01 KWT, generate today's child tasks from active recurring masters.

**Logic:**
```
[Schedule Trigger: 00:01 KWT]
→ [Sheets: Read RecurringTasks where status = Active]
→ [Function: For each record]
  → Determine if a task should be generated today:
    - Daily: always
    - Weekly: if today.dayOfWeek == recurrence_day_of_week
    - Monthly: if today.date == recurrence_day_of_month
  → Check: last_generated_date != today (prevent duplicates)
  → Check: today >= start_date AND (end_date is NULL OR today <= end_date)
  → If all pass:
    → Generate task_id
    → Build task row from template (copy fields from RecurringTask)
    → Set task_type = Recurring-Child
    → Set parent_recurring_id = recurring_id
    → Calculate due_datetime from now + sla
    → [Sheets: Append to Tasks]
    → [Sheets: Update RecurringTask.last_generated_date = today]
    → [Sheets: Update RecurringTask.total_generated += 1]
    → [Sheets: Append Notification to assignee]
```

**Duplicate prevention:** The check `last_generated_date != today` acts as the dedup gate. Even if workflow runs multiple times, it will not regenerate.

---

### W27 — Daily Score Calculator (Scheduled)

**Purpose:** Nightly at 23:00 KWT, compute weighted scores for all active users.

**Logic:**
```
[Schedule Trigger: 23:00 KWT]
→ [Sheets: Read ScoreConfig] → parse weights and penalties
→ [Sheets: Read Users where active_flag = TRUE]
→ [For each user]:
  → today = Kuwait date
  
  → TASK SCORE:
    → Read Tasks assigned to user, due today
    → completed = count(status=Completed)
    → total = count(all)
    → task_completion_rate = completed / total (or 100 if total=0)
    
  → SLA SCORE:
    → Read Tasks completed today
    → on_time = count(completed_on_time=TRUE)
    → sla_score = on_time / completed (or 100 if none)
    
  → HANDOVER SCORE:
    → Read ShiftHandovers submitted by user today
    → handover_quality_score = average(handover_quality_score) (or skip if not applicable role)
    
  → TRAINING SCORE:
    → Read CoachingTraining for employee = user, active
    → training_score = average(progress_percentage)
    
  → SALES SCORE:
    → Read SalesPerformance for user today
    → sales_score = average(achievement_percentage) (or skip if no records)
    
  → WEIGHTED TOTAL:
    → raw = (task * w_task + sla * w_sla + handover * w_handover + training * w_training + sales * w_sales) / 100
    → penalties = overdue_tasks * penalty_per_task + missing_handovers * penalty_missing
    → final = raw - penalties (floor at 0)
    
  → [Sheets: Append to DailyScores]
  → [If final < 50]: [Append Notification: performance_alert]
```

---

### W25 — Missing Handover Checker (Scheduled)

**Purpose:** 30 minutes after each shift end, check if handover was submitted.

**Expected shift end times (Kuwait):**
- Morning: 16:00 → check at 16:30
- Afternoon: 20:00 → check at 20:30
- Evening: 00:00 → check at 00:30
- Night: 08:00 → check at 08:30

**Schedule:** Four separate cron expressions

**Logic for each shift check:**
```
→ Determine which shift just ended (from cron context)
→ today = Kuwait date
→ [Sheets: Read ShiftHandovers where date=today AND shift_type=X]
→ [Sheets: Read HandoverExpectedLog where date=today AND shift_type=X]
→ For each expected record:
  → If no matching handover found:
    → Update HandoverExpectedLog.status = Missing
    → [Sheets: Append Notification to Manager: handover_missing]
    → [Sheets: Append Notification to HoD: handover_missing]
  → Else if handover.submitted_datetime > shift_end + 30min:
    → Mark as Late
    → Update handover.is_late_submission = TRUE
    → [Sheets: Append Notification: handover_late]
```

---

# PHASE 5 — API / WEBHOOK CONTRACTS

**Standard response envelope:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2025-04-01T10:30:00Z", "request_id": "req_abc" },
  "error": null
}
```

**Standard error envelope:**
```json
{
  "success": false,
  "data": null,
  "error": { "code": 403, "message": "Forbidden: insufficient permissions", "field": null }
}
```

**Auth header:** `X-Session-Token: tok_abc123xyz`

---

### POST /api/user/bootstrap
```json
// Request
{ "user_id": "USR-001", "pin": "1234" }

// Success
{
  "success": true,
  "data": {
    "user_id": "USR-001",
    "full_name": "Talal Al Jarki",
    "display_name": "Talal",
    "role": "HoD",
    "team": "Management",
    "session_token": "tok_abc123",
    "expires_at": "2025-04-01T23:00:00Z",
    "unread_notifications": 3
  }
}
```

---

### GET /api/dashboard/summary
```
Headers: X-Session-Token
Query: (none required - user derived from token)

// Response
{
  "success": true,
  "data": {
    "tasks": {
      "total": 47, "open": 18, "completed": 22, "overdue": 7,
      "due_today": 5, "completion_rate": 74.5
    },
    "handovers": {
      "today_submitted": 2, "today_missing": 1, "today_late": 0
    },
    "training": {
      "active_plans": 12, "delayed": 3, "completed_this_week": 2
    },
    "sales": {
      "today_count": 34, "today_amount": 4520.5, "achievement_pct": 82.2
    },
    "scores": {
      "my_today": 78.4, "team_avg": 71.2
    },
    "notifications_unread": 3
  }
}
```

---

### POST /api/tasks/create
```json
// Request
{
  "title": "Review customer complaint file",
  "description": "Check complaint #2024-890 and prepare response",
  "category": "Compliance",
  "assigned_to_user_id": "USR-005",
  "priority": "High",
  "sla_value": 4,
  "sla_unit": "hours",
  "reminder_enabled": true,
  "escalation_enabled": true,
  "recurring_flag": false,
  "tags": "complaint,compliance"
}

// Success
{
  "success": true,
  "data": { "task_id": "TASK-20250401-0042", "due_datetime": "2025-04-01T13:30:00Z" }
}
```

---

### GET /api/tasks/list
```
Query params:
  status=Overdue,InProgress
  assigned_to=USR-005     (optional, scoped by role)
  team=Morning            (optional, HoD/Manager only)
  category=Compliance
  priority=High
  date_from=2025-04-01
  date_to=2025-04-07
  page=1
  limit=25
  sort=due_datetime:asc

// Response
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "TASK-20250401-0042",
        "title": "Review customer complaint file",
        "priority": "High",
        "status": "InProgress",
        "due_datetime": "2025-04-01T13:30:00Z",
        "assigned_to_name": "Ahmad Al-Rashidi",
        "progress_percentage": 30,
        "is_overdue": false,
        "sla_label": "4 hours"
      }
    ],
    "total": 47,
    "page": 1,
    "limit": 25
  }
}
```

---

### POST /api/tasks/update
```json
{
  "task_id": "TASK-20250401-0042",
  "status": "Completed",
  "progress_percentage": 100,
  "completion_notes": "Complaint reviewed, response letter sent via email."
}
```

---

### POST /api/tasks/comment
```json
{
  "task_id": "TASK-20250401-0042",
  "comment_text": "Awaiting approval from compliance officer before closing.",
  "is_manager_note": false
}
```

---

### POST /api/handover/create
```json
{
  "date": "2025-04-01",
  "shift_type": "Morning",
  "shift_start_time": "08:00",
  "shift_end_time": "16:00",
  "staffing_count": 8,
  "staff_on_shift": "USR-002,USR-003,USR-005",
  "key_updates": "High call volume due to new product launch. 320 calls handled.",
  "pending_items": "3 customer callbacks pending",
  "escalated_items": "1 fraud alert escalated to Risk",
  "customer_issues": "2 complaints received about wait times",
  "system_issues": "",
  "unresolved_items": "Callback list not fully processed",
  "priority_items_next_shift": "Clear callback queue, follow up fraud case",
  "sales_summary_count": 12,
  "sales_summary_amount": 1450.00,
  "submission_status": "Submitted",
  "checklist_items": [
    { "type": "pending", "description": "Customer callback #0021 - pending", "priority": "High" },
    { "type": "escalated", "description": "Fraud alert Case #FR-2025-01", "priority": "High" }
  ]
}
```

---

### GET /api/handover/compare
```
Query: date=2025-04-01&shifts=Morning,Afternoon

// Response
{
  "data": {
    "comparison": [
      {
        "shift_type": "Morning",
        "submitted_by": "Taher Al Baghli",
        "staffing_count": 8,
        "sales_amount": 1450,
        "sales_count": 12,
        "unresolved_count": 2,
        "escalated_count": 1,
        "handover_quality_score": 78,
        "is_late": false
      },
      {
        "shift_type": "Afternoon",
        "submitted_by": "Khalid Al-Mutairi",
        "staffing_count": 6,
        "sales_amount": 890,
        "sales_count": 8,
        "unresolved_count": 0,
        "escalated_count": 0,
        "handover_quality_score": 92,
        "is_late": false
      }
    ]
  }
}
```

---

### POST /api/training/create
```json
{
  "employee_user_id": "USR-007",
  "trainer_user_id": "USR-003",
  "subject": "Personal Finance Product Knowledge",
  "category": "Product",
  "description": "Full training on Islamic personal finance product features",
  "start_date": "2025-04-02",
  "target_completion_date": "2025-04-14",
  "target_quantity": 500,
  "next_review_date": "2025-04-07"
}
```

---

### POST /api/training/progress
```json
{
  "training_id": "TRN-20250402-0001",
  "qty_completed_today": 80,
  "session_notes": "Covered product eligibility criteria and rate structure."
}
```

---

# PHASE 6 — FRONTEND ARCHITECTURE

## 6.1 Technology Decisions

| Concern | Decision | Reason |
|---------|----------|--------|
| Framework | Vanilla JS (ES6+) | No build tools, GitHub Pages compatible |
| Routing | Page-per-module HTML | Simple, deployable anywhere |
| Charts | Chart.js 4.x (CDN) | Lightweight, good defaults |
| Icons | Feather Icons (CDN) | Clean, SVG-based |
| Fonts | IBM Plex Sans (Google Fonts) | Professional, readable at all sizes |
| Modals | Custom JS + CSS | No jQuery dependency |
| Notifications | Polling (60s interval) | No WebSocket needed |
| State | localStorage + module-scoped vars | Simple, persistent session |
| Forms | Vanilla HTML forms + JS validation | No framework overhead |
| Tables | Vanilla JS rendered | Fully controllable |

## 6.2 JS Module Architecture

```
/assets/js/
  config.js          ← API base URL, constants, route definitions
  api.js             ← Fetch wrapper, auth header injection, error handling
  auth.js            ← Login, logout, session management, role checks
  utils.js           ← Date formatting, ID gen, debounce, Kuwait TZ helpers
  ui.js              ← Toast, modal, loading spinner, badge renderer
  components.js      ← Reusable: task card, user chip, progress bar, chart init
  dashboard.js       ← Main dashboard data loading and rendering
  tasks.js           ← Task CRUD, filters, status update, comment thread
  handover.js        ← Handover form, list, compare view
  training.js        ← Training CRUD, progress log, dashboard
  sales.js           ← Sales entry, rankings, charts
  notifications.js   ← Notification polling, render, mark-read
  scoring.js         ← Score display and ranking
```

## 6.3 api.js — Core API Layer

```javascript
// /assets/js/api.js

const API = (() => {
  const BASE_URL = CONFIG.n8n_base_url; // set in config.js

  async function request(method, path, body = null, queryParams = {}) {
    const session = AUTH.getSession();
    const url = new URL(BASE_URL + path);
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== null && v !== undefined) url.searchParams.append(k, v);
    });

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': session?.session_token || '',
      },
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      UI.showLoader();
      const res = await fetch(url.toString(), options);
      const data = await res.json();
      if (!data.success) {
        if (data.error?.code === 401) AUTH.logout();
        throw new Error(data.error?.message || 'Request failed');
      }
      return data.data;
    } catch (err) {
      UI.showToast(err.message, 'error');
      throw err;
    } finally {
      UI.hideLoader();
    }
  }

  return {
    get: (path, params) => request('GET', path, null, params),
    post: (path, body) => request('POST', path, body),
  };
})();
```

## 6.4 auth.js

```javascript
// /assets/js/auth.js

const AUTH = (() => {
  const SESSION_KEY = 'kib_ops_session';

  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (!s || new Date(s.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  async function login(userId, pin) {
    const data = await API.post('/api/user/bootstrap', { user_id: userId, pin });
    setSession(data);
    return data;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '/login.html';
  }

  function requireAuth() {
    if (!getSession()) window.location.href = '/login.html';
  }

  function hasRole(...roles) {
    const s = getSession();
    return s && roles.includes(s.role);
  }

  function canDo(action) {
    const PERM = {
      'tasks.create':     ['HoD', 'Manager'],
      'tasks.reassign':   ['HoD', 'Manager'],
      'handover.review':  ['HoD', 'Manager'],
      'training.create':  ['HoD', 'Manager'],
      'scores.configure': ['HoD'],
    };
    const s = getSession();
    return s && (PERM[action] || []).includes(s.role);
  }

  return { getSession, login, logout, requireAuth, hasRole, canDo };
})();
```

## 6.5 utils.js

```javascript
// /assets/js/utils.js

const UTILS = (() => {
  const KWT_OFFSET = 3 * 60; // UTC+3

  function toKuwaitTime(utcString) {
    const d = new Date(utcString);
    const kwt = new Date(d.getTime() + KWT_OFFSET * 60000);
    return kwt;
  }

  function formatDate(utcString) {
    const d = toKuwaitTime(utcString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(utcString) {
    const d = toKuwaitTime(utcString);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function timeRemaining(dueDatetime) {
    const now = new Date();
    const due = new Date(dueDatetime);
    const diffMs = due - now;
    if (diffMs < 0) return { overdue: true, label: `${Math.abs(Math.round(diffMs / 3600000))}h overdue` };
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return { overdue: false, label: hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left` };
  }

  function priorityColor(priority) {
    return { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#7c3aed' }[priority] || '#6b7280';
  }

  function statusBadgeClass(status) {
    const map = {
      New: 'badge-blue', Assigned: 'badge-indigo', InProgress: 'badge-yellow',
      Completed: 'badge-green', Overdue: 'badge-red', Cancelled: 'badge-gray',
      Escalated: 'badge-purple', Pending: 'badge-orange',
    };
    return map[status] || 'badge-gray';
  }

  function debounce(fn, delay) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function generateRequestId() {
    return 'req_' + Math.random().toString(36).substr(2, 8);
  }

  return { formatDate, formatDateTime, timeRemaining, priorityColor, statusBadgeClass, debounce, generateRequestId };
})();
```

---

# PHASE 7 — UI/UX LAYOUT PLAN

## 7.1 Design Language

**Color palette:**
```
Primary:       #0F4C75   (deep navy — authority)
Accent:        #1B85B8   (bright blue — action)
Success:       #22c55e
Warning:       #f59e0b
Danger:        #ef4444
Critical:      #7c3aed
Surface:       #f8fafc   (background)
Card:          #ffffff
Border:        #e2e8f0
Text Primary:  #0f172a
Text Muted:    #64748b
Sidebar BG:    #0f172a
Sidebar Text:  #cbd5e1
Sidebar Active:#1B85B8
```

**Typography:**
```
Display: IBM Plex Sans Bold (headings, KPIs)
Body: IBM Plex Sans Regular (labels, text)
Mono: IBM Plex Mono (IDs, timestamps)
Base size: 14px
Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36
```

## 7.2 Page Layout Template

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (240px)   │  MAIN CONTENT AREA                  │
│                   │  ┌──────────────────────────────┐   │
│ [KIB LOGO]        │  │ TOP BAR: breadcrumb + search  │   │
│                   │  │ + notification bell + user    │   │
│ ─────────────     │  └──────────────────────────────┘   │
│ Dashboard         │                                      │
│ Tasks          ◄  │  ┌──────────────────────────────┐   │
│ Handover          │  │ PAGE HEADER + ACTION BUTTONS  │   │
│ Training          │  └──────────────────────────────┘   │
│ Sales             │                                      │
│ Reports           │  ┌──────────────────────────────┐   │
│ ─────────────     │  │ KPI CARDS (4 per row)        │   │
│ Settings          │  └──────────────────────────────┘   │
│                   │                                      │
│ [User chip]       │  ┌──────────────────────────────┐   │
│ [Logout]          │  │ CHARTS / TABLES / FORMS       │   │
│                   │  └──────────────────────────────┘   │
└───────────────────┴──────────────────────────────────────┘
```

**Mobile (< 768px):**
- Sidebar collapses to bottom tab bar (5 icons)
- KPI cards stack 2×2 then 1×1
- Tables become scrollable horizontally or card-list view
- Filters collapse into a bottom drawer
- Forms go full-width, inputs stack vertically

## 7.3 KPI Card Template

```html
<div class="kpi-card">
  <div class="kpi-icon">
    <i data-feather="check-circle" class="kpi-icon-el"></i>
  </div>
  <div class="kpi-content">
    <div class="kpi-value">74.5%</div>
    <div class="kpi-label">Completion Rate</div>
    <div class="kpi-delta positive">↑ 4.2% vs yesterday</div>
  </div>
</div>
```

---

# PHASE 8 — PAGE-BY-PAGE HTML STRUCTURE

## Page List & Primary Components

| Page | File | Primary Components |
|------|------|--------------------|
| Login | `login.html` | User selector, PIN input |
| Main Dashboard | `index.html` | 5 KPI cards, 2 charts, alerts panel, quick actions |
| Task Dashboard | `tasks.html` | Filter bar, task list/cards, status tabs |
| Task Detail | `task-detail.html` | Detail pane, comment thread, timeline |
| Task Create/Edit | `task-form.html` | Full form with SLA picker |
| Recurring Tasks | `recurring.html` | Manager grid, create modal |
| Handover Entry | `handover-form.html` | Structured form with checklist section |
| Handover Dashboard | `handover.html` | Submission status grid, compare panel |
| Handover Detail | `handover-detail.html` | Full record, reviewer interface |
| Training Dashboard | `training.html` | Cards per employee, delayed alert list |
| Training Detail | `training-detail.html` | Progress log, trend chart |
| Training Form | `training-form.html` | Plan creation |
| Sales Dashboard | `sales.html` | Rankings, charts, shift filter |
| Notifications | `notifications.html` | Filterable notification list |
| Settings | `settings.html` | Score config, lookup editor |

---

## login.html — Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KIB Operations Portal — Login</title>
  <link rel="stylesheet" href="/assets/css/main.css">
</head>
<body class="login-page">
  <div class="login-container">
    <div class="login-logo">
      <img src="/assets/icons/kib-logo.png" alt="KIB">
      <h1>Operations Portal</h1>
      <p>Kuwait International Bank — Internal Use Only</p>
    </div>
    
    <form class="login-form" id="loginForm">
      <div class="form-group">
        <label for="userSelect">Select Your Name</label>
        <select id="userSelect" name="user_id" required>
          <option value="">— Choose —</option>
          <!-- Populated via JS from /api/users/list -->
        </select>
      </div>
      
      <div class="form-group">
        <label for="pinInput">PIN</label>
        <input type="password" id="pinInput" name="pin" maxlength="4" 
               pattern="[0-9]{4}" inputmode="numeric" 
               placeholder="4-digit PIN" required>
      </div>
      
      <button type="submit" class="btn btn-primary btn-full" id="loginBtn">
        <span class="btn-text">Sign In</span>
        <span class="btn-loader hidden">...</span>
      </button>
      
      <div class="form-error hidden" id="loginError"></div>
    </form>
  </div>
  
  <script src="/assets/js/config.js"></script>
  <script src="/assets/js/ui.js"></script>
  <script src="/assets/js/api.js"></script>
  <script src="/assets/js/auth.js"></script>
  <script src="/assets/js/login.js"></script>
</body>
</html>
```

---

## index.html (Main Dashboard) — Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard — KIB Ops Portal</title>
  <link rel="stylesheet" href="/assets/css/main.css">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
</head>
<body class="app-layout">

  <!-- Sidebar -->
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <img src="/assets/icons/kib-logo.png" alt="KIB" class="sidebar-logo">
      <span class="sidebar-title">Ops Portal</span>
    </div>
    <ul class="sidebar-nav">
      <li class="nav-item active"><a href="/index.html"><i data-feather="grid"></i> Dashboard</a></li>
      <li class="nav-item"><a href="/tasks.html"><i data-feather="check-square"></i> Tasks</a></li>
      <li class="nav-item"><a href="/handover.html"><i data-feather="repeat"></i> Handover</a></li>
      <li class="nav-item"><a href="/training.html"><i data-feather="book-open"></i> Training</a></li>
      <li class="nav-item"><a href="/sales.html"><i data-feather="trending-up"></i> Sales</a></li>
      <li class="nav-item" data-roles="HoD,Manager"><a href="/settings.html"><i data-feather="settings"></i> Settings</a></li>
    </ul>
    <div class="sidebar-footer">
      <div class="user-chip" id="sidebarUser">
        <div class="user-avatar" id="avatarInitials">TK</div>
        <div class="user-info">
          <div class="user-name" id="sidebarName">Loading...</div>
          <div class="user-role" id="sidebarRole">—</div>
        </div>
      </div>
      <button class="btn-logout" onclick="AUTH.logout()">
        <i data-feather="log-out"></i>
      </button>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Top Bar -->
    <header class="top-bar">
      <button class="sidebar-toggle" id="sidebarToggle">
        <i data-feather="menu"></i>
      </button>
      <div class="breadcrumb">
        <span>Dashboard</span>
      </div>
      <div class="top-bar-actions">
        <div class="search-bar">
          <i data-feather="search"></i>
          <input type="text" placeholder="Search tasks..." id="globalSearch">
        </div>
        <button class="notif-bell" id="notifBell">
          <i data-feather="bell"></i>
          <span class="notif-badge hidden" id="notifCount">0</span>
        </button>
        <div class="date-display" id="currentDate"></div>
      </div>
    </header>

    <!-- Page Content -->
    <div class="page-content">
      <div class="page-header">
        <h1 class="page-title">Operations Dashboard</h1>
        <p class="page-subtitle" id="dashSubtitle">Good morning, Talal</p>
      </div>

      <!-- KPI Cards Row 1 -->
      <div class="kpi-grid" id="kpiGrid">
        <div class="kpi-card" id="kpi-tasks">
          <div class="kpi-icon tasks-icon"><i data-feather="check-square"></i></div>
          <div class="kpi-body">
            <div class="kpi-value" id="kpiTasksOpen">—</div>
            <div class="kpi-label">Open Tasks</div>
            <div class="kpi-sub" id="kpiTasksSub">— total</div>
          </div>
        </div>
        <div class="kpi-card danger" id="kpi-overdue">
          <div class="kpi-icon"><i data-feather="alert-circle"></i></div>
          <div class="kpi-body">
            <div class="kpi-value" id="kpiOverdue">—</div>
            <div class="kpi-label">Overdue Tasks</div>
            <div class="kpi-sub" id="kpiSLARate">— SLA rate</div>
          </div>
        </div>
        <div class="kpi-card" id="kpi-handover">
          <div class="kpi-icon"><i data-feather="repeat"></i></div>
          <div class="kpi-body">
            <div class="kpi-value" id="kpiHandoverSubmitted">—</div>
            <div class="kpi-label">Handovers Today</div>
            <div class="kpi-sub danger-text" id="kpiHandoverMissing">— missing</div>
          </div>
        </div>
        <div class="kpi-card success" id="kpi-sales">
          <div class="kpi-icon"><i data-feather="trending-up"></i></div>
          <div class="kpi-body">
            <div class="kpi-value" id="kpiSalesAmt">—</div>
            <div class="kpi-label">Sales Today (KWD)</div>
            <div class="kpi-sub" id="kpiSalesAch">— achievement</div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Task Completion — This Week</h3>
            <div class="chart-actions">
              <select id="taskChartFilter">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
          <canvas id="taskCompletionChart" height="200"></canvas>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3>Sales by Shift — Today</h3>
          </div>
          <canvas id="salesByShiftChart" height="200"></canvas>
        </div>
      </div>

      <!-- Bottom Row: Alerts + Training + Score -->
      <div class="bottom-grid">
        <!-- Alerts Panel -->
        <div class="alert-panel">
          <div class="panel-header">
            <h3>Active Alerts</h3>
            <a href="/notifications.html" class="link-sm">View All</a>
          </div>
          <div class="alert-list" id="alertList">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Training Progress -->
        <div class="training-panel">
          <div class="panel-header">
            <h3>Training Progress</h3>
            <a href="/training.html" class="link-sm">Details</a>
          </div>
          <div class="training-mini-list" id="trainingMiniList">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Score Card -->
        <div class="score-panel">
          <div class="panel-header">
            <h3>Performance Score</h3>
          </div>
          <div class="score-display">
            <div class="score-ring">
              <canvas id="scoreRingChart" width="120" height="120"></canvas>
              <div class="score-center">
                <div class="score-num" id="myScore">—</div>
                <div class="score-label">Today</div>
              </div>
            </div>
            <div class="score-breakdown" id="scoreBreakdown">
              <!-- Component scores -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Notification Drawer -->
  <div class="notif-drawer hidden" id="notifDrawer">
    <div class="notif-drawer-header">
      <h3>Notifications</h3>
      <button onclick="NOTIFICATIONS.markAllRead()">Mark all read</button>
      <button onclick="UI.closeNotifDrawer()"><i data-feather="x"></i></button>
    </div>
    <div class="notif-list" id="notifDrawerList"></div>
  </div>

  <!-- Global Toast -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/feather-icons/4.29.0/feather.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
  <script src="/assets/js/config.js"></script>
  <script src="/assets/js/utils.js"></script>
  <script src="/assets/js/ui.js"></script>
  <script src="/assets/js/api.js"></script>
  <script src="/assets/js/auth.js"></script>
  <script src="/assets/js/components.js"></script>
  <script src="/assets/js/notifications.js"></script>
  <script src="/assets/js/dashboard.js"></script>
  <script>
    AUTH.requireAuth();
    feather.replace();
    DASHBOARD.init();
    NOTIFICATIONS.startPolling(60000);
  </script>
</body>
</html>
```

---

# PHASE 9 — JAVASCRIPT MODULE STRUCTURE

## dashboard.js

```javascript
// /assets/js/dashboard.js

const DASHBOARD = (() => {
  let taskChart, salesChart, scoreChart;

  async function init() {
    const session = AUTH.getSession();
    UI.setPageUser(session);

    const data = await API.get('/api/dashboard/summary');
    renderKPIs(data);
    renderCharts(data);
    renderAlerts(data);
    renderTrainingMini(data);
    renderScore(data);
  }

  function renderKPIs(data) {
    document.getElementById('kpiTasksOpen').textContent = data.tasks.open;
    document.getElementById('kpiTasksSub').textContent = `${data.tasks.total} total`;
    document.getElementById('kpiOverdue').textContent = data.tasks.overdue;
    document.getElementById('kpiSLARate').textContent = `${data.tasks.completion_rate}% rate`;
    document.getElementById('kpiHandoverSubmitted').textContent = `${data.handovers.today_submitted} submitted`;
    if (data.handovers.today_missing > 0) {
      document.getElementById('kpiHandoverMissing').textContent = `${data.handovers.today_missing} missing`;
    }
    document.getElementById('kpiSalesAmt').textContent = `KWD ${data.sales.today_amount.toFixed(3)}`;
    document.getElementById('kpiSalesAch').textContent = `${data.sales.achievement_pct}% of target`;
  }

  function renderCharts(data) {
    // Task completion chart (line)
    const ctx1 = document.getElementById('taskCompletionChart').getContext('2d');
    taskChart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: data.tasks.weekly_labels || ['Mon','Tue','Wed','Thu','Sun','Sat'],
        datasets: [{
          label: 'Completed',
          data: data.tasks.weekly_completed || [],
          borderColor: '#1B85B8',
          backgroundColor: 'rgba(27,133,184,0.1)',
          tension: 0.4, fill: true,
        }, {
          label: 'Overdue',
          data: data.tasks.weekly_overdue || [],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          tension: 0.4, fill: true,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Sales by shift (bar)
    const ctx2 = document.getElementById('salesByShiftChart').getContext('2d');
    salesChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: data.sales.shift_labels || ['Morning','Afternoon','Evening'],
        datasets: [{
          label: 'KWD',
          data: data.sales.shift_amounts || [],
          backgroundColor: ['#0F4C75','#1B85B8','#22c55e'],
          borderRadius: 6,
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  function renderScore(data) {
    const ctx = document.getElementById('scoreRingChart').getContext('2d');
    const score = data.scores?.my_today || 0;
    document.getElementById('myScore').textContent = Math.round(score);
    scoreChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: ['#1B85B8', '#e2e8f0'],
          borderWidth: 0,
        }]
      },
      options: { cutout: '75%', plugins: { legend: { display: false } } }
    });
  }

  function renderAlerts(data) {
    const list = document.getElementById('alertList');
    // Populated from notifications data
  }

  return { init };
})();
```

## tasks.js (core structure)

```javascript
// /assets/js/tasks.js

const TASKS = (() => {
  let currentFilters = { status: '', priority: '', team: '', page: 1, limit: 25 };
  let taskData = [];

  async function init() {
    AUTH.requireAuth();
    const session = AUTH.getSession();
    UI.setPageUser(session);
    applyRoleUI(session.role);
    await loadLookups();
    await loadTasks();
    bindFilters();
    bindCreateBtn();
  }

  function applyRoleUI(role) {
    const canCreate = AUTH.canDo('tasks.create');
    document.getElementById('btnCreateTask').style.display = canCreate ? '' : 'none';
    document.getElementById('btnReassign').style.display = AUTH.canDo('tasks.reassign') ? '' : 'none';
  }

  async function loadTasks() {
    UI.showSectionLoader('taskList');
    try {
      const data = await API.get('/api/tasks/list', currentFilters);
      taskData = data.tasks;
      renderTaskList(taskData);
      renderPagination(data.total, currentFilters.page, currentFilters.limit);
    } catch (e) {
      UI.showEmptyState('taskList', 'Failed to load tasks');
    } finally {
      UI.hideSectionLoader('taskList');
    }
  }

  function renderTaskList(tasks) {
    const container = document.getElementById('taskList');
    if (!tasks.length) {
      UI.showEmptyState('taskList', 'No tasks match your filters');
      return;
    }
    container.innerHTML = tasks.map(t => renderTaskCard(t)).join('');
  }

  function renderTaskCard(task) {
    const tr = UTILS.timeRemaining(task.due_datetime);
    const priority_dot = `<span class="priority-dot" style="background:${UTILS.priorityColor(task.priority)}"></span>`;
    return `
      <div class="task-card ${task.is_overdue ? 'overdue' : ''}" onclick="TASKS.openDetail('${task.task_id}')">
        <div class="task-card-header">
          ${priority_dot}
          <span class="task-id mono">${task.task_id}</span>
          <span class="badge ${UTILS.statusBadgeClass(task.status)}">${task.status}</span>
        </div>
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
          <span class="assignee">👤 ${task.assigned_to_name}</span>
          <span class="sla ${tr.overdue ? 'text-danger' : ''}">${tr.label}</span>
          <span class="progress-mini">
            <div class="progress-bar-mini"><div style="width:${task.progress_percentage}%"></div></div>
            ${task.progress_percentage}%
          </span>
        </div>
      </div>`;
  }

  async function openDetail(taskId) {
    window.location.href = `/task-detail.html?id=${taskId}`;
  }

  async function createTask(formData) {
    try {
      const result = await API.post('/api/tasks/create', formData);
      UI.showToast(`Task ${result.task_id} created`, 'success');
      loadTasks();
    } catch (e) { /* handled by api.js */ }
  }

  async function updateStatus(taskId, newStatus, notes = '') {
    await API.post('/api/tasks/update', { task_id: taskId, status: newStatus, completion_notes: notes });
    UI.showToast('Status updated', 'success');
    loadTasks();
  }

  function bindFilters() {
    document.getElementById('filterStatus').addEventListener('change', e => {
      currentFilters.status = e.target.value;
      currentFilters.page = 1;
      loadTasks();
    });
    document.getElementById('searchInput').addEventListener('input',
      UTILS.debounce(e => { currentFilters.search = e.target.value; loadTasks(); }, 400)
    );
  }

  function bindCreateBtn() {
    document.getElementById('btnCreateTask')?.addEventListener('click', () => {
      window.location.href = '/task-form.html';
    });
  }

  return { init, openDetail, updateStatus, createTask };
})();
```

---

# PHASE 10 — BUSINESS RULES / LOGIC

## Overdue Task Logic

```
Rule: A task becomes Overdue when:
  current_datetime > due_datetime AND status NOT IN (Completed, Cancelled)

On becoming Overdue:
  1. Set is_overdue = TRUE
  2. Record overdue_duration_hrs = (now - due_datetime) / 3600
  3. Set status = Overdue (system action)
  4. Append to TaskActivityLog: action_type = status_changed, from=prev_status, to=Overdue
  5. Send notification to assignee: task_overdue
  6. If escalation_enabled = TRUE: send notification to Manager
  7. If priority = Critical: also send to HoD immediately

Overdue Escalation Levels:
  Level 0: Just overdue, notified
  Level 1 (>= escalation_overdue_hours from ScoreConfig): Escalated to Manager
  Level 2 (>= 2x escalation_overdue_hours OR critical priority): Escalated to HoD
  overdue_escalation_level column tracks current level
```

## Task Completion After Overdue

```
When task is completed AND is_overdue = TRUE:
  → completed_on_time = FALSE
  → completed_datetime = now()
  → status = Completed
  → Record in ActivityLog
  → Score penalty applies (counted in DailyScores)
  → Notification: task completed (late) → manager

When task is completed AND is_overdue = FALSE:
  → completed_on_time = TRUE
  → Score credit applies
```

## Recurring Task Duplicate Prevention

```
Check before generating:
  1. last_generated_date == today → SKIP (already generated)
  2. status == Paused or Cancelled → SKIP
  3. today < start_date → SKIP
  4. end_date != NULL AND today > end_date → SKIP, set status = Cancelled

After generation:
  → Update RecurringTasks.last_generated_date = today
  → This acts as the atomic duplicate lock
```

## Handover Quality Score Calculation

```
Quality Score (0–100) computed by n8n when handover is submitted:
  Base = 60 (for submitting on time)
  + 10 if key_updates is non-empty (>50 chars)
  + 10 if pending_items addressed
  + 10 if priority_items_next_shift non-empty
  + 5  if sales_summary filled
  + 5  if incident_summary filled (if any incidents)
  - 15 if submitted late (is_late_submission = TRUE)
  - 10 if unresolved_items not addressed from previous handover

Score floor = 0, ceiling = 100
```

## Carry-Forward Logic

```
When handover is reviewed (or auto-trigger at next shift start):
  1. Read all ShiftHandoverItems where handover_id = X AND status = Open
  2. For each open item:
     → Create new ShiftHandoverItem in the next handover (or pending handover)
     → Set carried_to_handover_id = next handover ID
     → Set original item's status = CarriedForward
  3. Update ShiftHandovers.carry_forward_flag = TRUE
```

## Training Trend Logic

```
trend_status computation (run nightly):
  expected_pct = (days_elapsed / total_days) * 100
  actual_pct   = progress_percentage

  if actual_pct >= expected_pct + 10 → Ahead
  if actual_pct >= expected_pct - 5  → OnTrack
  if actual_pct >= expected_pct - 20 → Behind
  if actual_pct < expected_pct - 20  → AtRisk

Delayed status trigger:
  if trend_status IN (Behind, AtRisk) AND days_remaining < 3 → status = Delayed
```

## Score When Data Is Missing

```
If a module has no data for a user on a given day:
  → Add module name to missing_data_flags
  → Treat that module score as 50 (neutral, not penalized, not rewarded)
  → This prevents zeroing the score unfairly

Exception: If missing_handover = TRUE for applicable roles → penalty still applies
If user role is not applicable for a module (e.g. QA has no handover):
  → Weight for that module is redistributed proportionally among applicable modules
```

## Timezone Consistency

```
Rule: ALL datetime stored as UTC ISO 8601 in Sheets
Rule: ALL display converted to Kuwait Time (UTC+3) in frontend via UTILS.toKuwaitTime()
Rule: n8n nodes use "Asia/Kuwait" timezone setting
Rule: "Today's date" in Kuwait = new Date() adjusted for UTC+3, date portion only
Rule: SLA calculation uses UTC ms arithmetic (no TZ issues)
Rule: Shift boundaries stored as time strings (HH:MM) relative to Kuwait time
```

---

# PHASE 11 — DASHBOARD METRICS & SCORING FORMULAS

## Task Metrics

```
Total Tasks           = COUNT(Tasks where active_flag=TRUE)
Open Tasks            = COUNT(status NOT IN Completed, Cancelled)
Completed Tasks       = COUNT(status = Completed)
Overdue Tasks         = COUNT(is_overdue = TRUE AND status != Completed)
Completion Rate (%)   = (Completed / Total) * 100
On-Time Rate (%)      = (completed_on_time=TRUE COUNT / Completed) * 100
Tasks Due Today       = COUNT(due_datetime.date = today_kwt)
SLA Risk              = COUNT(status != Completed AND timeRemaining < 2h)
Workload by User      = COUNT(assigned_to_user_id = X AND status != Completed)
```

## Handover Metrics

```
Submitted Today       = COUNT(date=today AND submission_status=Submitted)
Missing Today         = COUNT(HandoverExpectedLog where status=Missing AND date=today)
Late Today            = COUNT(is_late_submission=TRUE AND date=today)
Avg Quality Score     = AVG(handover_quality_score, date range)
Carry-Forward Rate    = COUNT(carry_forward_flag=TRUE) / COUNT(total) * 100
Repeated Issues       = COUNT(items in multiple handovers as CarriedForward)
```

## Training Metrics

```
Active Plans          = COUNT(status IN Started, InProgress, Assigned)
Delayed Plans         = COUNT(status = Delayed)
Completion Rate       = AVG(progress_percentage, active plans)
3-Day Trend           = Compare last_3_day_progress quantities
By Employee           = GROUP BY employee_user_id → AVG progress_percentage
By Trainer            = GROUP BY trainer_user_id → COUNT active plans
```

## Sales Metrics

```
Sales by Employee     = SUM(sales_amount GROUP BY employee_user_id, date)
Sales by Shift        = SUM(sales_amount GROUP BY shift_type, date)
Achievement %         = (actual / target) * 100
Top Performer         = MAX(SUM(sales_amount), period)
Trend (7-day)         = Array of daily SUM(sales_amount)
```

## Scoring Formulas (Full)

```javascript
// Daily Score Calculation (run in n8n W27)

function calcUserScore(user, weights, penalties, todayData) {
  // Extract weights (sum to 100)
  const { w_task, w_sla, w_handover, w_training, w_sales } = weights;
  const { penalty_overdue, penalty_missing_ho } = penalties;

  // Module scores (0–100 each)
  const task_score     = todayData.task_completion_pct     ?? 50; // 50 if no data
  const sla_score      = todayData.sla_compliance_pct      ?? 50;
  const handover_score = todayData.handover_quality_score  ?? (isHandoverRole(user.role) ? 0 : null);
  const training_score = todayData.training_progress_pct   ?? 50;
  const sales_score    = todayData.sales_achievement_pct   ?? 50;

  // Role-adjusted weights: if handover not applicable, redistribute weight
  let effectiveWeights = { ...weights };
  if (handover_score === null) {
    const extra = w_handover / 4; // distribute to other 4
    effectiveWeights = {
      w_task: w_task + extra,
      w_sla: w_sla + extra,
      w_handover: 0,
      w_training: w_training + extra,
      w_sales: w_sales + extra,
    };
  }

  // Weighted raw score
  const raw = (
    (task_score     * effectiveWeights.w_task     / 100) +
    (sla_score      * effectiveWeights.w_sla      / 100) +
    ((handover_score ?? 50) * effectiveWeights.w_handover / 100) +
    (training_score * effectiveWeights.w_training / 100) +
    (sales_score    * effectiveWeights.w_sales    / 100)
  );

  // Penalties
  const pen = (todayData.overdue_task_count * penalty_overdue) +
              (todayData.missing_handover_count * penalty_missing_ho);

  return Math.max(0, Math.min(100, raw - pen));
}

// Handover roles: HoD, Manager, TL, AL
function isHandoverRole(role) {
  return ['HoD', 'Manager', 'TL', 'AL'].includes(role);
}
```

## Weekly / Monthly Score

```
Weekly Score = AVG(DailyScores.final_score, WHERE score_date IN last 7 days AND user_id = X)
Monthly Score = AVG(DailyScores.final_score, WHERE score_date IN current month AND user_id = X)

Team Score = AVG(all user final_scores in team, same period)
Ranking = RANK users by final_score DESC
```

---

# PHASE 12 — MOCK DATA

## Users (sample)

| user_id | full_name | role | team | shift_default |
|---------|-----------|------|------|---------------|
| USR-001 | Talal Al Jarki | HoD | Management | Morning |
| USR-002 | Taher Al Baghli | Manager | Management | Morning |
| USR-003 | Ahmad Al-Rashidi | TL | Morning | Morning |
| USR-004 | Khalid Al-Mutairi | TL | Afternoon | Afternoon |
| USR-005 | Sara Al-Enezi | AL | Morning | Morning |
| USR-006 | Fatima Al-Sabah | AL | Afternoon | Afternoon |
| USR-007 | Mohammed Al-Azmi | QA | QA | Morning |
| USR-008 | Noor Al-Hamad | QA | QA | Afternoon |
| USR-009 | Yousef Al-Bader | BackOffice | BackOffice | Morning |
| USR-010 | Maryam Al-Kandari | BackOffice | BackOffice | Morning |

## Tasks (sample)

| task_id | title | priority | status | assigned_to | sla_label | due |
|---------|-------|----------|--------|-------------|-----------|-----|
| TASK-20250401-0001 | Process pending account openings | High | InProgress | USR-009 | 4 hours | 2025-04-01T12:00Z |
| TASK-20250401-0002 | QA review batch #42 | Medium | Assigned | USR-007 | 2 days | 2025-04-03T00:00Z |
| TASK-20250401-0003 | Prepare shift performance report | Low | Completed | USR-003 | 1 day | 2025-04-01T16:00Z |
| TASK-20250401-0004 | Escalate fraud case FR-2025-01 | Critical | Escalated | USR-002 | 2 hours | 2025-04-01T10:00Z |
| TASK-20250401-0005 | Update product knowledge training material | Medium | New | USR-003 | 3 days | 2025-04-04T00:00Z |

## Handovers (sample)

| handover_id | date | shift_type | submitted_by | staffing_count | sales_amount | quality_score |
|-------------|------|------------|--------------|----------------|--------------|---------------|
| HO-20250401-0001 | 2025-04-01 | Morning | USR-003 | 8 | 2340.500 | 85 |
| HO-20250401-0002 | 2025-04-01 | Afternoon | USR-004 | 6 | 1890.250 | 72 |
| HO-20250401-0003 | 2025-04-01 | Evening | USR-005 | 5 | 920.000 | 68 |

## Training Plans (sample)

| training_id | employee | trainer | subject | target_qty | completed_qty | progress | trend |
|-------------|----------|---------|---------|------------|---------------|----------|-------|
| TRN-20250401-0001 | USR-007 | USR-003 | PF Product Knowledge | 500 | 325 | 65% | OnTrack |
| TRN-20250401-0002 | USR-009 | USR-002 | Back Office Procedures | 200 | 60 | 30% | Delayed |
| TRN-20250401-0003 | USR-005 | USR-003 | Sales Technique | 300 | 290 | 97% | Ahead |

## Sales Records (sample)

| sales_record_id | date | shift | employee | product | count | amount | target | ach% |
|-----------------|------|-------|----------|---------|-------|--------|--------|------|
| SAL-20250401-0001 | 2025-04-01 | Morning | USR-003 | Personal Finance | 5 | 1200.000 | 1500 | 80% |
| SAL-20250401-0002 | 2025-04-01 | Morning | USR-005 | Current Account | 8 | 800.000 | 750 | 107% |
| SAL-20250401-0003 | 2025-04-01 | Afternoon | USR-004 | Cards | 3 | 450.000 | 600 | 75% |

## DailyScores (sample)

| score_id | date | user | task_score | sla_score | handover_score | training_score | sales_score | final |
|----------|------|------|-----------|-----------|----------------|----------------|-------------|-------|
| SCR-20250401-0001 | 2025-04-01 | USR-003 | 88 | 90 | 85 | 97 | 80 | 87.2 |
| SCR-20250401-0002 | 2025-04-01 | USR-007 | 72 | 80 | 50 | 65 | 50 | 66.8 |

---

# PHASE 13 — FOLDER STRUCTURE

```
/portal/
│
├── index.html                  ← Main dashboard (requires auth)
├── login.html                  ← Login page
├── tasks.html                  ← Task list/dashboard
├── task-detail.html            ← Task detail + comments
├── task-form.html              ← Create/edit task
├── recurring.html              ← Recurring task manager
├── handover.html               ← Handover dashboard
├── handover-form.html          ← Handover submission
├── handover-detail.html        ← Handover record + reviewer
├── training.html               ← Training dashboard
├── training-form.html          ← Create training plan
├── training-detail.html        ← Training detail + progress
├── sales.html                  ← Sales dashboard + rankings
├── notifications.html          ← Full notification list
├── settings.html               ← Score config, lookups (HoD)
│
├── assets/
│   ├── css/
│   │   ├── main.css            ← Full design system
│   │   ├── layout.css          ← Grid, sidebar, top-bar
│   │   ├── components.css      ← Cards, badges, buttons, forms
│   │   ├── charts.css          ← Chart container styles
│   │   ├── mobile.css          ← All responsive overrides
│   │   └── print.css           ← Print styles for reports
│   │
│   ├── js/
│   │   ├── config.js           ← Base URL, constants
│   │   ├── utils.js            ← Date, format, color helpers
│   │   ├── ui.js               ← Toast, modal, loader, empty state
│   │   ├── api.js              ← Fetch wrapper
│   │   ├── auth.js             ← Session, login, role check
│   │   ├── components.js       ← Reusable render functions
│   │   ├── dashboard.js        ← Main dashboard
│   │   ├── tasks.js            ← Task module
│   │   ├── handover.js         ← Handover module
│   │   ├── training.js         ← Training module
│   │   ├── sales.js            ← Sales module
│   │   ├── notifications.js    ← Notification polling/render
│   │   ├── scoring.js          ← Score display
│   │   └── login.js            ← Login page logic
│   │
│   └── icons/
│       └── kib-logo.png
│
└── README.md
```

---

# PHASE 14 — DEPLOYMENT / SETUP NOTES

## Step 1: Google Sheets Setup

1. Create a new Google Spreadsheet named `KIB_OPS_PORTAL_DB`
2. Create all 19 tabs as defined in Phase 3 (exact names, exact columns)
3. Share the spreadsheet with your n8n Google service account (Editor access)
4. Note the Spreadsheet ID from the URL

## Step 2: n8n Cloud Setup

1. Sign in to n8n Cloud
2. Create a new Google Sheets credential using OAuth or service account
3. Set timezone to `Asia/Kuwait` in n8n settings
4. Import all 28 workflows (create from scratch or use JSON import)
5. Set environment variables:
   ```
   SHEETS_ID = <your spreadsheet ID>
   PORTAL_BASE_URL = <your GitHub Pages URL>
   ```
6. Activate all webhook workflows and note their URLs
7. Set all scheduled workflows to Kuwait time crons:
   ```
   Overdue marker:      */30 * * * *
   Reminder sender:     */30 * * * *
   Escalation handler:  0 * * * *
   Recurring generator: 1 0 * * *  (00:01 KWT = 21:01 UTC)
   Score calculator:    0 20 * * *  (23:00 KWT = 20:00 UTC)
   Cache refresher:     */15 * * * *
   Missing HO check:    30 13,17,21,5 * * *  (16:30, 20:30, 00:30, 08:30 KWT)
   Delayed training:    0 5 * * *   (08:00 KWT = 05:00 UTC)
   ```

## Step 3: Frontend Setup

1. Clone or create the folder structure from Phase 13
2. Update `config.js` with your n8n webhook base URL:
   ```javascript
   const CONFIG = {
     n8n_base_url: 'https://your-n8n-instance.app.n8n.cloud/webhook',
     session_duration_hrs: 8,
     polling_interval_ms: 60000,
   };
   ```
3. Upload to GitHub Pages or any static hosting
4. Test login with first user record from Users tab

## Step 4: Initial Data

1. Populate Users tab with all 54 staff members
2. Populate LookupLists tab with all dropdown values
3. Populate ScoreConfig with default weights
4. Populate Settings with portal configuration
5. Populate HandoverExpectedLog with expected shifts for first week (optional — can auto-populate)

## Step 5: PIN Setup

Each user's PIN must be SHA-256 hashed before storing in Sheets:
```javascript
// Node.js one-liner to hash a PIN
const crypto = require('crypto');
console.log(crypto.createHash('sha256').update('1234').digest('hex'));
// Output: 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
```

---

# PHASE 15 — EDGE CASES / RISK CONTROLS

| Edge Case | Risk | Mitigation |
|-----------|------|------------|
| n8n webhook timeout | Frontend hangs | Set 30s fetch timeout; show error toast |
| Duplicate task creation (double-click) | Duplicate records | Disable submit button on first click; re-enable after response |
| Recurring task runs twice in a day | Duplicate child tasks | Check last_generated_date before creating |
| Session token expired mid-session | Silent auth failure | API.js checks for 401 and redirects to login |
| Google Sheets row limit (~10M cells) | Data overflow | Archive AuditLog monthly to separate sheet |
| Concurrent handover submissions | Race condition on sequential IDs | Use timestamp + user_id as collision buffer; n8n processes serially |
| Score calculation with no tasks | Division by zero | Use null-safe average: if denominator=0, return 100 |
| User changes role mid-period | Score inconsistency | Role stored denormalized in DailyScores — snapshot at time of calculation |
| Missing handover by Night shift | Date confusion | business_date field separate from date for cross-midnight shifts |
| Training plan added today, expected progress already behind | Unfair delayed flag | Grace period: do not compute trend_status for first 2 days |
| Manager assigns task to themselves | Loop in notification | Suppress self-notification: if assignee = assigner, skip assignee notif |
| Large Sheets reads slow dashboard | Latency >3s | Use DashboardCache tab; return cached data + background refresh |
| User forgets PIN | No recovery | HoD can reset via Settings page (n8n updates pin_hash) |
| Staff on leave | Score penalty for no data | Add is_on_leave flag to Users; skip score calculation for that day |

---

# STARTER CODE PACKAGE

## CSS Design System (main.css — core tokens and layout)

```css
/* /assets/css/main.css */

/* ═══════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════ */
:root {
  /* Brand Colors */
  --color-primary:       #0F4C75;
  --color-accent:        #1B85B8;
  --color-primary-light: #E8F4FD;

  /* Status Colors */
  --color-success:       #22c55e;
  --color-warning:       #f59e0b;
  --color-danger:        #ef4444;
  --color-critical:      #7c3aed;
  --color-info:          #3b82f6;

  /* Neutral */
  --color-surface:       #f8fafc;
  --color-card:          #ffffff;
  --color-border:        #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Text */
  --text-primary:        #0f172a;
  --text-secondary:      #475569;
  --text-muted:          #94a3b8;
  --text-white:          #ffffff;

  /* Sidebar */
  --sidebar-bg:          #0f172a;
  --sidebar-text:        #cbd5e1;
  --sidebar-active:      #1B85B8;
  --sidebar-width:       240px;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;
  --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px;

  /* Typography */
  --font-sans: 'IBM Plex Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --text-xs: 11px;  --text-sm: 12px;
  --text-base: 14px; --text-md: 16px;
  --text-lg: 18px;   --text-xl: 22px;
  --text-2xl: 28px;  --text-3xl: 36px;

  /* Radius */
  --radius-sm: 4px;  --radius-md: 8px;
  --radius-lg: 12px; --radius-xl: 16px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.12);

  /* Transition */
  --transition: 150ms ease;
}

/* ═══════════════════════════════════
   RESET & BASE
═══════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; }
body {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--color-surface);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--color-accent); text-decoration: none; }

/* ═══════════════════════════════════
   LAYOUT: APP SHELL
═══════════════════════════════════ */
.app-layout {
  display: flex;
  min-height: 100vh;
}

/* SIDEBAR */
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0; top: 0; bottom: 0;
  z-index: 100;
  transition: transform var(--transition);
}
.sidebar-header {
  padding: var(--space-6) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sidebar-logo { width: 32px; height: 32px; }
.sidebar-title { color: var(--text-white); font-weight: 700; font-size: var(--text-md); }
.sidebar-nav {
  list-style: none;
  padding: var(--space-4) 0;
  flex: 1;
  overflow-y: auto;
}
.nav-item a {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  color: var(--sidebar-text);
  font-size: var(--text-base);
  font-weight: 500;
  transition: all var(--transition);
  border-radius: 0;
}
.nav-item a:hover,
.nav-item.active a {
  color: var(--text-white);
  background: rgba(27,133,184,0.15);
  border-left: 3px solid var(--sidebar-active);
  padding-left: calc(var(--space-5) - 3px);
}
.nav-item a svg { width: 16px; height: 16px; stroke-width: 2; }
.sidebar-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.user-avatar {
  width: 36px; height: 36px;
  background: var(--sidebar-active);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: white; font-size: var(--text-sm);
  flex-shrink: 0;
}
.user-name { color: white; font-size: var(--text-sm); font-weight: 600; }
.user-role { color: var(--sidebar-text); font-size: var(--text-xs); }
.btn-logout {
  margin-left: auto;
  background: none; border: none; cursor: pointer;
  color: var(--sidebar-text); padding: var(--space-2);
  transition: color var(--transition);
}
.btn-logout:hover { color: var(--color-danger); }

/* MAIN CONTENT */
.main-content {
  margin-left: var(--sidebar-width);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* TOP BAR */
.top-bar {
  background: white;
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-6);
  height: 60px;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  position: sticky; top: 0; z-index: 50;
}
.top-bar-actions {
  margin-left: auto;
  display: flex; align-items: center; gap: var(--space-4);
}
.search-bar {
  display: flex; align-items: center; gap: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}
.search-bar input {
  border: none; background: none; outline: none;
  font-size: var(--text-sm); width: 200px;
}
.notif-bell {
  position: relative; background: none; border: none;
  cursor: pointer; padding: var(--space-2);
  color: var(--text-secondary);
}
.notif-badge {
  position: absolute; top: 0; right: 0;
  background: var(--color-danger);
  color: white; font-size: 9px; font-weight: 700;
  min-width: 16px; height: 16px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px;
}

/* PAGE CONTENT */
.page-content {
  padding: var(--space-6);
  flex: 1;
}
.page-header { margin-bottom: var(--space-6); }
.page-title { font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }
.page-subtitle { color: var(--text-muted); margin-top: var(--space-1); }

/* ═══════════════════════════════════
   KPI CARDS
═══════════════════════════════════ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.kpi-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: var(--space-4);
  transition: box-shadow var(--transition);
}
.kpi-card:hover { box-shadow: var(--shadow-md); }
.kpi-card.danger { border-left: 4px solid var(--color-danger); }
.kpi-card.success { border-left: 4px solid var(--color-success); }
.kpi-card.warning { border-left: 4px solid var(--color-warning); }
.kpi-icon {
  width: 44px; height: 44px;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon svg { width: 20px; height: 20px; color: var(--color-primary); }
.kpi-value {
  font-size: var(--text-2xl); font-weight: 700;
  color: var(--text-primary); line-height: 1.2;
}
.kpi-label {
  font-size: var(--text-sm); color: var(--text-muted);
  margin-top: var(--space-1);
}
.kpi-sub { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }
.kpi-sub.danger-text { color: var(--color-danger); font-weight: 600; }

/* ═══════════════════════════════════
   CHART CARDS
═══════════════════════════════════ */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.chart-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}
.chart-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-4);
}
.chart-header h3 { font-size: var(--text-md); font-weight: 600; }

/* ═══════════════════════════════════
   BADGES
═══════════════════════════════════ */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.badge-blue    { background:#dbeafe; color:#1d4ed8; }
.badge-indigo  { background:#e0e7ff; color:#4338ca; }
.badge-yellow  { background:#fef9c3; color:#a16207; }
.badge-green   { background:#dcfce7; color:#15803d; }
.badge-red     { background:#fee2e2; color:#b91c1c; }
.badge-gray    { background:#f1f5f9; color:#475569; }
.badge-purple  { background:#ede9fe; color:#6d28d9; }
.badge-orange  { background:#ffedd5; color:#c2410c; }

/* ═══════════════════════════════════
   TASK CARDS
═══════════════════════════════════ */
.task-list { display: flex; flex-direction: column; gap: var(--space-3); }
.task-card {
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  transition: all var(--transition);
}
.task-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.task-card.overdue { border-left: 3px solid var(--color-danger); }
.task-card-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.priority-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.task-id { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.task-title { font-weight: 600; font-size: var(--text-base); color: var(--text-primary); margin-bottom: var(--space-3); }
.task-meta { display: flex; align-items: center; gap: var(--space-4); font-size: var(--text-sm); color: var(--text-muted); flex-wrap: wrap; }
.text-danger { color: var(--color-danger); font-weight: 600; }

/* ═══════════════════════════════════
   PROGRESS BARS
═══════════════════════════════════ */
.progress-bar-wrap { background: var(--color-border); border-radius: 4px; height: 6px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 4px; background: var(--color-accent); transition: width 0.5s ease; }
.progress-bar-mini { display: inline-block; width: 60px; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; vertical-align: middle; }
.progress-bar-mini div { height: 100%; background: var(--color-accent); border-radius: 2px; }

/* ═══════════════════════════════════
   BUTTONS
═══════════════════════════════════ */
.btn {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  border: none; cursor: pointer;
  font-size: var(--text-sm); font-weight: 600; font-family: var(--font-sans);
  transition: all var(--transition);
}
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover { background: var(--color-accent); }
.btn-secondary { background: white; color: var(--text-primary); border: 1px solid var(--color-border); }
.btn-secondary:hover { background: var(--color-surface); }
.btn-danger { background: var(--color-danger); color: white; }
.btn-full { width: 100%; justify-content: center; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ═══════════════════════════════════
   FORMS
═══════════════════════════════════ */
.form-group { margin-bottom: var(--space-4); }
.form-group label {
  display: block; font-size: var(--text-sm); font-weight: 600;
  color: var(--text-secondary); margin-bottom: var(--space-2);
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans); font-size: var(--text-base);
  color: var(--text-primary); background: white;
  transition: border-color var(--transition);
  outline: none;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(27,133,184,0.15);
}
.form-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);
}

/* ═══════════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════════ */
.toast-container {
  position: fixed; bottom: var(--space-6); right: var(--space-6);
  z-index: 9999; display: flex; flex-direction: column; gap: var(--space-3);
}
.toast {
  display: flex; align-items: center; gap: var(--space-3);
  background: white; border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--color-accent);
  min-width: 280px; max-width: 400px;
  animation: slideUp 0.3s ease;
}
.toast.success { border-left-color: var(--color-success); }
.toast.error   { border-left-color: var(--color-danger); }
.toast.warning { border-left-color: var(--color-warning); }
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* ═══════════════════════════════════
   TABLES
═══════════════════════════════════ */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--text-muted);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-surface);
}
.data-table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}
.data-table tr:hover td { background: var(--color-primary-light); }

/* ═══════════════════════════════════
   PANELS
═══════════════════════════════════ */
.panel-card {
  background: white; border-radius: var(--radius-lg);
  border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.panel-header h3 { font-size: var(--text-md); font-weight: 600; }
.link-sm { font-size: var(--text-sm); color: var(--color-accent); font-weight: 500; }

/* ═══════════════════════════════════
   UTILITY
═══════════════════════════════════ */
.hidden { display: none !important; }
.mono { font-family: var(--font-mono); }
.text-muted { color: var(--text-muted); }
.text-danger { color: var(--color-danger); }
.text-success { color: var(--color-success); }
.flex { display: flex; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
.mt-4 { margin-top: var(--space-4); }
.mb-4 { margin-bottom: var(--space-4); }

/* ═══════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════ */
.login-page {
  background: linear-gradient(135deg, var(--color-primary) 0%, #1a3a5c 60%, #0a2a40 100%);
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
}
.login-container {
  background: white; border-radius: var(--radius-xl);
  padding: var(--space-10);
  width: 420px; max-width: 95vw;
  box-shadow: var(--shadow-lg);
}
.login-logo { text-align: center; margin-bottom: var(--space-8); }
.login-logo h1 { font-size: var(--text-xl); font-weight: 700; margin-top: var(--space-3); }
.login-logo p { color: var(--text-muted); font-size: var(--text-sm); margin-top: var(--space-1); }
.form-error { color: var(--color-danger); font-size: var(--text-sm); padding: var(--space-3); background: #fee2e2; border-radius: var(--radius-md); margin-top: var(--space-3); }

/* ═══════════════════════════════════
   RESPONSIVE — MOBILE
═══════════════════════════════════ */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-toggle { display: flex; }
  
  .main-content { margin-left: 0; }
  
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
  .bottom-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  
  .page-content { padding: var(--space-4); }
  .top-bar { padding: 0 var(--space-4); }
  
  .search-bar input { width: 140px; }
  
  /* Mobile bottom nav */
  .mobile-bottom-nav {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white;
    border-top: 1px solid var(--color-border);
    z-index: 100;
    padding: var(--space-2) 0;
  }
  .mobile-bottom-nav a {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; gap: 2px;
    font-size: 10px; color: var(--text-muted);
    padding: var(--space-2);
  }
  .mobile-bottom-nav a.active { color: var(--color-accent); }
  
  .page-content { padding-bottom: 80px; } /* space for bottom nav */
}

@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .kpi-value { font-size: var(--text-xl); }
  
  .data-table { display: block; overflow-x: auto; }
}

@media (min-width: 1440px) {
  .kpi-grid { grid-template-columns: repeat(5, 1fr); }
}
```

---

## n8n Workflow Skeleton — Create Task (W03)

```json
{
  "name": "W03 — Create Task",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "api/tasks/create",
        "responseMode": "lastNode",
        "options": {}
      }
    },
    {
      "name": "Validate Auth",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const token = $input.first().json.headers?.['x-session-token'];\nif (!token) return [{ json: { error: 'Missing token', code: 401 } }];\nitems[0].json.sessionToken = token;\nreturn items;"
      }
    },
    {
      "name": "Read Users Sheet",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "read",
        "sheetName": "Users",
        "options": { "where": { "values": [{ "column": "session_token", "value": "={{$json.sessionToken}}" }] } }
      }
    },
    {
      "name": "Check Permission",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const user = $input.first().json;\nif (!user || !user.user_id) return [{ json: { error: 'Unauthorized', code: 401 } }];\nconst allowed = ['HoD', 'Manager'];\nif (!allowed.includes(user.role)) return [{ json: { error: 'Forbidden', code: 403 } }];\nitems[0].json.authUser = user;\nreturn items;"
      }
    },
    {
      "name": "Validate Fields",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const body = $input.first().json.body;\nconst required = ['title','category','assigned_to_user_id','priority','sla_value','sla_unit'];\nfor (const f of required) { if (!body[f]) return [{ json: { error: `Missing field: ${f}`, code: 400 } }]; }\nconst SLA_HOURS = [1,2,3,4,5,6,7];\nconst SLA_DAYS = [1,2,3,4,5,6,7,14,30];\nif (body.sla_unit === 'hours' && !SLA_HOURS.includes(Number(body.sla_value))) return [{ json: { error: 'Invalid SLA hours', code: 400 } }];\nif (body.sla_unit === 'days' && !SLA_DAYS.includes(Number(body.sla_value))) return [{ json: { error: 'Invalid SLA days', code: 400 } }];\nreturn items;"
      }
    },
    {
      "name": "Build Task Row",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const body = $input.first().json.body;\nconst auth = $input.first().json.authUser;\nconst today = new Date().toISOString().slice(0,10).replace(/-/g,'');\nconst seq = String(Date.now()).slice(-4).padStart(4,'0');\nconst taskId = `TASK-${today}-${seq}`;\nconst now = new Date();\nlet dueMs = now.getTime();\nif (body.sla_unit === 'hours') dueMs += body.sla_value * 3600000;\nelse dueMs += body.sla_value * 86400000;\nconst task = {\n  task_id: taskId,\n  title: body.title,\n  description: body.description || '',\n  category: body.category,\n  task_type: body.recurring_flag ? 'Recurring-Master' : 'Standard',\n  assigned_by_user_id: auth.user_id,\n  assigned_by_name: auth.full_name,\n  assigned_to_user_id: body.assigned_to_user_id,\n  assigned_to_name: body.assigned_to_name || '',\n  assigned_to_role: body.assigned_to_role || '',\n  assigned_to_team: body.assigned_to_team || '',\n  priority: body.priority,\n  status: 'Assigned',\n  sla_value: body.sla_value,\n  sla_unit: body.sla_unit,\n  sla_label: `${body.sla_value} ${body.sla_unit}`,\n  due_datetime: new Date(dueMs).toISOString(),\n  created_datetime: now.toISOString(),\n  updated_datetime: now.toISOString(),\n  reminder_enabled: body.reminder_enabled ? 'TRUE' : 'FALSE',\n  escalation_enabled: body.escalation_enabled ? 'TRUE' : 'FALSE',\n  recurring_flag: 'FALSE',\n  active_flag: 'TRUE',\n  is_overdue: 'FALSE',\n  progress_percentage: 0,\n};\nreturn [{ json: { task, taskId } }];"
      }
    },
    {
      "name": "Append Task to Sheet",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "append",
        "sheetName": "Tasks",
        "options": { "valueInputOption": "USER_ENTERED" }
      }
    },
    {
      "name": "Build Notification",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const task = $input.first().json.task;\nconst notif = {\n  notification_id: `NOTIF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-4)}`,\n  recipient_user_id: task.assigned_to_user_id,\n  notification_type: 'task_assigned',\n  module_name: 'tasks',\n  source_record_id: task.task_id,\n  severity: task.priority === 'Critical' ? 'critical' : 'info',\n  title: 'New Task Assigned',\n  message: `You have been assigned: \"${task.title}\" — Due in ${task.sla_label}`,\n  read_flag: 'FALSE',\n  created_datetime: new Date().toISOString(),\n  action_target: `/task-detail.html?id=${task.task_id}`,\n};\nreturn [{ json: notif }];"
      }
    },
    {
      "name": "Append Notification",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "append",
        "sheetName": "Notifications"
      }
    },
    {
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, data: { task_id: $json.taskId } }) }}"
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [["Validate Auth"]] },
    "Validate Auth": { "main": [["Read Users Sheet"]] },
    "Read Users Sheet": { "main": [["Check Permission"]] },
    "Check Permission": { "main": [["Validate Fields"]] },
    "Validate Fields": { "main": [["Build Task Row"]] },
    "Build Task Row": { "main": [["Append Task to Sheet"]] },
    "Append Task to Sheet": { "main": [["Build Notification"]] },
    "Build Notification": { "main": [["Append Notification"]] },
    "Append Notification": { "main": [["Respond Success"]] }
  }
}
```

---

## Google Sheets — Sample Headers

**Tab: Tasks**
```
task_id | title | description | category | task_type | assigned_by_user_id | assigned_by_name | assigned_to_user_id | assigned_to_name | assigned_to_role | assigned_to_team | priority | status | sla_value | sla_unit | sla_label | due_datetime | created_datetime | updated_datetime | started_datetime | completed_datetime | progress_percentage | reminder_enabled | reminder_sent_pre | reminder_sent_due | escalation_enabled | escalation_sent | recurring_flag | recurrence_type | parent_recurring_id | completion_notes | closure_reason | tags | active_flag | is_overdue | overdue_duration_hrs | completed_on_time | overdue_escalation_level
```

**Tab: Users**
```
user_id | full_name | display_name | role | team | shift_default | email | phone | pin_hash | session_token | session_expires | last_login | active_flag | created_datetime | notes
```

**Tab: ScoreConfig**
```
config_key | config_value | description | updated_by | updated_datetime
```

**Tab: ShiftHandovers**
```
handover_id | date | business_date | shift_type | shift_start_time | shift_end_time | submitted_by_user_id | submitted_by_name | submitted_by_role | team | staffing_count | staff_on_shift | key_updates | pending_items | escalated_items | customer_issues | system_issues | operational_issues | unresolved_items | important_followups | incident_summary | service_notes | priority_items_next_shift | sales_summary_count | sales_summary_amount | linked_sales_flag | checklist_json | handover_quality_score | submission_status | submitted_datetime | reviewed_by_user_id | reviewed_by_name | reviewed_datetime | carry_forward_flag | carry_forward_source_id | is_late_submission | created_datetime | updated_datetime
```

---

## config.js

```javascript
// /assets/js/config.js

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
  
  task_statuses: ['New', 'Assigned', 'InProgress', 'Pending', 'WaitingInput', 'UnderReview', 'Completed', 'Cancelled', 'Overdue', 'Escalated'],
  
  task_categories: ['Managerial','Operational','QA','BackOffice','TeamLeadership','AssistantLeadership','Compliance','FollowUp','Escalation','Handover','Coaching','Training','Sales','General'],
  
  training_statuses: ['Planned','Assigned','Started','InProgress','PendingReview','Completed','Delayed','Cancelled'],
  
  pages: {
    login:          '/login.html',
    dashboard:      '/index.html',
    tasks:          '/tasks.html',
    taskDetail:     '/task-detail.html',
    taskForm:       '/task-form.html',
    recurring:      '/recurring.html',
    handover:       '/handover.html',
    handoverForm:   '/handover-form.html',
    training:       '/training.html',
    sales:          '/sales.html',
    notifications:  '/notifications.html',
    settings:       '/settings.html',
  },
  
  score_component_labels: {
    task_completion:     'Task Completion',
    sla_compliance:      'SLA Compliance',
    handover_quality:    'Handover Quality',
    training_progress:   'Training Progress',
    sales_achievement:   'Sales Achievement',
  },
  
  chart_colors: {
    primary:  '#0F4C75',
    accent:   '#1B85B8',
    success:  '#22c55e',
    warning:  '#f59e0b',
    danger:   '#ef4444',
    muted:    '#94a3b8',
  }
});
```

---

## ui.js — Core UI Module

```javascript
// /assets/js/ui.js

const UI = (() => {
  // Toast
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle>'}
      </svg>
      <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // Global loader
  function showLoader() {
    let el = document.getElementById('globalLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalLoader';
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:var(--color-accent);z-index:9999;animation:loading 1s ease infinite';
      document.body.appendChild(el);
    }
  }
  function hideLoader() {
    document.getElementById('globalLoader')?.remove();
  }

  // Section skeleton loader
  function showSectionLoader(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div>';
  }
  function hideSectionLoader(containerId) { /* content replaced by render */ }

  // Empty state
  function showEmptyState(containerId, message = 'No data found') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="empty-state"><svg>...</svg><p>${message}</p></div>`;
  }

  // Set page user from session
  function setPageUser(session) {
    if (!session) return;
    const initials = session.display_name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('avatarInitials') && (document.getElementById('avatarInitials').textContent = initials);
    document.getElementById('sidebarName') && (document.getElementById('sidebarName').textContent = session.display_name);
    document.getElementById('sidebarRole') && (document.getElementById('sidebarRole').textContent = session.role);
    document.querySelectorAll('[data-roles]').forEach(el => {
      const allowed = el.dataset.roles.split(',');
      el.style.display = allowed.includes(session.role) ? '' : 'none';
    });
  }

  // Modal
  function showModal(title, bodyHTML, footerHTML) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  // Notification drawer
  function openNotifDrawer() { document.getElementById('notifDrawer')?.classList.remove('hidden'); }
  function closeNotifDrawer() { document.getElementById('notifDrawer')?.classList.add('hidden'); }

  return { showToast, showLoader, hideLoader, showSectionLoader, hideSectionLoader, showEmptyState, setPageUser, showModal, openNotifDrawer, closeNotifDrawer };
})();
```

---

*END OF BLUEPRINT DOCUMENT*

**Summary of deliverables in this document:**
- ✅ Phase 1: Solution Architecture
- ✅ Phase 2: Full Role & Permission Matrix
- ✅ Phase 3: 19-tab Google Sheets Schema (complete columns + examples)
- ✅ Phase 4: 28 n8n Workflows (inventory + detailed designs for key ones)
- ✅ Phase 5: API/Webhook Contracts (all major endpoints)
- ✅ Phase 6: Frontend Architecture (modules, patterns, api.js, auth.js, utils.js)
- ✅ Phase 7: UI/UX Layout Plan (design tokens, layout, mobile)
- ✅ Phase 8: Page-by-Page HTML (login, dashboard full skeleton)
- ✅ Phase 9: JS Module Structure (dashboard.js, tasks.js, ui.js)
- ✅ Phase 10: Business Rules (overdue, recurring, carry-forward, scoring, TZ)
- ✅ Phase 11: Metrics & Scoring Formulas (all modules + weekly/monthly)
- ✅ Phase 12: Mock Data (users, tasks, handovers, training, sales, scores)
- ✅ Phase 13: Folder Structure
- ✅ Phase 14: Deployment/Setup Notes (step-by-step)
- ✅ Phase 15: Edge Cases & Risk Controls
- ✅ Starter CSS Design System (full main.css, tokens, components, responsive)
- ✅ Starter JS Modules (config.js, ui.js, api.js, auth.js, utils.js, dashboard.js, tasks.js)
- ✅ n8n Workflow JSON Skeleton (W03 fully wired)
- ✅ Google Sheets Header rows (all key tabs)
