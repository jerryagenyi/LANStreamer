// Shared: theme toggle (remembered), toasts, icons
(function(){
  const saved = localStorage.getItem('ls-theme');
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
})();
window.LS = {
  toggleTheme(){
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t; localStorage.setItem('ls-theme', t);
  },
  toast(msg, tag){
    let box = document.querySelector('.toasts');
    if(!box){ box = document.createElement('div'); box.className='toasts'; box.setAttribute('aria-live','polite'); document.body.appendChild(box); }
    if(tag){ const old = box.querySelector(`[data-tag="${tag}"]`); if(old) old.remove(); }
    const t = document.createElement('div'); t.className='toast'; t.textContent=msg; if(tag) t.dataset.tag=tag;
    box.appendChild(t); while(box.children.length>4) box.firstChild.remove();
    setTimeout(()=>t.remove(), 3200);
  }
};
const I = {
  logo:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="4" y="13" width="3" height="7" rx="1.5"/><rect x="10" y="9" width="3" height="11" rx="1.5"/><rect x="16" y="5" width="3" height="15" rx="1.5"/></svg>',
  play:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  stop:'<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
};
