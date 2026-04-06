# KIB Operations Portal

**Internal Operations Portal** | Kuwait International Bank
Built with: HTML + CSS + JavaScript + Google Sheets + n8n

---

## Quick Start

### 1. Configure n8n URL
Open `/assets/js/config.js` and update:
```js
n8n_base_url: 'https://YOUR-N8N-INSTANCE.app.n8n.cloud/webhook',
```

### 2. Set Up Google Sheets
1. Create a new Google Spreadsheet named `KIB_OPS_PORTAL_DB`
2. Create all 19 tabs as documented in the Blueprint
3. Share with your n8n Google service account (Editor access)
4. Populate the `Users` tab with all staff
5. Populate `ScoreConfig` with default weights (see Blueprint)
6. Populate `LookupLists` with dropdown values

### 3. Deploy n8n Workflows
1. Import all 28 workflows into n8n Cloud
2. Set timezone to `Asia/Kuwait` in n8n instance settings
3. Activate all webhook workflows — note each webhook URL
4. Verify all paths match those in `config.js`

### 4. Set PINs
Hash each user's PIN with SHA-256 and store in `Users.pin_hash`:
```bash
echo -n "1234" | sha256sum
# → 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
```

### 5. Deploy Frontend
Upload all files to GitHub Pages or any static host.
No build step required — pure HTML/CSS/JS.

---

## File Structure
```
portal/
├── login.html              Login page
├── index.html              Main dashboard
├── tasks.html              Task list
├── task-detail.html        Task detail + comments
├── task-form.html          Create task
├── handover.html           Handover dashboard
├── handover-form.html      Submit handover
├── training.html           Training dashboard
├── training-form.html      Create training plan
├── sales.html              Sales rankings
├── notifications.html      Notification center
├── settings.html           Score config (HoD only)
└── assets/
    ├── css/main.css         Full design system
    └── js/
        ├── config.js        ← UPDATE THIS FIRST
        ├── utils.js         Date/format helpers
        ├── ui.js            Toast, modal, loader
        ├── api.js           n8n fetch wrapper
        ├── auth.js          Session management
        ├── components.js    Shared UI components
        ├── notifications.js Notification polling
        ├── dashboard.js     Main dashboard
        ├── tasks.js         Task module
        ├── handover.js      Handover module
        ├── training.js      Training module
        ├── sales.js         Sales module
        └── login.js         Login logic
```

## Roles
| Role | Code |
|------|------|
| Head of Department | `HoD` |
| Manager | `Manager` |
| Team Leader | `TL` |
| Assistant Leader | `AL` |
| Quality Assurance | `QA` |
| Back Office | `BackOffice` |

## Default Score Weights
| Module | Weight |
|--------|--------|
| Task Completion | 30% |
| SLA Compliance | 20% |
| Handover Quality | 15% |
| Training Progress | 15% |
| Sales Achievement | 20% |

## n8n Scheduled Workflows (Kuwait Time)
| Workflow | Cron (UTC) | Purpose |
|----------|-----------|---------|
| Overdue Marker | `*/30 * * * *` | Mark tasks overdue |
| Reminder Sender | `*/30 * * * *` | Pre-SLA reminders |
| Escalation Handler | `0 * * * *` | Escalate overdue tasks |
| Recurring Generator | `1 21 * * *` | 00:01 KWT daily tasks |
| Score Calculator | `0 20 * * *` | 23:00 KWT nightly scores |
| Cache Refresher | `*/15 * * * *` | Dashboard cache |
| Missing HO Checker | `30 13,17,21,5 * * *` | Check shift handovers |
| Delayed Training | `0 5 * * *` | 08:00 KWT check |

---
*For full architecture details see: KIB_OPS_PORTAL_BLUEPRINT.md*
