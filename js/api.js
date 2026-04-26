// ══════════════════════════════════════════════════════════
// API.JS — USDA FoodData Central search
// ══════════════════════════════════════════════════════════

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// ── Get stored API key (falls back to DEMO_KEY) ──────────
function getApiKey() {
  return localStorage.getItem('usda_api_key') || 'DEMO_KEY';
}


// ── Parse nutrients from USDA food object ────────────────
function parseNutrient(food, ...ids) {
  for (const id of ids) {
    const n = (food.foodNutrients || []).find(
      x => x.nutrientId === id || x.nutrientNumber === String(id)
    );
    if (n && n.value != null) return Math.round(n.value * 10) / 10;
  }
  return 0;
}

// ── Normalize a USDA food object into our format ─────────
function normalizeFood(f) {
  return {
    name:     f.description,
    brand:    f.brandOwner || f.brandName || '',
    serving:  f.servingSize || 100,
    unit:     f.servingSizeUnit || 'g',
    calories: parseNutrient(f, 1008, 208),
    protein:  parseNutrient(f, 1003, 203),
    carbs:    parseNutrient(f, 1005, 205),
    fat:      parseNutrient(f, 1004, 204),
    fiber:    parseNutrient(f, 1079, 291),
  };
}

// ── Search the USDA API ──────────────────────────────────
async function searchUSDA(query) {
  const key = getApiKey();
  const url = `${USDA_BASE}?query=${encodeURIComponent(query)}&dataType=Branded,Survey%20(FNDDS),Foundation&pageSize=8&api_key=${key}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`USDA API error ${res.status}`);
  const data = await res.json();
  return (data.foods || []).map(normalizeFood);
}

// ── Render a food result item ────────────────────────────
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

// ── Debounce timers per input ────────────────────────────
const _searchTimers = {};

// ── Setup a search input + dropdown ─────────────────────
// onSelect(food) is called with the normalized food object
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
        drop.innerHTML = '<div class="sri-loading" style="color:var(--red)">Search failed — check API key or network</div>';
      }
    }, 420);
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !drop.contains(e.target)) {
      drop.classList.remove('open');
    }
  });
}
