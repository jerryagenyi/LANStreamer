/**
 * LSPwToggle — eye-icon visibility toggle for every password field.
 *
 * Auto-wires ALL <input type="password"> on load AND watches the DOM for
 * fields injected later (component-rendered cards) — pages just include this
 * file; no markup changes needed. The button is flat/token-styled, icon-only
 * with tooltips, and swallows mousedown so typing focus never leaves the field.
 */
(function () {
  const ICONS = { show: 'visibility', hide: 'visibility_off' };

  function wire(input) {
    if (input.__pwToggle) return;
    input.__pwToggle = true;

    // Wrap the input in a relative container holding the eye button — works
    // for bare inputs and inputs inside <label> alike, no markup assumptions.
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iconbtn';
    btn.setAttribute('aria-label', 'Show password');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Show password';
    btn.style.cssText =
      'position:absolute;top:50%;right:6px;transform:translateY(-50%);' +
      'width:28px;height:28px;display:grid;place-items:center;' +
      'background:none;border:none;cursor:pointer;color:var(--tok-text-3);padding:0;';
    btn.innerHTML = `<span class="material-symbols-rounded" style="font-size:17px;" aria-hidden="true">${ICONS.show}</span>`;

    // Keep the caret in the field: swallow the mouse gesture that would blur.
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      const revealing = input.type === 'password';
      input.type = revealing ? 'text' : 'password';
      btn.setAttribute('aria-pressed', revealing ? 'true' : 'false');
      btn.setAttribute('aria-label', revealing ? 'Hide password' : 'Show password');
      btn.title = revealing ? 'Hide password' : 'Show password';
      btn.firstElementChild.textContent = revealing ? ICONS.hide : ICONS.show;
      // Some browsers move the caret when the type flips — put it back.
      try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { /* type=text ok */ }
    });
    // Space/Enter on the button behave as click natively (real <button>).

    // Room for the icon so typed text never runs under it
    const currentPad = getComputedStyle(input).paddingRight || '10px';
    input.style.paddingRight = `calc(${currentPad} + 26px)`;

    wrapper.appendChild(btn);
  }

  function scan(root) {
    (root || document).querySelectorAll('input[type="password"]').forEach(wire);
  }

  function init() {
    scan(document);
    // Component-rendered cards (Admin account etc.) inject fields after load
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'INPUT' && node.type === 'password') wire(node);
          else if (node.querySelectorAll) scan(node);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LSPwToggle = { scan };
})();
