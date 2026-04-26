// ══════════════════════════════════════════════════════════
// PLANNER.JS — Meal Planner + Compare Foods
// ══════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────
// MEAL PLANNER
// ────────────────────────────────────────────────────────

const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS   = ['Breakfast','Lunch','Dinner','Snacks'];

let activePlannerDay = 'Monday';

window.addEventListener('DOMContentLoaded', () => {
  // Build day selector buttons
  const selector = $('day-selector');
  if (selector) {
    DAYS.forEach(day => {
      const btn = document.createElement('button');
      btn.className   = 'tbtn' + (day === activePlannerDay ? ' active' : '');
      btn.textContent = day.slice(0, 3);
      btn.title       = day;
      btn.onclick     = () => {
        document.querySelectorAll('#day-selector .tbtn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePlannerDay = day;
        renderMealPlanner();
      };
      selector.appendChild(btn);
    });
  }

  // Wire USDA search for meal planner
  setupSearch('mp-search', 'mp-search-drop', food => {
    $('mp-food-name').value    = food.name;
    $('mp-food-serving').value = food.serving;
    $('mp-food-cal').value     = food.calories;
    $('mp-food-p').value       = food.protein;
    $('mp-food-c').value       = food.carbs;
    $('mp-food-f').value       = food.fat;
    toast('Food loaded — adjust serving if needed');
  });

  // Wire USDA search for compare
  setupSearch('cmp-search', 'cmp-search-drop', food => {
    $('cmp-name').value    = food.name;
    $('cmp-serving').value = food.serving;
    $('cmp-cal').value     = food.calories;
    $('cmp-p').value       = food.protein;
    $('cmp-c').value       = food.carbs;
    $('cmp-f').value       = food.fat;
    toast('Food loaded — click Add to comparison');
  });
});

function getMealKey(day, meal) {
  return `meal_${day}_${meal}`.replace(/\s/g, '_');
}

function addMealFood() {
  const meal = $('mp-meal-select').value;
  const name = $('mp-food-name').value.trim();
  if (!name) { toast('Enter a food name'); return; }

  const entry = {
    id:       Date.now(),
    name,
    serving:  +$('mp-food-serving').value  || 100,
    calories: +$('mp-food-cal').value      || 0,
    protein:  +$('mp-food-p').value        || 0,
    carbs:    +$('mp-food-c').value        || 0,
    fat:      +$('mp-food-f').value        || 0,
  };

  const key   = getMealKey(activePlannerDay, meal);
  const foods = LS.get(key, []);
  foods.push(entry);
  LS.set(key, foods);

  ['mp-food-name','mp-food-serving','mp-food-cal','mp-food-p','mp-food-c','mp-food-f']
    .forEach(id => $(id).value = '');

  renderMealPlanner();
  toast(`Added to ${meal}`);
}

function deleteMealFood(day, meal, id) {
  const key = getMealKey(day, meal);
  LS.set(key, LS.get(key, []).filter(e => e.id !== id));
  renderMealPlanner();
}

function renderMealPlanner() {
  const content = $('meal-day-content');
  if (!content) return;

  let dayTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let html = '';

  MEALS.forEach(meal => {
    const key   = getMealKey(activePlannerDay, meal);
    const foods = LS.get(key, []);
    const mTotal = foods.reduce(
      (a, e) => ({ calories: a.calories + e.calories, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, fat: a.fat + e.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    Object.keys(dayTotal).forEach(k => dayTotal[k] += mTotal[k]);

    html += `
      <div class="meal-slot">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div class="meal-slot-title">${meal}</div>
          ${foods.length ? `<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2);">${mTotal.calories} kcal</span>` : ''}
        </div>
        ${foods.length ? foods.map(e => `
          <div class="meal-food-row">
            <div>
              <div style="font-weight:500;font-size:13px;">${e.name} <span style="font-size:11px;color:var(--t3);font-weight:400">${e.serving}g</span></div>
              <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--t2);">
                <span class="c-accent">${e.calories} kcal</span> &middot;
                <span class="c-protein">${e.protein}g P</span> &middot;
                <span class="c-carbs">${e.carbs}g C</span> &middot;
                <span class="c-fat">${e.fat}g F</span>
              </div>
            </div>
            <button class="xbtn" onclick="deleteMealFood('${activePlannerDay}','${meal}',${e.id})">×</button>
          </div>`).join('') : `<div style="font-size:12px;color:var(--t3);padding:4px 0;">Nothing planned</div>`}
      </div>`;
  });

  // Day summary card
  html += `
    <div class="card" style="margin-top:4px;">
      <div class="sec-label" style="margin-bottom:12px;">${activePlannerDay} — Total</div>
      <div class="g4">
        <div class="stat"><div class="stat-val c-accent">${dayTotal.calories}</div><div class="stat-label">kcal</div></div>
        <div class="stat"><div class="stat-val c-protein">${dayTotal.protein}g</div><div class="stat-label">Protein</div></div>
        <div class="stat"><div class="stat-val c-carbs">${dayTotal.carbs}g</div><div class="stat-label">Carbs</div></div>
        <div class="stat"><div class="stat-val c-fat">${dayTotal.fat}g</div><div class="stat-label">Fat</div></div>
      </div>
    </div>`;

  content.innerHTML = html;
}

// ────────────────────────────────────────────────────────
// COMPARE FOODS
// ────────────────────────────────────────────────────────

function addCompare() {
  const name = $('cmp-name').value.trim();
  if (!name) { toast('Enter a food name'); return; }

  const item = {
    id:       Date.now(),
    name,
    serving:  +$('cmp-serving').value || 100,
    calories: +$('cmp-cal').value     || 0,
    protein:  +$('cmp-p').value       || 0,
    carbs:    +$('cmp-c').value       || 0,
    fat:      +$('cmp-f').value       || 0,
  };

  const items = LS.get('compare', []);
  if (items.length >= 8) { toast('Max 8 items — remove one first'); return; }
  items.push(item);
  LS.set('compare', items);

  ['cmp-name','cmp-serving','cmp-cal','cmp-p','cmp-c','cmp-f']
    .forEach(id => $(id).value = '');

  renderCompare();
  toast('Added to comparison');
}

function removeCompare(id) {
  LS.set('compare', LS.get('compare', []).filter(e => e.id !== id));
  renderCompare();
}

function clearCompare() {
  LS.set('compare', []);
  renderCompare();
  toast('Comparison cleared');
}

function renderCompare() {
  const items  = LS.get('compare', []);
  const output = $('compare-output');
  if (!output) return;

  if (!items.length) {
    output.innerHTML = '<div class="empty"><div class="empty-big">EMPTY</div>Add 2+ items to compare</div>';
    return;
  }

  // Find max values per column for highlighting
  const maxCal  = Math.max(...items.map(i => i.calories));
  const maxP    = Math.max(...items.map(i => i.protein));
  const maxC    = Math.max(...items.map(i => i.carbs));
  const maxF    = Math.max(...items.map(i => i.fat));
  const minCal  = Math.min(...items.map(i => i.calories));
  const minP    = Math.min(...items.map(i => i.protein));

  // Protein density (protein per calorie)
  const densities = items.map(i => i.calories > 0 ? i.protein / i.calories : 0);
  const maxDensity = Math.max(...densities);

  output.innerHTML = `
    <div class="card" style="padding: 0 20px; overflow-x: auto;">
      <table class="ctable">
        <thead>
          <tr>
            <th>Food</th>
            <th>Per g</th>
            <th class="c-accent">Kcal</th>
            <th class="c-protein">Protein</th>
            <th class="c-carbs">Carbs</th>
            <th class="c-fat">Fat</th>
            <th class="c-blue">P/Cal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
            <tr>
              <td class="fname">${item.name}</td>
              <td style="color:var(--t2);">${item.serving}</td>
              <td class="${item.calories === minCal && items.length > 1 ? 'win' : ''}">${item.calories}</td>
              <td class="${item.protein  === maxP   && items.length > 1 ? 'win' : ''}">${item.protein}g</td>
              <td>${item.carbs}g</td>
              <td>${item.fat}g</td>
              <td class="${densities[idx] === maxDensity && items.length > 1 ? 'win' : ''}">${item.calories > 0 ? (item.protein / item.calories * 100).toFixed(1) + '%' : '—'}</td>
              <td><button class="xbtn" onclick="removeCompare(${item.id})">×</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
      ${items.length > 1 ? `
        <div style="font-size:10px;color:var(--t3);padding:12px 0;letter-spacing:.05em;">
          <span style="color:var(--accent);">Highlighted</span> = best value per column &middot; P/Cal = protein density
        </div>` : ''}
    </div>
    ${items.length > 1 ? `<div class="row-btn" style="margin-top:8px;"><button class="btn btn-sm btn-ghost" onclick="clearCompare()">Clear all</button></div>` : ''}`;
}
