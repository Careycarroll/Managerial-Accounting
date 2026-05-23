
// ── Settings Panel ────────────────────────────────────────────────────────────
// Injects a ⚙ button into the site header nav and manages a dropdown panel
// with three user preferences: content width, font scale, and color theme.
// All preferences are persisted to localStorage and applied on every page load.
//
// Usage: import { initSettingsPanel } from '/js/components/settings-panel.js';
//        call initSettingsPanel() inside DOMContentLoaded.
//
// Inline apply script (paste into <head> of every HTML page to prevent FOUC):
//   <script>
//     (function(){
//       const r = document.documentElement;
//       const w = localStorage.getItem('pref-width');
//       const f = localStorage.getItem('pref-font');
//       const t = localStorage.getItem('pref-theme');
//       if (w) r.style.setProperty('--max-width-tool', w + 'px');
//       if (f) r.style.setProperty('--font-scale', f);
//       if (t === 'dark') r.setAttribute('data-theme', 'dark');
//     })();
//   </script>

const DEFAULTS = {
  width: 1100,
  font:  1.0,
  theme: 'light',
};

const STORAGE = {
  width: 'pref-width',
  font:  'pref-font',
  theme: 'pref-theme',
};

function getPrefs() {
  return {
    width: parseInt(localStorage.getItem(STORAGE.width))  || DEFAULTS.width,
    font:  parseFloat(localStorage.getItem(STORAGE.font)) || DEFAULTS.font,
    theme: localStorage.getItem(STORAGE.theme)            || DEFAULTS.theme,
  };
}

function applyPrefs(prefs) {
  const r = document.documentElement;
  r.style.setProperty('--max-width-tool', prefs.width + 'px');
  r.style.setProperty('--font-scale', prefs.font);
  if (prefs.theme === 'dark') {
    r.setAttribute('data-theme', 'dark');
  } else {
    r.removeAttribute('data-theme');
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORAGE.width, prefs.width);
  localStorage.setItem(STORAGE.font,  prefs.font);
  localStorage.setItem(STORAGE.theme, prefs.theme);
}

