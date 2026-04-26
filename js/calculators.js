// ══════════════════════════════════════════════════════════
// CALCULATORS.JS — Macro Calculator, Body Stats, Dashboard
// ══════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────
// MACRO CALCULATOR
// ────────────────────────────────────────────────────────

function calcMacros() {
  const age  = +$('m-age').value;
  const sex  = $('m-sex').value;
  const goal = $('m-goal').value;
  const act  = +$('m-activity').value;

  let w = +$('m-weight').value;
  let h = +$('m-height').value;

  if (!age || !w || !h) { toast('Fill in all fields'); return; }

  // Unit conversions
  if ($('m-wunit').value === 'lbs') w *= 0.453592;
  if ($('m-hunit').value === 'in')  h *= 2.54;

  // Mifflin-St Jeor BMR
  const bmr  = sex === 'male'
    ? 10 * w + 6.25 * h - 5 * age + 5
    : 10 * w + 6.25 * h - 5 * age - 161;

  const tdee = Math.round(bmr * act);

  // Calories by goal
  const calMap = { cut: Math.round(tdee * 0.8), maintain: tdee, bulk: Math.round(tdee * 1.1) };
  const cal    = calMap[goal];

  // Macro splits
  const protein = goal === 'cut'  ? Math.round(w * 2.2)
                : goal === 'bulk' ? Math.round(w * 1.8)
                :                   Math.round(w * 1.6);
  const fatPct  = goal === 'bulk' ? 0.28 : 0.25;
  const fat     = Math.round(cal * fatPct / 9);
  const carbs   = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));

  // Percentages for bars
  const total = protein * 4 + carbs * 4 + fat * 9;
  const pPct  = Math.round(protein * 4 / total * 100);
  const cPct  = Math.round(carbs   * 4 / total * 100);
  const fPct  = Math.round(fat     * 9 / total * 100);

  // Render
  $('r-cal').textContent     = cal;
  $('r-protein').textContent = protein;
  $('r-carbs').textContent   = carbs;
  $('r-fat').textContent     = fat;

  $('b-protein').textContent = pPct + '%';
  $('b-carbs').textContent   = cPct + '%';
  $('b-fat').textContent     = fPct + '%';

  setTimeout(() => {
    $('bar-protein').style.width = pPct + '%';
    $('bar-carbs').style.width   = cPct + '%';
    $('bar-fat').style.width     = fPct + '%';
  }, 50);

  const noteMap = {
    cut:      `BMR ${Math.round(bmr)} kcal &middot; TDEE ${tdee} kcal &middot; 20% deficit &middot; High protein to preserve muscle`,
    bulk:     `BMR ${Math.round(bmr)} kcal &middot; TDEE ${tdee} kcal &middot; 10% surplus &middot; Prioritize progressive overload`,
    maintain: `BMR ${Math.round(bmr)} kcal &middot; TDEE ${tdee} kcal &middot; Balanced split for body recomposition`,
  };
  $('r-note').innerHTML = noteMap[goal];
  $('macro-result').classList.add('show');
}

function saveTargets() {
  const cal     = $('r-cal').textContent;
  const protein = $('r-protein').textContent;
  const carbs   = $('r-carbs').textContent;
  const fat     = $('r-fat').textContent;

  if (!cal || cal === '—') { toast('Calculate first'); return; }

  LS.set('targets', { calories: +cal, protein: +protein, carbs: +carbs, fat: +fat });
  toast('Targets saved — Dashboard updated');
  refreshDashboard();
}

// ────────────────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────────────────

