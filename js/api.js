// ══════════════════════════════════════════════════════════
// API.JS — Food search via serverless proxy
// ══════════════════════════════════════════════════════════

// ── Search via our Vercel serverless function ─────────────
async function searchUSDA(query) {
  const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search error ${res.status}`);
  const data = await res.json();
  return data.foods || [];
}

// ── Render a single food result row ──────────────────────
function renderFoodResult(food) {
  return `
    <div class="sri-name">${food.name}</div>
    ${food.brand ? `<div class="sri-brand">${food.brand}</div>` : ''}
    <div class="sri-macros">
      <span class="c-accent">${food.calories} kcal</span> &middot;
      <span class="c-protein">${food.protein}g P</span> &middot;
      <span class="c-carbs">${food.carbs}g C</span> &middot;
      <span class="c-fat">${food.fat}g F</span>
      &middot; per ${food.serving}${food.unit}
    </div>`;
}

// ── Debounce timers per input ─────────────────────────────
const _searchTimers = {};

// ── Setup a search input + dropdown ──────────────────────
function setupSearch(inputId, dropId, onSelect) {
  const inp  = $(inputId);
  const drop = $(dropId);
  if (!inp || !drop) return;

  inp.addEventListener('input', () => {
    clearTimeout(_searchTimers[inputId]);
    const q = inp.value.trim();
    if (q.length < 2) { drop.classList.remove('open'); return; }

    drop.innerHTML = '<div class="sri-loading">Searching...</div>';
    drop.classList.add('open');

    _searchTimers[inputId] = setTimeout(async () => {
      try {
        const foods = await searchUSDA(q);
        if (!foods.length) {
          drop.innerHTML = '<div class="sri-loading">No results found</div>';
          return;
        }
        drop.innerHTML = foods.map((f, i) =>
          `<div class="sri" data-i="${i}">${renderFoodResult(f)}</div>`
        ).join('');

        drop.querySelectorAll('.sri').forEach(el => {
          el.addEventListener('click', () => {
            onSelect(foods[+el.dataset.i]);
            inp.value = '';
            drop.classList.remove('open');
          });
        });
      } catch {
        drop.innerHTML = '<div class="sri-loading" style="color:var(--red)">Search failed — try again</div>';
      }
    }, 420);
  });

  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !drop.contains(e.target)) {
      drop.classList.remove('open');
    }
  });
}