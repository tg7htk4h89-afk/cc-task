// /assets/js/auth.js
// KIB Operations Portal — Authentication & Session Management

const AUTH = (() => {
  const KEY = CONFIG.session_key;

  const PERMISSIONS = {
    'tasks.create':        ['HoD', 'Manager'],
    'tasks.reassign':      ['HoD', 'Manager'],
    'tasks.cancel':        ['HoD', 'Manager'],
    'tasks.view_all':      ['HoD', 'Manager'],
    'recurring.manage':    ['HoD', 'Manager'],
    'handover.submit':     ['HoD', 'Manager', 'TL', 'AL'],
    'handover.review':     ['HoD', 'Manager'],
    'handover.view_all':   ['HoD', 'Manager'],
    'training.create':     ['HoD', 'Manager'],
    'training.update':     ['HoD', 'Manager', 'TL', 'AL'],
    'training.view_all':   ['HoD', 'Manager'],
    'sales.entry':         ['HoD', 'Manager', 'TL', 'AL'],
    'sales.view_all':      ['HoD', 'Manager'],
    'scores.configure':    ['HoD'],
    'settings.edit':       ['HoD'],
    'users.manage':        ['HoD'],
    'dashboard.global':    ['HoD', 'Manager'],
  };

  function getSession() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || new Date(s.expires_at) < new Date()) {
        localStorage.removeItem(KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async function login(userId, pin) {
    const data = await API.post('/api/user/bootstrap', { user_id: userId, pin });
    if (data) setSession(data);
    return data;
  }

  function logout() {
    localStorage.removeItem(KEY);
    window.location.href='login.html';
  }

  function requireAuth() {
    if (!getSession()) {
      window.location.href='login.html';
      return false;
    }
    return true;
  }

  function hasRole(...roles) {
    const s = getSession();
    return !!(s && roles.includes(s.role));
  }

  function canDo(action) {
    const s = getSession();
    if (!s) return false;
    const allowed = PERMISSIONS[action] || [];
    return allowed.includes(s.role);
  }

  function getUserId()   { return getSession()?.user_id; }
  function getUserRole() { return getSession()?.role; }
  function getUserTeam() { return getSession()?.team; }
  function getDisplayName() { return getSession()?.display_name || getSession()?.full_name; }

  return {
    getSession, login, logout, requireAuth, hasRole, canDo,
    getUserId, getUserRole, getUserTeam, getDisplayName
  };
})();
