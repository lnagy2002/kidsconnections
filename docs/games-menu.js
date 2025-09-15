/*! Games Burger Menu — drop-in (no deps) */
(() => {
  const CSS = `
  .gm-burger{position:fixed;top:14px;left:14px;z-index:10000;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.35);backdrop-filter:blur(6px);color:#fff;cursor:pointer}
  .gm-burger:focus-visible{outline:3px solid #7dd3fc;outline-offset:2px}
  .gm-icon,.gm-icon::before,.gm-icon::after{content:"";display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transition:transform .25s ease,opacity .2s ease}
  .gm-icon{position:relative}.gm-icon::before,.gm-icon::after{position:absolute;left:0}.gm-icon::before{top:-7px}.gm-icon::after{top:7px}
  .gm-burger[aria-expanded=true] .gm-icon{transform:rotate(45deg)}
  .gm-burger[aria-expanded=true] .gm-icon::before{transform:translateY(7px) rotate(90deg)}
  .gm-burger[aria-expanded=true] .gm-icon::after{transform:translateY(-7px) rotate(90deg)}
  .gm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:9998}
  .gm-overlay.gm-open{opacity:1;pointer-events:auto}
  .gm-panel{position:fixed;top:0;left:0;height:100dvh;width:min(320px,86vw);background:#0e364b;color:#a9f4f4;border-right:1px solid #103954;transform:translateX(-100%);transition:transform .25s ease;z-index:9999;display:flex;flex-direction:column}
  .gm-panel.gm-open{transform:translateX(0)}
  .gm-header{padding:16px 18px;border-bottom:1px solid #103954;display:flex;gap:10px;align-items:center}
  .gm-title{font-size:16px;font-weight:700;margin:0}.gm-sub{font-size:12px;opacity:.75;margin:0}
  .gm-list{list-style:none;margin:0;padding:10px;overflow:auto}
  .gm-item a{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;color:inherit;text-decoration:none}
  .gm-item a:hover,.gm-item a:focus-visible{background:#114a64;outline:0}
  .gm-item a[aria-current=page]{background:#0b2b3b;box-shadow:inset 0 0 0 1px #1b4d63}
  .gm-emoji{font-size:20px;line-height:1}
  .gm-footer{margin-top:auto;padding:12px;font-size:12px;opacity:.7}
  @media (prefers-reduced-motion:reduce){.gm-panel,.gm-overlay,.gm-icon,.gm-icon::before,.gm-icon::after{transition:none!important}}
  `;

  const byPath = (url) => {
    try { return new URL(url, location.origin).pathname.replace(/\/+$/, ""); }
    catch { return (url||"").replace(/\/+$/,""); }
  };

  const makeEl = (tag, attrs={}) => Object.assign(document.createElement(tag), attrs);

  // Build DOM once
  function injectDOM() {
    if (document.getElementById('gm-burger')) return; // already present
    const style = makeEl('style', { textContent: CSS, id: 'gm-style' });
    const burger = makeEl('button', {
      id:'gm-burger', className:'gm-burger', 'aria-controls':'gm-panel',
      'aria-expanded':'false', 'aria-label':'Open games menu'
    });
    burger.appendChild(makeEl('span', { className:'gm-icon', ariaHidden:'true' }));

    const overlay = makeEl('div', { id:'gm-overlay', className:'gm-overlay' });
    const panel = makeEl('nav', { id:'gm-panel', className:'gm-panel', ariaHidden:'true' });
    const header = makeEl('div', { className:'gm-header' });
    header.appendChild(makeEl('div', {}));
    header.firstChild.appendChild(makeEl('p', { className:'gm-title', textContent:'Games' }));
    header.firstChild.appendChild(makeEl('p', { className:'gm-sub', textContent:'Jump to another game' }));
    const list = makeEl('ul', { id:'gm-list', className:'gm-list', role:'list' });
    const footer = makeEl('div', { className:'gm-footer', textContent:'Press Esc to close' });

    panel.appendChild(header); panel.appendChild(list); panel.appendChild(footer);

    document.documentElement.appendChild(style);
    document.body.appendChild(burger);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
  }

  function fillList(games) {
    const list = document.getElementById('gm-list');
    if (!list) return;
    list.innerHTML = '';
    const current = byPath(location.href);
    games.forEach(g => {
      const li = makeEl('li', { className:'gm-item' });
      const a = makeEl('a', { href: g.href });
      a.innerHTML = `<span class="gm-emoji">${g.emoji ?? "🎮"}</span><span>${g.title}</span>`;
      if (byPath(g.href) === current) a.setAttribute('aria-current','page');
      li.appendChild(a); list.appendChild(li);
    });

    // hide burger if nothing to show
    const burger = document.getElementById('gm-burger');
    if (burger) burger.style.display = games.length ? '' : 'none';
  }

  function wireBehavior() {
    const burger = document.getElementById('gm-burger');
    const panel  = document.getElementById('gm-panel');
    const overlay= document.getElementById('gm-overlay');
    if (!burger || !panel || !overlay) return;

    const open = () => {
      burger.setAttribute('aria-expanded','true');
      panel.classList.add('gm-open');
      overlay.classList.add('gm-open');
      panel.setAttribute('aria-hidden','false');
      const firstLink = panel.querySelector('a');
      (firstLink ?? panel).focus({preventScroll:true});
      document.addEventListener('keydown', onKey);
    };
    const close = () => {
      burger.setAttribute('aria-expanded','false');
      panel.classList.remove('gm-open');
      overlay.classList.remove('gm-open');
      panel.setAttribute('aria-hidden','true');
      burger.focus({preventScroll:true});
      document.removeEventListener('keydown', onKey);
    };
    const toggle = () => (panel.classList.contains('gm-open') ? close() : open());

    function onKey(e){
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab' && panel.classList.contains('gm-open')) {
        const foci = panel.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])');
        if (!foci.length) return;
        const first = foci[0], last = foci[foci.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    burger.addEventListener('click', toggle);
    overlay.addEventListener('click', close);
    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) close();
    });
  }

  async function loadConfig() {
    // Priority: 1) inline window.GAMES_MENU  2) data-menu attr URL  3) /games-menu.json
    const currentScript = document.currentScript;
    const attrUrl = currentScript?.dataset?.menu;
    if (Array.isArray(window.GAMES_MENU) && window.GAMES_MENU.length) {
      return window.GAMES_MENU;
    }
    const url = attrUrl || '/games-menu.json';
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw 0;
      const json = await res.json();
      if (Array.isArray(json)) return json;               // bare array
      if (Array.isArray(json.games)) return json.games;   // { games: [...] }
    } catch { /* fall through */ }
    return []; // nothing configured
  }

  async function init() {
    // Wait for body if loaded in <head>
    if (!document.body) await new Promise(r => addEventListener('DOMContentLoaded', r, { once:true }));
    injectDOM();
    wireBehavior();
    const games = await loadConfig();
    fillList(games);
    // Expose tiny API
    window.GamesMenu = {
      set(games){ fillList(games || []); },
      open(){ document.getElementById('gm-burger')?.click(); },
      close(){ /* best-effort: only close if open */ 
        const panel=document.getElementById('gm-panel');
        if (panel?.classList.contains('gm-open')) document.getElementById('gm-burger')?.click();
      }
    };
  }

  init();
})();