function refreshDashboard() {
  // Today's log totals
  const todayLogs = LS.get('log', []).filter(e => e.date === today());
  const totals    = todayLogs.reduce(
    (a, e) => ({ cal: a.cal + e.calories, p: a.p + e.protein, c: a.c + e.carbs, f: a.f + e.fat }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  $('d-cal').textContent = totals.cal;
  $('d-p').textContent   = totals.p + 'g';
  $('d-c').textContent   = totals.c + 'g';
  $('d-f').textContent   = totals.f + 'g';

  // Latest sleep
  const sleepLogs = LS.get('sleep', []);
  const lastSleep = sleepLogs.find(e => e.date === today()) || sleepLogs[sleepLogs.length - 1];
  $('d-sleep').textContent = lastSleep ? lastSleep.hours + 'h' : '—';

  // Latest weight
  const weightLogs = LS.get('weight', []);
  const lastWeight = weightLogs[weightLogs.length - 1];
  $('d-weight').textContent = lastWeight ? `${lastWeight.val} ${lastWeight.unit}` : '—';

  // Targets progress
  const targets = LS.get('targets', null);
  if (targets && targets.calories) {
    $('dash-progress-card').style.display = 'block';
    $('dash-no-target').style.display     = 'none';

    const setBar = (txtId, barId, current, target, unit = '') => {
      const pct = clamp(Math.round((current / target) * 100), 0, 100);
      $(txtId).textContent = `${current}${unit} / ${target}${unit}`;
      setTimeout(() => { $(barId).style.width = pct + '%'; }, 50);
      // Turn red if over target
      $(barId).style.background = pct > 100 ? 'var(--red)' : '';
    };

    setBar('dp-cal-txt', 'dp-cal-bar', totals.cal,  targets.calories, ' kcal');
    setBar('dp-p-txt',   'dp-p-bar',   totals.p,    targets.protein,  'g');
    setBar('dp-c-txt',   'dp-c-bar',   totals.c,    targets.carbs,    'g');
    setBar('dp-f-txt',   'dp-f-bar',   totals.f,    targets.fat,      'g');
  } else {
    $('dash-progress-card').style.display = 'none';
    $('dash-no-target').style.display     = 'block';
  }

  // Meals preview
  const preview = $('dash-meals-preview');
  if (!preview) return;
  if (!todayLogs.length) {
    preview.innerHTML = '<div class="empty"><div class="empty-big">EMPTY</div>Nothing logged yet — go to Daily Log</div>';
    return;
  }
  preview.style.padding = '0 20px';
  preview.innerHTML = todayLogs.map(e => `
    <div class="log-item">
      <div>
        <div class="li-name">${e.name} <span style="font-size:11px;color:var(--t3);font-weight:400">${e.serving}g</span></div>
        <div class="li-meta">
          <span class="c-accent">${e.calories} kcal</span> &middot;
          <span class="c-protein">${e.protein}g P</span> &middot;
          <span class="c-carbs">${e.carbs}g C</span> &middot;
          <span class="c-fat">${e.fat}g F</span>
        </div>
      </div>
    </div>`).join('');
}

// ────────────────────────────────────────────────────────
// BMI CALCULATOR
// ────────────────────────────────────────────────────────

function calcBMI() {
  let w = +$('bmi-w').value;
  let h = +$('bmi-h').value;
  if (!w || !h) { toast('Enter weight and height'); return; }

  if ($('bmi-wunit').value === 'lbs') w *= 0.453592;
  if ($('bmi-hunit').value === 'in')  h *= 2.54;

  const hm  = h / 100;
  const bmi = +(w / (hm * hm)).toFixed(1);

  let cat, cls, tagCls, pos;
  if      (bmi < 18.5) { cat = 'Underweight'; cls = 'c-blue';   tagCls = 'tag-blue';   pos = clamp(bmi / 18.5 * 14, 4, 14); }
  else if (bmi < 25)   { cat = 'Normal';       cls = 'c-accent'; tagCls = 'tag-green';  pos = 14 + (bmi - 18.5) / 6.5 * 28; }
  else if (bmi < 30)   { cat = 'Overweight';   cls = 'c-fat';    tagCls = 'tag-yellow'; pos = 42 + (bmi - 25)   / 5   * 22; }
  else                 { cat = 'Obese';         cls = 'c-red';    tagCls = 'tag-red';    pos = clamp(64 + (bmi - 30) / 10 * 28, 64, 92); }

  $('bmi-val').textContent = bmi;
  $('bmi-val').className   = 'result-big ' + cls;
  $('bmi-tag').innerHTML   = `<span class="tag ${tagCls}">${cat}</span>`;
  $('bmi-marker').style.left = Math.round(pos) + '%';

  const notes = {
    Underweight: 'Consider increasing caloric intake with nutrient-dense foods.',
    Normal:      'Your BMI is in the healthy range. Maintain your current habits.',
    Overweight:  'A modest caloric deficit and regular exercise can help.',
    Obese:       'Consider consulting a healthcare provider for a personalized plan.',
  };
  $('bmi-note').textContent = notes[cat] || '';
  $('bmi-result').classList.add('show');
}

// ────────────────────────────────────────────────────────
// BODY FAT CALCULATOR
// ────────────────────────────────────────────────────────

function toggleBFMethod() {
  const method = $('bf-method').value;
  $('navy-fields').style.display    = method === 'navy' ? 'block' : 'none';
  $('bmi-bf-fields').style.display  = method === 'bmi'  ? 'block' : 'none';
}

function calcBodyFat() {
  const method = $('bf-method').value;
  let bf;

  if (method === 'navy') {
    const sex   = $('bf-sex').value;
    const h     = +$('bf-h').value;
    const neck  = +$('bf-neck').value;
    const waist = +$('bf-waist').value;
    const hip   = +$('bf-hip').value;
    if (!h || !neck || !waist) { toast('Fill in all Navy fields'); return; }

    if (sex === 'male') {
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
    } else {
      if (!hip) { toast('Enter hip measurement for females'); return; }
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h)) - 450;
    }
  } else {
    const bmiVal = +$('bf-bmi-val').value;
    const age    = +$('bf-age').value;
    const sex    = $('bf-sex2').value;
    if (!bmiVal || !age) { toast('Fill in BMI and age'); return; }
    const s = sex === 'male' ? 1 : 0;
    bf = 1.20 * bmiVal + 0.23 * age - 10.8 * s - 5.4;
  }

  bf = +bf.toFixed(1);
  if (bf < 0 || bf > 70) { toast('Result out of range — check inputs'); return; }

  // Category ranges (ACE standards)
  const sex2 = ($('bf-sex').value || $('bf-sex2').value);
  const cats = sex2 === 'male'
    ? [{ max: 5, label: 'Essential fat' }, { max: 13, label: 'Athlete' }, { max: 17, label: 'Fitness' }, { max: 24, label: 'Average' }, { max: 99, label: 'Obese' }]
    : [{ max: 13, label: 'Essential fat' }, { max: 20, label: 'Athlete' }, { max: 24, label: 'Fitness' }, { max: 31, label: 'Average' }, { max: 99, label: 'Obese' }];

  const cat    = cats.find(c => bf <= c.max)?.label || 'Obese';
  const clsMap = { 'Essential fat': 'tag-blue', Athlete: 'tag-green', Fitness: 'tag-green', Average: 'tag-yellow', Obese: 'tag-red' };

  $('bf-val').textContent = bf + '%';
  $('bf-tag').innerHTML   = `<span class="tag ${clsMap[cat] || 'tag-orange'}">${cat}</span>`;
  $('bf-note').textContent = `Lean mass ~${(100 - bf).toFixed(1)}% &middot; Method: ${method === 'navy' ? 'US Navy formula' : 'Deurenberg BMI-based estimate'}`;
  $('bf-result').classList.add('show');
}

