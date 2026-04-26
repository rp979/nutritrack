// ══════════════════════════════════════════════════════════
// APP.JS — Navigation, shared utils, localStorage helpers
// ══════════════════════════════════════════════════════════

// ── DOM helper ──────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Today's date as YYYY-MM-DD ───────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

// ── Toast notification ────────────────────────────────────
function toast(msg, dur = 2200) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

// ── LocalStorage helpers ─────────────────────────────────
const LS = {
  get(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ── Navigation ────────────────────────────────────────────
function navTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  $('page-' + pageId)?.classList.add('active');
  document.querySelector(`.tab[data-page="${pageId}"]`)?.classList.add('active');
  onPageEnter(pageId);
}

// Called whenever a page becomes active
function onPageEnter(pageId) {
  switch (pageId) {
    case 'dashboard': refreshDashboard(); break;
    case 'log':       renderLog();        break;
    case 'weight':    renderWeightLog();  break;
    case 'sleep':     renderSleepLog();   break;
    case 'meal':      renderMealPlanner(); break;
    case 'compare':   renderCompare();    break;
  }
}

// Wire up tab clicks
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const pageId = tab.dataset.page;
    $('page-' + pageId)?.classList.add('active');
    onPageEnter(pageId);
  });
});

// ── Shared number formatter ──────────────────────────────
function fmt(n, decimals = 0) {
  return Number(n).toFixed(decimals);
}

// ── Clamp a value between min and max ────────────────────
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ── Format date for display ──────────────────────────────
function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ── Get last N days as YYYY-MM-DD strings ────────────────
function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

// ── Toggle body stat sections (BMI / BF / TDEE / Water) ──
function showBodySec(btn, secId) {
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.body-sec').forEach(s => s.style.display = 'none');
  $(secId).style.display = 'block';
}

// ── App init ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Set dashboard date
  const dateEl = $('dash-date-sub');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Set default date inputs to today
  const wtDate = $('wt-date');
  const slDate = $('sl-date');
  if (wtDate) wtDate.value = today();
  if (slDate) slDate.value = today();

  // Load saved API key
  const savedKey = localStorage.getItem('usda_api_key');
  if (savedKey) {
    const inp = $('api-key-input');
    if (inp) {
      inp.value = savedKey;
      const status = $('api-key-status');
      if (status) { status.textContent = 'Key saved'; status.style.color = 'var(--accent)'; }
    }
  }

  // Boot all renderers
  refreshDashboard();
  renderLog();
  renderWeightLog();
  renderSleepLog();
  renderMealPlanner();
  renderCompare();
});
