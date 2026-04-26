// ══════════════════════════════════════════════════════════
// TRACKERS.JS — Daily Log, Weight Tracker, Sleep Tracker
// ══════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────
// DAILY LOG
// ────────────────────────────────────────────────────────

// Wire up USDA search for the log page
window.addEventListener('DOMContentLoaded', () => {
  setupSearch('food-search', 'search-drop', food => {
    $('log-name').value    = food.name;
    $('log-serving').value = food.serving;
    $('log-cal').value     = food.calories;
    $('log-p').value       = food.protein;
    $('log-c').value       = food.carbs;
    $('log-f').value       = food.fat;
    toast('Food loaded — adjust serving size if needed');
  });
});

function addToLog() {
  const name = $('log-name').value.trim();
  if (!name) { toast('Enter a food name'); return; }

  const entry = {
    id:       Date.now(),
    date:     today(),
    name,
    serving:  +$('log-serving').value  || 100,
    calories: +$('log-cal').value      || 0,
    protein:  +$('log-p').value        || 0,
    carbs:    +$('log-c').value        || 0,
    fat:      +$('log-f').value        || 0,
  };

  const logs = LS.get('log', []);
  logs.push(entry);
  LS.set('log', logs);

  // Clear inputs
  ['log-name','log-serving','log-cal','log-p','log-c','log-f']
    .forEach(id => $(id).value = '');

  renderLog();
  toast('Added to log');
}

function deleteLog(id) {
  LS.set('log', LS.get('log', []).filter(e => e.id !== id));
  renderLog();
  toast('Entry removed');
}

