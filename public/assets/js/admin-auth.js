/**
 * Admin auth for the dashboard.
 *
 * Loaded FIRST on /dashboard: patches window.fetch so every same-origin /api
 * call (except /api/auth/login) carries the saved Bearer token — components
 * never need to know auth exists. A 401/403 from any call bounces to /login.
 */
(function () {
  const TOKEN_KEY = 'lsAdminToken';
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isApi = url.startsWith('/api') || url.includes(window.location.origin + '/api');
      const isLogin = url.includes('/api/auth/login');
      const headers = new Headers((init && init.headers) || (input && input.headers) || {});
      if (isApi && !isLogin && getToken() && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + getToken());
        if (typeof input === 'string') input = url; // unchanged, keep string form
        init = Object.assign({}, init, { headers });
      }
      // The exact token this request went out with — lets the 401 tap below
      // tell "expired token" apart from "token was refreshed mid-flight"
      // (the credential change hands us a new token; those stale 401s must
      // NOT bounce the operator to /login).
      const attachedAuth = headers.get('Authorization');
      const promise = nativeFetch(input, init);
      // Silence response-tap when body already consumed streams (play proxy etc.)
      if (isApi && !isLogin) {
        promise.then(resp => {
          if ((resp.status === 401 || resp.status === 403) && resp.headers.get('content-type')?.includes('json')) {
            const stored = getToken();
            const refreshedElsewhere = attachedAuth && stored && ('Bearer ' + stored) !== attachedAuth;
            if (!refreshedElsewhere) {
              // Token expired/invalid — hand over to the login page.
              try { localStorage.removeItem(TOKEN_KEY); } catch { }
              window.location.href = '/login';
            }
          }
        }).catch(() => { });
      }
      return promise;
    } catch {
      return nativeFetch(input, init);
    }
  };

  // Gate: no valid token -> login page before any component mounts.
  (async function verify() {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    try {
      const res = await nativeFetch('/api/auth/verify', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) {
        try { localStorage.removeItem(TOKEN_KEY); } catch { }
        window.location.href = '/login';
      }
    } catch {
      // Server unreachable — let the page's boot screen surface that.
    }
  })();

  window.LSAdminAuth = {
    logout() {
      try { localStorage.removeItem(TOKEN_KEY); } catch { }
      window.location.href = '/login';
    },
    // After a credential change the API returns a fresh token (the old one
    // dies with the rotated secret) — store it so polling continues.
    setToken(token) {
      try { localStorage.setItem(TOKEN_KEY, token); } catch { }
    }
  };
})();