export function initSettingsPanel() {
  // Apply saved prefs immediately (backup in case inline script missing)
  const prefs = getPrefs();
  applyPrefs(prefs);

  // Find header nav
  const nav = document.querySelector('.site-header__nav');
  if (!nav) return;

  // ── Gear button ──────────────────────────────────────────────────────────
  const gearBtn = document.createElement('button');
  gearBtn.id = 'settings-btn';
  gearBtn.className = 'site-header__nav-link settings-gear-btn';
  gearBtn.setAttribute('aria-label', 'Display settings');
  gearBtn.setAttribute('aria-expanded', 'false');
  gearBtn.innerHTML = '&#9881;';
  nav.appendChild(gearBtn);

  // ── Dropdown panel ───────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'settings-panel';
  panel.className = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Display settings');
  panel.hidden = true;
  panel.innerHTML = buildPanelHTML(prefs);
  document.body.appendChild(panel);

  // ── Toggle open/close ────────────────────────────────────────────────────
  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    gearBtn.setAttribute('aria-expanded', open);
    if (open) positionPanel();
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== gearBtn) {
      panel.hidden = true;
      gearBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      gearBtn.setAttribute('aria-expanded', 'false');
      gearBtn.focus();
    }
  });

  // ── Width slider ─────────────────────────────────────────────────────────
  const widthSlider = document.getElementById('settings-width');
  const widthLabel  = document.getElementById('settings-width-val');
  if (widthSlider) {
    widthSlider.value = prefs.width;
    widthSlider.addEventListener('input', () => {
      const v = parseInt(widthSlider.value);
      widthLabel.textContent = v + 'px';
      const p = getPrefs();
      p.width = v;
      applyPrefs(p);
      savePrefs(p);
    });
  }

  // ── Font slider ──────────────────────────────────────────────────────────
  const fontSlider = document.getElementById('settings-font');
  const fontLabel  = document.getElementById('settings-font-val');
  if (fontSlider) {
    fontSlider.value = prefs.font;
    fontSlider.addEventListener('input', () => {
      const v = parseFloat(fontSlider.value);
      fontLabel.textContent = Math.round(v * 100) + '%';
      const p = getPrefs();
      p.font = v;
      applyPrefs(p);
      savePrefs(p);
    });
  }

  // ── Theme toggle ─────────────────────────────────────────────────────────
  const themeToggle = document.getElementById('settings-theme');
  if (themeToggle) {
    themeToggle.checked = prefs.theme === 'dark';
    themeToggle.addEventListener('change', () => {
      const p = getPrefs();
      p.theme = themeToggle.checked ? 'dark' : 'light';
      applyPrefs(p);
      savePrefs(p);
      updateThemeLabel(themeToggle.checked);
    });
  }

  // ── Reset button ─────────────────────────────────────────────────────────
  const resetBtn = document.getElementById('settings-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const p = { ...DEFAULTS };
      applyPrefs(p);
      savePrefs(p);
      if (widthSlider) { widthSlider.value = p.width; widthLabel.textContent = p.width + 'px'; }
      if (fontSlider)  { fontSlider.value  = p.font;  fontLabel.textContent  = Math.round(p.font * 100) + '%'; }
      if (themeToggle) { themeToggle.checked = false; updateThemeLabel(false); }
    });
  }

  function positionPanel() {
    const btnRect = gearBtn.getBoundingClientRect();
    panel.style.top  = (btnRect.bottom + 8) + 'px';
    panel.style.right = (window.innerWidth - btnRect.right) + 'px';
  }

  function updateThemeLabel(isDark) {
    const lbl = document.getElementById('settings-theme-label');
    if (lbl) lbl.textContent = isDark ? 'Dark' : 'Light';
  }
}

function buildPanelHTML(prefs) {
  const widthPct = Math.round(((prefs.width - 800) / (1400 - 800)) * 100);
  return `
    <div class="settings-panel__header">
      <span class="settings-panel__title">&#9881; Display Settings</span>
    </div>
    <div class="settings-panel__body">

      <div class="settings-row">
        <div class="settings-row__label">
          <span>Content Width</span>
          <span class="settings-row__value" id="settings-width-val">${prefs.width}px</span>
        </div>
        <input
          type="range"
          id="settings-width"
          class="settings-slider"
          min="800" max="1400" step="50"
          value="${prefs.width}"
          aria-label="Content width"
        />
        <div class="settings-row__hints"><span>Narrow</span><span>Wide</span></div>
      </div>

      <div class="settings-row">
        <div class="settings-row__label">
          <span>Font Size</span>
          <span class="settings-row__value" id="settings-font-val">${Math.round(prefs.font * 100)}%</span>
        </div>
        <input
          type="range"
          id="settings-font"
          class="settings-slider"
          min="0.85" max="1.25" step="0.05"
          value="${prefs.font}"
          aria-label="Font size scale"
        />
        <div class="settings-row__hints"><span>Smaller</span><span>Larger</span></div>
      </div>

      <div class="settings-row settings-row--toggle">
        <span class="settings-row__label-text">Color Theme</span>
        <label class="settings-toggle" aria-label="Toggle dark mode">
          <input type="checkbox" id="settings-theme" ${prefs.theme === 'dark' ? 'checked' : ''} />
          <span class="settings-toggle__track"></span>
          <span class="settings-toggle__thumb"></span>
        </label>
        <span class="settings-row__value" id="settings-theme-label">${prefs.theme === 'dark' ? 'Dark' : 'Light'}</span>
      </div>

    </div>
    <div class="settings-panel__footer">
      <button class="btn btn--ghost btn--sm" id="settings-reset">Reset to defaults</button>
    </div>
  `;
}
