/**
 * journal-entry.js — Shared journal entry and T-account renderer
 * 
 * Usage:
 *   renderJournalEntry(containerEl, entries, options)
 *   renderTAccount(containerEl, accountName, debits, credits, options)
 *
 * Journal entry format:
 *   entries: [
 *     { account: 'Work-in-Process Control', debit: 81000, credit: null, indent: false },
 *     { account: 'Materials Control',       debit: null,  credit: 81000, indent: true  },
 *   ]
 *
 * T-account format:
 *   debits:  [{ label: 'Direct materials', amount: 81000 }]
 *   credits: [{ label: 'Completed jobs',   amount: 188800 }]
 */

const fmt = n => n == null ? '' : '$' + Math.round(n).toLocaleString();

// ── Journal Entry Renderer ────────────────────────────────────

export function renderJournalEntry(containerEl, entries, options = {}) {
  if (!containerEl) return;
  const title    = options.title    || null;
  const subtitle = options.subtitle || null;

  let html = '<div class="je-wrapper">';

  if (title) {
    html += `<div class="je-title">${title}</div>`;
  }
  if (subtitle) {
    html += `<div class="je-subtitle">${subtitle}</div>`;
  }

  html += `
    <div class="je-table">
      <div class="je-header">
        <span class="je-header__account">Account</span>
        <span class="je-header__debit">Debit</span>
        <span class="je-header__credit">Credit</span>
      </div>
  `;

  entries.forEach(entry => {
    const indentClass = entry.indent ? ' je-row--indent' : '';
    const debitClass  = entry.debit  ? ' je-row--has-debit'  : '';
    const creditClass = entry.credit ? ' je-row--has-credit' : '';
    html += `
      <div class="je-row${indentClass}${debitClass}${creditClass}">
        <span class="je-row__account">${entry.account}</span>
        <span class="je-row__debit">${entry.debit  != null ? fmt(entry.debit)  : ''}</span>
        <span class="je-row__credit">${entry.credit != null ? fmt(entry.credit) : ''}</span>
      </div>
    `;
  });

  const totalDebits  = entries.reduce((s, e) => s + (e.debit  || 0), 0);
  const totalCredits = entries.reduce((s, e) => s + (e.credit || 0), 0);

  if (options.showTotals) {
    html += `
      <div class="je-row je-row--total">
        <span class="je-row__account">Total</span>
        <span class="je-row__debit">${fmt(totalDebits)}</span>
        <span class="je-row__credit">${fmt(totalCredits)}</span>
      </div>
    `;
  }

  html += '</div></div>';
  containerEl.innerHTML = html;

  if (options.balanced !== false) {
    const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
    if (!balanced) {
      const warn = document.createElement('div');
      warn.className = 'je-warning';
      warn.textContent = '⚠ Entry does not balance — debits and credits must be equal.';
      containerEl.appendChild(warn);
    }
  }
}

// ── T-Account Renderer ────────────────────────────────────────

export function renderTAccount(containerEl, accountName, debits = [], credits = [], options = {}) {
  if (!containerEl) return;

  const totalDebits  = debits.reduce((s, d)  => s + (d.amount || 0), 0);
  const totalCredits = credits.reduce((s, c) => s + (c.amount || 0), 0);
  const balance      = totalDebits - totalCredits;
  const showBalance  = options.showBalance !== false;

  let html = `
    <div class="taccount">
      <div class="taccount__title">${accountName}</div>
      <div class="taccount__body">
        <div class="taccount__side taccount__side--debit">
          <div class="taccount__side-label">Dr</div>
  `;

  debits.forEach(d => {
    html += `
      <div class="taccount__row">
        <span class="taccount__row-label">${d.label || ''}</span>
        <span class="taccount__row-amount">${fmt(d.amount)}</span>
      </div>
    `;
  });

  if (showBalance && balance > 0) {
    html += `
      <div class="taccount__row taccount__row--balance">
        <span class="taccount__row-label">Bal.</span>
        <span class="taccount__row-amount">${fmt(balance)}</span>
      </div>
    `;
  }

  html += `
        </div>
        <div class="taccount__divider"></div>
        <div class="taccount__side taccount__side--credit">
          <div class="taccount__side-label">Cr</div>
  `;

  credits.forEach(c => {
    html += `
      <div class="taccount__row">
        <span class="taccount__row-label">${c.label || ''}</span>
        <span class="taccount__row-amount">${fmt(c.amount)}</span>
      </div>
    `;
  });

  if (showBalance && balance < 0) {
    html += `
      <div class="taccount__row taccount__row--balance">
        <span class="taccount__row-label">Bal.</span>
        <span class="taccount__row-amount">${fmt(Math.abs(balance))}</span>
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  containerEl.innerHTML = html;
}

// ── Multi T-Account Grid ──────────────────────────────────────

export function renderTAccountGrid(containerEl, accounts) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'taccount-grid';
  accounts.forEach(acct => {
    const wrapper = document.createElement('div');
    renderTAccount(wrapper, acct.name, acct.debits || [], acct.credits || [], acct.options || {});
    grid.appendChild(wrapper);
  });
  containerEl.appendChild(grid);
}