function renderLog() {
  const todayLogs = LS.get('log', []).filter(e => e.date === today());
  const list      = $('log-list');
  if (!list) return;

  if (!todayLogs.length) {
    list.innerHTML = '<div class="empty"><div class="empty-big">EMPTY</div>Nothing logged today</div>';
    $('log-totals')?.classList.remove('show');
    return;
  }

  $('log-totals')?.classList.add('show');
  list.innerHTML = `
    <div class="card" style="padding: 0 20px;">
      ${todayLogs.map(e => `
        <div class="log-item">
          <div>
            <div class="li-name">${e.name}
              <span style="font-size:11px;color:var(--t3);font-weight:400;">${e.serving}g</span>
            </div>
            <div class="li-meta">
              <span class="c-accent">${e.calories} kcal</span> &middot;
              <span class="c-protein">${e.protein}g P</span> &middot;
              <span class="c-carbs">${e.carbs}g C</span> &middot;
              <span class="c-fat">${e.fat}g F</span>
            </div>
          </div>
          <button class="xbtn" onclick="deleteLog(${e.id})">×</button>
        </div>`).join('')}
    </div>`;

  const totals = todayLogs.reduce(
    (a, e) => ({ cal: a.cal + e.calories, p: a.p + e.protein, c: a.c + e.carbs, f: a.f + e.fat }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );
  $('t-cal').textContent = totals.cal;
  $('t-p').textContent   = totals.p + 'g';
  $('t-c').textContent   = totals.c + 'g';
  $('t-f').textContent   = totals.f + 'g';
}

// ────────────────────────────────────────────────────────
// WEIGHT TRACKER
// ────────────────────────────────────────────────────────

function logWeight() {
  const val  = +$('wt-val').value;
  const unit = $('wt-unit').value;
  const date = $('wt-date').value;
  const note = $('wt-note').value.trim();

  if (!val || !date) { toast('Enter weight and date'); return; }

  const entry = { id: Date.now(), date, val, unit, note };
  const logs  = LS.get('weight', []);
  // Replace if same date exists
  const idx   = logs.findIndex(e => e.date === date);
  if (idx > -1) logs[idx] = entry; else logs.push(entry);
  logs.sort((a, b) => a.date.localeCompare(b.date));
  LS.set('weight', logs);

  $('wt-val').value  = '';
  $('wt-note').value = '';
  renderWeightLog();
  toast('Weight logged');
}

function deleteWeight(id) {
  LS.set('weight', LS.get('weight', []).filter(e => e.id !== id));
  renderWeightLog();
}

function renderWeightLog() {
  const logs = LS.get('weight', []);
  const list = $('weight-log-list');
  if (!list) return;

  // Stats
  const wrap = $('weight-chart-wrap');
  if (logs.length >= 2) {
    wrap?.style && (wrap.style.display = 'block');
    const last7  = logs.slice(-7);
    const avg    = last7.reduce((a, e) => a + e.val, 0) / last7.length;
    const latest = logs[logs.length - 1];
    const first  = logs[0];
    const change = latest.val - first.val;

    $('wt-current').textContent = `${latest.val} ${latest.unit}`;
    $('wt-avg').textContent     = `${avg.toFixed(1)} ${latest.unit}`;
    $('wt-change').textContent  = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
    $('wt-change').className    = 'stat-val ' + (change <= 0 ? 'c-green' : 'c-red');

    drawWeightChart(logs.slice(-14));
  } else {
    wrap && (wrap.style.display = 'none');
  }

  if (!logs.length) {
    list.innerHTML = '<div class="empty"><div class="empty-big">EMPTY</div>No weight entries yet</div>';
    return;
  }

  // Show most recent first
  list.innerHTML = [...logs].reverse().map(e => `
    <div class="card-flat" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:500;font-size:15px;">${e.val} ${e.unit}</div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px;">${fmtDate(e.date)}${e.note ? ' &middot; ' + e.note : ''}</div>
      </div>
      <button class="xbtn" onclick="deleteWeight(${e.id})">×</button>
    </div>`).join('');
}

function drawWeightChart(logs) {
  const canvas = $('weight-chart');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.offsetWidth || 700;
  const H    = 140;
  canvas.width  = W;
  canvas.height = H;

  const vals   = logs.map(e => e.val);
  const minVal = Math.min(...vals) - 1;
  const maxVal = Math.max(...vals) + 1;
  const pad    = { l: 40, r: 16, t: 10, b: 28 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const xPos = i => pad.l + (i / (logs.length - 1)) * chartW;
  const yPos = v => pad.t + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#242424';
  ctx.lineWidth   = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const y = pad.t + t * chartH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    const label = (maxVal - t * (maxVal - minVal)).toFixed(1);
    ctx.fillStyle = '#444'; ctx.font = '10px DM Mono'; ctx.textAlign = 'right';
    ctx.fillText(label, pad.l - 6, y + 4);
  });

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
  grad.addColorStop(0,   'rgba(200,255,0,.18)');
  grad.addColorStop(1,   'rgba(200,255,0,0)');
  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(vals[0]));
  logs.forEach((e, i) => ctx.lineTo(xPos(i), yPos(e.val)));
  ctx.lineTo(xPos(logs.length - 1), H - pad.b);
  ctx.lineTo(xPos(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(vals[0]));
  logs.forEach((e, i) => ctx.lineTo(xPos(i), yPos(e.val)));
  ctx.strokeStyle = '#c8ff00'; ctx.lineWidth = 2;
  ctx.stroke();

  // Dots
  logs.forEach((e, i) => {
    ctx.beginPath();
    ctx.arc(xPos(i), yPos(e.val), 3, 0, Math.PI * 2);
    ctx.fillStyle = '#c8ff00'; ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#444'; ctx.font = '9px DM Sans'; ctx.textAlign = 'center';
  logs.forEach((e, i) => {
    if (i === 0 || i === logs.length - 1 || i % 3 === 0) {
      const short = e.date.slice(5); // MM-DD
      ctx.fillText(short, xPos(i), H - 6);
    }
  });
}

// ────────────────────────────────────────────────────────
// SLEEP TRACKER
// ────────────────────────────────────────────────────────

const QUALITY_LABELS = { 5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Poor', 1: 'Terrible' };
const QUALITY_COLORS = { 5: 'var(--accent)', 4: 'var(--green)', 3: 'var(--blue)', 2: 'var(--fat)', 1: 'var(--red)' };

function logSleep() {
  const date    = $('sl-date').value;
  const hours   = +$('sl-hours').value;
  const quality = +$('sl-quality').value;
  const note    = $('sl-note').value.trim();

  if (!date || !hours) { toast('Enter date and hours'); return; }
  if (hours < 0 || hours > 24) { toast('Hours must be between 0–24'); return; }

  const logs = LS.get('sleep', []);
  const idx  = logs.findIndex(e => e.date === date);
  const entry = { id: Date.now(), date, hours, quality, note };
  if (idx > -1) logs[idx] = entry; else logs.push(entry);
  logs.sort((a, b) => a.date.localeCompare(b.date));
  LS.set('sleep', logs);

  $('sl-hours').value  = '';
  $('sl-note').value   = '';
  renderSleepLog();
  toast('Sleep logged');
}

function deleteSleep(id) {
  LS.set('sleep', LS.get('sleep', []).filter(e => e.id !== id));
  renderSleepLog();
}

function renderSleepLog() {
  const logs = LS.get('sleep', []);
  const list = $('sleep-log-list');
  if (!list) return;

  const wrap = $('sleep-chart-wrap');

  if (logs.length) {
    wrap && (wrap.style.display = 'block');
    const recent  = logs.slice(-7);
    const avg     = recent.reduce((a, e) => a + e.hours, 0) / recent.length;
    const best    = Math.max(...logs.map(e => e.hours));
    const worst   = Math.min(...logs.map(e => e.hours));
    $('sl-avg').textContent   = avg.toFixed(1) + 'h';
    $('sl-best').textContent  = best + 'h';
    $('sl-worst').textContent = worst + 'h';
    drawSleepBars(recent);
  } else {
    wrap && (wrap.style.display = 'none');
  }

  if (!logs.length) {
    list.innerHTML = '<div class="empty"><div class="empty-big">EMPTY</div>No sleep entries yet</div>';
    return;
  }

  list.innerHTML = [...logs].reverse().map(e => `
    <div class="card-flat" style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:500;font-size:15px;">${e.hours}h
          <span class="tag" style="background:${QUALITY_COLORS[e.quality]}22;color:${QUALITY_COLORS[e.quality]};margin-left:6px;">${QUALITY_LABELS[e.quality]}</span>
        </div>
        <div style="font-size:11px;color:var(--t2);margin-top:2px;">${fmtDate(e.date)}${e.note ? ' &middot; ' + e.note : ''}</div>
      </div>
      <button class="xbtn" onclick="deleteSleep(${e.id})">×</button>
    </div>`).join('');
}

function drawSleepBars(logs) {
  const container = $('sleep-bars');
  if (!container) return;
  const maxH = Math.max(...logs.map(e => e.hours), 8);

  container.innerHTML = logs.map(e => {
    const pct  = (e.hours / maxH) * 100;
    const day  = new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const col  = QUALITY_COLORS[e.quality] || 'var(--blue)';
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
        <div class="sleep-bar" style="width:100%;height:${pct}%;background:${col}22;border:1px solid ${col}44;" title="${e.hours}h — ${QUALITY_LABELS[e.quality]}"></div>
        <div class="sleep-bar-day">${day}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--t2);text-align:center;">${e.hours}h</div>
      </div>`;
  }).join('');
}
