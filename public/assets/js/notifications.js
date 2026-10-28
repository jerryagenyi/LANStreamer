/**
 * Notification center for the admin dashboard.
 *
 * A small persistent hub + header bell. Components push events:
 *   LSNotifications.notify({ title, message, type })   // type: info|success|warning|error
 *   LSNotifications.onChange(fn)                        // fn(item) after each push
 *
 * The bell button (#header-bell-btn) is rendered by HeaderComponent; this file
 * binds it whenever it appears (MutationObserver-free: bindBell is called after
 * header render, with a fallback scan on DOMContentLoaded). The bell "lights
 * up" (accent + pulsing dot) while there are unread notifications; clicking it
 * opens the panel and marks everything read.
 */
(function () {
  const MAX_ITEMS = 30;
  const items = [];
  let bound = false;
  let panelOpen = false;
  const listeners = [];

  const TYPE_META = {
    info: { icon: 'info', cls: 'lsn-info' },
    success: { icon: 'check_circle', cls: 'lsn-success' },
    warning: { icon: 'warning', cls: 'lsn-warning' },
    error: { icon: 'error', cls: 'lsn-error' },
    stream: { icon: 'podcasts', cls: 'lsn-info' },
    update: { icon: 'system_update', cls: 'lsn-success' }
  };

  function notify(n) {
    if (!n || !n.title) return;
    const item = {
      id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: String(n.title),
      message: String(n.message || ''),
      type: TYPE_META[n.type] ? n.type : 'info',
      ts: Date.now(),
      read: false
    };
    // Polling sources re-report the same condition — collapse duplicates
    const dup = items.find(i => i.title === item.title && item.ts - i.ts < 10000);
    if (dup) { dup.ts = item.ts; return; }

    items.unshift(item);
    if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
    renderBadge();
    if (panelOpen) renderPanel();
    listeners.forEach(fn => { try { fn(item); } catch (e) { /* listener bug shouldn't break the hub */ } });
  }

  function unreadCount() {
    return items.filter(i => !i.read).length;
  }

  function markAllRead() {
    items.forEach(i => { i.read = true; });
    renderBadge();
    if (panelOpen) renderPanel();
  }

  function clearAll() {
    items.length = 0;
    renderBadge();
    renderPanel();
  }

  function timeAgo(ts) {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }

  function ensurePanel(btn) {
    let panel = document.getElementById('lsn-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'lsn-panel';
    panel.className = 'lsn-panel is-hidden';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notifications');
    btn.parentElement.appendChild(panel);
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => {
      if (panelOpen && !panel.contains(e.target) && !btn.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelOpen) closePanel();
    });
    return panel;
  }

  function renderPanel() {
    const panel = document.getElementById('lsn-panel');
    if (!panel) return;
    if (!panelOpen) { panel.classList.add('is-hidden'); return; }
    panel.classList.remove('is-hidden');

    if (items.length === 0) {
      panel.innerHTML = `
        <div class="lsn-empty">
          <span class="material-symbols-rounded" aria-hidden="true">notifications_off</span>
          <p>No notifications yet</p>
          <p class="lsn-empty-sub">Stream failures, Icecast outages and update notices will appear here.</p>
        </div>`;
      return;
    }

    panel.innerHTML = `
      <div class="lsn-head">
        <span class="tok-label">Notifications</span>
        <button type="button" class="lsn-clear" id="lsn-clear">Clear all</button>
      </div>
      <div class="lsn-list">
        ${items.map(i => `
          <div class="lsn-item ${i.read ? '' : 'is-unread'}">
            <span class="material-symbols-rounded ${TYPE_META[i.type].cls}" aria-hidden="true">${TYPE_META[i.type].icon}</span>
            <div class="lsn-item-body">
              <p class="lsn-item-title">${i.title}</p>
              ${i.message ? `<p class="lsn-item-msg">${i.message}</p>` : ''}
              <p class="lsn-item-time">${timeAgo(i.ts)}</p>
            </div>
          </div>`).join('')}
      </div>`;

    const clear = document.getElementById('lsn-clear');
    if (clear) clear.addEventListener('click', clearAll);
  }

  function openPanel() {
    panelOpen = true;
    renderPanel();
    markAllRead();
  }

  function closePanel() {
    panelOpen = false;
    renderPanel();
  }

  function renderBadge() {
    const btn = document.getElementById('header-bell-btn');
    if (!btn) return;
    const unread = unreadCount();
    const badge = document.getElementById('header-bell-badge');
    if (badge) badge.remove();
    btn.classList.toggle('has-notifications', unread > 0);
    btn.title = unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'No notifications';
    btn.setAttribute('aria-label', btn.title);
    if (unread > 0) {
      const dot = document.createElement('span');
      dot.id = 'header-bell-badge';
      dot.className = 'lsn-badge';
      dot.setAttribute('aria-hidden', 'true');
      btn.appendChild(dot);
    }
  }

  function bindBell() {
    const btn = document.getElementById('header-bell-btn');
    if (!btn || bound) return;
    bound = true;
    ensurePanel(btn);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panelOpen) closePanel(); else openPanel();
    });
    renderBadge();
    // Re-render relative timestamps while open
    setInterval(() => { if (panelOpen) renderPanel(); }, 30000);
  }

  document.addEventListener('DOMContentLoaded', bindBell);

  window.LSNotifications = {
    notify,
    markAllRead,
    clearAll,
    items,
    unreadCount,
    bindBell,
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
