// /assets/js/login.js
// KIB Operations Portal — Login Page Logic

(async function initLogin() {
  // Redirect if already logged in
  if (AUTH.getSession()) {
    window.location.href='index.html';
    return;
  }

  // Load user list for dropdown
  try {
    const data = await fetch(CONFIG.n8n_base_url + '/api/users/list').then(r => r.json());
    const users = data?.data?.users || [];
    const select = document.getElementById('userSelect');
    if (select && users.length) {
      users.forEach(u => {
        if (u.active_flag !== 'FALSE') {
          const opt = document.createElement('option');
          opt.value = u.user_id;
          opt.textContent = u.full_name + (u.role ? ` (${u.role})` : '');
          select.appendChild(opt);
        }
      });
    }
  } catch (e) {
    // If lookup fails, user can type manually — fail gracefully
    console.warn('Could not load user list:', e);
  }

  // Bind form
  document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const userId = document.getElementById('userSelect')?.value;
    const pin    = document.getElementById('pinInput')?.value;
    const errEl  = document.getElementById('loginError');
    const btn    = document.getElementById('loginBtn');

    if (!userId || !pin || pin.length !== 4) {
      if (errEl) { errEl.textContent = 'Please select your name and enter your 4-digit PIN.'; errEl.classList.remove('hidden'); }
      return;
    }

    btn.disabled = true;
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    if (errEl) errEl.classList.add('hidden');

    try {
      const session = await AUTH.login(userId, pin);
      if (session) {
        window.location.href='index.html';
      }
    } catch (err) {
      if (errEl) { errEl.textContent = 'Invalid credentials. Please check your PIN and try again.'; errEl.classList.remove('hidden'); }
      btn.disabled = false;
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
    }
  });

  // PIN: only allow digits
  document.getElementById('pinInput')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });
})();
