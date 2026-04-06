// /assets/js/api.js
// KIB Operations Portal — API Layer (n8n Webhook Wrapper)

const API = (() => {
  async function request(method, path, body = null, queryParams = {}) {
    const session = AUTH.getSession();
    const url = new URL(CONFIG.n8n_base_url + path);

    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') url.searchParams.append(k, v);
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

    // Timeout after 30 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    options.signal = controller.signal;

    try {
      UI.showLoader();
      const res = await fetch(url.toString(), options);
      clearTimeout(timeout);

      if (!res.ok && res.status !== 200) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.success === false) {
        if (data.error?.code === 401) {
          AUTH.logout();
          return;
        }
        throw new Error(data.error?.message || 'Request failed');
      }

      return data.data !== undefined ? data.data : data;

    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        UI.showToast('Request timed out. Please try again.', 'error');
      } else {
        UI.showToast(err.message || 'Connection error', 'error');
      }
      throw err;
    } finally {
      UI.hideLoader();
    }
  }

  return {
    get:  (path, params = {}) => request('GET', path, null, params),
    post: (path, body = {})   => request('POST', path, body),
  };
})();