// ────────────────────────────────────────────────────────
// TDEE CALCULATOR
// ────────────────────────────────────────────────────────

function calcTDEE() {
  const sex = $('tdee-sex').value;
  const age = +$('tdee-age').value;
  const w   = +$('tdee-w').value;
  const h   = +$('tdee-h').value;
  const act = +$('tdee-act').value;
  if (!age || !w || !h) { toast('Fill in all fields'); return; }

  const bmr  = sex === 'male'
    ? 10 * w + 6.25 * h - 5 * age + 5
    : 10 * w + 6.25 * h - 5 * age - 161;
  const tdee = Math.round(bmr * act);

  $('tdee-val').textContent = tdee;

  const goals = [
    { label: 'Aggressive cut −25%', val: Math.round(tdee * 0.75), cls: 'c-red' },
    { label: 'Cut −20%',            val: Math.round(tdee * 0.80), cls: 'c-blue' },
    { label: 'Mild cut −10%',       val: Math.round(tdee * 0.90), cls: 'c-carbs' },
    { label: 'Maintain',            val: tdee,                    cls: 'c-accent' },
    { label: 'Mild bulk +10%',      val: Math.round(tdee * 1.10), cls: 'c-fat' },
    { label: 'Bulk +20%',           val: Math.round(tdee * 1.20), cls: 'c-protein' },
  ];

  $('tdee-goals').innerHTML = goals.map(g => `
    <div class="stat">
      <div class="stat-val ${g.cls}">${g.val}</div>
      <div class="stat-label">${g.label}</div>
    </div>`).join('');

  $('tdee-result').classList.add('show');
}

// ────────────────────────────────────────────────────────
// WATER CALCULATOR
// ────────────────────────────────────────────────────────

function calcWater() {
  const w       = +$('wtr-w').value;
  const act     = +$('wtr-act').value;
  const climate = +$('wtr-climate').value;
  if (!w) { toast('Enter your weight'); return; }

  const base  = Math.round(w * 35);
  const total = base + act + climate;
  const L     = (total / 1000).toFixed(1);
  const cups  = Math.round(total / 250);

  $('water-val').textContent  = total;
  $('water-note').innerHTML   = `${L}L per day &middot; roughly ${cups} glasses (250ml each)<br>
    <span style="color:var(--t3);font-size:11px;">Base ${base}ml + activity ${act}ml + climate ${climate >= 0 ? '+' : ''}${climate}ml</span>`;
  $('water-result').classList.add('show');
}
