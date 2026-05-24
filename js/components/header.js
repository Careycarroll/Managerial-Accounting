// js/components/header.js
// Renders the shared site header and initializes the settings panel.
// Call initHeader() inside DOMContentLoaded on every page.

import { initSettingsPanel } from "/js/components/settings-panel.js";

export function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const path = window.location.pathname;
  const isLearn = path.includes("/pages/learn");
  const isApply = path.includes("/pages/apply");
  const isGlossary = path.includes("/pages/glossary");

  header.innerHTML = `
    <div class="site-header__inner">
      <a href="/" class="site-header__logo">
        <span>&#128202;</span>
        <span>Managerial Accounting</span>
      </a>
      <nav class="site-header__nav" role="navigation" aria-label="Main navigation">
        <a href="/pages/learn/" class="site-header__nav-link${isLearn ? " site-header__nav-link--active" : ""}">Learn</a>
        <a href="/pages/apply/" class="site-header__nav-link${isApply ? " site-header__nav-link--active" : ""}">Apply</a>
        <a href="/pages/glossary.html" class="site-header__nav-link${isGlossary ? " site-header__nav-link--active" : ""}">Glossary</a>
      </nav>
    </div>
  `;

  initSettingsPanel();
}
