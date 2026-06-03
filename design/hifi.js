/* ============================================================
   Calorie Snap HI-FI — engine
   nav + transitions · count-ups · ring fill · theme + tweaks
   ============================================================ */

/* ---------- Scale device to viewport ---------------------- */
function fitDevice() {
  const dev = document.getElementById('device');
  if (!dev) return;
  const m = 44;
  const s = Math.min(1, (innerWidth - m) / 392, (innerHeight - m) / 848);
  dev.style.transform = `scale(${s})`;
}
addEventListener('resize', fitDevice);

/* ---------- Theme ----------------------------------------- */
function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  document.body.classList.toggle('app-dark', mode === 'dark');
  try { localStorage.setItem('cs_theme', mode); } catch (e) {}
  document.querySelectorAll('[data-theme-label]').forEach(el => {
    el.textContent = mode === 'dark' ? 'Dark' : 'Light';
  });
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ---------- Animations ------------------------------------ */
/* Robust to background throttling: final values are set immediately;
   the count-up / ring-fill only "rewinds and plays" when visible. */
function fmtNum(v, dec) { return dec > 0 ? v.toFixed(dec) : Math.round(v).toLocaleString(); }
function canAnimate() {
  return document.visibilityState === 'visible'
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function setCountFinal(el) {
  el.textContent = fmtNum(parseFloat(el.dataset.count), parseInt(el.dataset.dec || '0', 10));
}
function animateCount(el) {
  const to = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const dur = parseInt(el.dataset.dur || '950', 10);
  setCountFinal(el);                 // safe default if rAF never runs
  let t0 = null;
  function frame(t) {
    if (t0 === null) { t0 = t; }
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(to * e, dec);
    if (p < 1) requestAnimationFrame(frame); else setCountFinal(el);
  }
  requestAnimationFrame(() => { el.textContent = fmtNum(0, dec); requestAnimationFrame(frame); });
}
function setRingFinal(el) {
  const r = parseFloat(el.getAttribute('r'));
  const c = 2 * Math.PI * r;
  el.style.transition = 'none';
  el.style.strokeDasharray = c;
  el.style.strokeDashoffset = c * (1 - parseFloat(el.dataset.ring));
}
function animateRing(el) {
  const r = parseFloat(el.getAttribute('r'));
  const c = 2 * Math.PI * r;
  setRingFinal(el);                  // safe default if rAF never runs
  requestAnimationFrame(() => {
    el.style.transition = 'none';
    el.style.strokeDashoffset = c;   // rewind to empty
    requestAnimationFrame(() => { el.style.transition = ''; el.style.strokeDashoffset = c * (1 - parseFloat(el.dataset.ring)); });
  });
}
function runEnter(target) {
  const play = canAnimate();
  target.querySelectorAll('[data-count]').forEach(el => play ? animateCount(el) : setCountFinal(el));
  target.querySelectorAll('[data-ring]').forEach(el => play ? animateRing(el) : setRingFinal(el));
  target.querySelectorAll('[data-w]').forEach(el => {
    el.style.width = el.dataset.w + '%';   // safe default
    if (!play) return;
    requestAnimationFrame(() => { el.style.width = '0%'; requestAnimationFrame(() => { el.style.width = el.dataset.w + '%'; }); });
  });
}

/* ---------- Navigation ------------------------------------ */
const TAB_OF = { home: 'home', diary: 'diary', progress: 'progress', profile: 'profile' };
const MAIN_TABS = ['home', 'diary', 'progress', 'profile'];
let navStack = [];

function goTo(id, opts = {}) {
  let target = null;
  document.querySelectorAll('.screen').forEach(s => {
    const on = s.dataset.screen === id;
    s.classList.toggle('is-active', on);
    if (on) target = s;
  });
  if (!target) return;
  const dir = opts.dir || 'fwd';
  target.classList.remove('enter-fwd', 'enter-back');
  if (canAnimate()) {
    void target.offsetWidth;
    target.classList.add(dir === 'back' ? 'enter-back' : 'enter-fwd');
  }

  const body = target.querySelector('.body');
  if (body) body.scrollTop = 0;
  document.querySelectorAll('.navbar .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === TAB_OF[id]));

  if (!opts.noHistory && navStack[navStack.length - 1] !== id) navStack.push(id);
  try { localStorage.setItem('cs_screen', id); } catch (e) {}
  highlightMenu(id);
  runEnter(target);
}
function goBack() {
  if (navStack.length > 1) { navStack.pop(); goTo(navStack[navStack.length - 1], { noHistory: true, dir: 'back' }); }
  else goTo('home', { noHistory: true, dir: 'back' });
}

/* ---------- Toast ----------------------------------------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.querySelector('span').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- Camera subflow (kept out of back-stack) ------- */
let returnScreen = 'home';
function openCamera() {
  const cur = document.querySelector('.screen.is-active');
  const id = cur ? cur.dataset.screen : 'home';
  returnScreen = MAIN_TABS.includes(id) ? id : 'home';
  goTo('camera', { noHistory: true });
}
function closeCamera() { goTo(returnScreen, { noHistory: true, dir: 'back' }); }
function snap() {
  const f = document.getElementById('flash');
  if (f) { f.classList.add('go'); setTimeout(() => f.classList.remove('go'), 320); }
  setTimeout(() => {
    goTo('analyzing', { noHistory: true });
    setTimeout(() => goTo('results', { noHistory: true }), 1900);
  }, 180);
}
function saveMeal() {
  goTo('home', { noHistory: true, dir: 'back' });
  navStack = ['home'];
  setTimeout(() => toast('Meal saved to today'), 280);
}

/* ---------- Selectors ------------------------------------- */
function pickOne(group, el) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(o => o.classList.remove('on'));
  el.classList.add('on');
}
function segPick(btn) {
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function setViz(n, btn) {
  document.querySelectorAll('[data-viz]').forEach(v => { v.style.display = (v.dataset.viz === String(n)) ? '' : 'none'; });
  if (btn) segPick(btn);
  const active = document.querySelector(`[data-viz="${n}"]`);
  if (active) runEnter(active);
  try { localStorage.setItem('cs_viz', n); } catch (e) {}
}

/* ---------- Diary ----------------------------------------- */
const DAY_DATA = {
  d3:    { label: 'Sat, May 30', cals: 1760, meals: ['Green smoothie|Breakfast · 290','Sushi set|Lunch · 640','Veg stir-fry|Dinner · 830'] },
  d2:    { label: 'Sun, May 31', cals: 2110, meals: ['Pancakes|Breakfast · 560','Burger & fries|Lunch · 780','Garden salad|Dinner · 420','Ice cream|Snack · 350'] },
  d1:    { label: 'Yesterday · Jun 1', cals: 1980, meals: ['Oatmeal & banana|Breakfast · 410','Turkey sandwich|Lunch · 620','Pasta primavera|Dinner · 720','Dark chocolate|Snack · 230'] },
  today: { label: 'Today · Jun 2', cals: 1240, meals: ['Greek yogurt & berries|Breakfast · 320','Chicken & quinoa bowl|Lunch · 540','Oat-milk latte|Snack · 180','Apple|Snack · 95'] },
  plan3: { label: 'Wed, Jun 3', plan: true, planned: ['Overnight oats|Breakfast · 380 planned'] },
  plan4: { label: 'Thu, Jun 4', plan: true, planned: [] },
};
function mealRow(nm, mt, plan) {
  const kc = (mt.split('· ')[1] || '');
  return `<div class="meal"><div class="thumb foodthumb"><svg viewBox="0 0 24 24"><path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M19 3c-2 0-3 2-3 5s1 4 3 4v9"/></svg></div>
    <div><div class="nm">${nm}</div><div class="mt">${mt.split(' · ')[0]}${plan ? ' · planned' : ''}</div></div>
    <div class="kc"><div class="v">${kc.replace(' planned','')}</div><div class="u">kcal</div></div></div>`;
}
function pickDay(key, el) {
  document.querySelectorAll('#daychips .daychip').forEach(c => c.classList.remove('on'));
  if (el) el.classList.add('on');
  const d = DAY_DATA[key] || DAY_DATA.today;
  document.getElementById('diaryDayLabel').textContent = d.label;
  const list = document.getElementById('diaryMeals');
  const calsEl = document.getElementById('diaryDayCals');
  const subEl = document.getElementById('diaryDaySub');
  if (d.plan) {
    calsEl.textContent = '—'; calsEl.removeAttribute('data-count');
    subEl.textContent = (d.planned && d.planned.length) ? d.planned.length + ' meal planned' : 'Nothing planned yet';
    let html = (d.planned || []).map(m => { const [nm, mt] = m.split('|'); return mealRow(nm, mt, true); }).join('');
    html += `<div style="text-align:center; padding:18px 6px 8px;">
        <div class="lead" style="margin:0 0 14px;">Plan ${d.label.split(',')[0]}’s meals ahead of time.</div>
        <button class="btn primary sm" style="margin:0 auto;" onclick="toast('Opens meal planner')">+ Add planned meal</button></div>`;
    list.innerHTML = html;
  } else {
    calsEl.textContent = d.cals.toLocaleString();
    subEl.textContent = d.meals.length + ' meals logged';
    list.innerHTML = d.meals.map(m => { const [nm, mt] = m.split('|'); return mealRow(nm, mt, false); }).join('');
  }
}
function diaryView(mode, btn) {
  document.getElementById('diaryDay').style.display = (mode === 'day') ? '' : 'none';
  document.getElementById('diaryWeek').style.display = (mode === 'week') ? '' : 'none';
  if (btn) segPick(btn);
}

/* ---------- Side menu ------------------------------------- */
function toggleMenu() { document.getElementById('menu').classList.toggle('open'); }
function highlightMenu(id) { document.querySelectorAll('#menu .mlist button[data-jump]').forEach(b => b.classList.toggle('active', b.dataset.jump === id)); }
function restart() { navStack = []; goTo('signin'); document.getElementById('menu').classList.remove('open'); }

/* ---------- App state + render ---------------------------- */
const S = {
  units: (localStorage.getItem('cs_units') || 'lb'),
  startLb: 182,
  goalLb: 165,
  currentLb: 174.3,
  eaten: 1240,
  dailyTarget: 2100,
  entries: [
    { label: 'Jun 2',  lb: 174.3, d: -0.4 },
    { label: 'May 30', lb: 174.7, d: -0.6 },
    { label: 'May 26', lb: 175.3, d: -0.9 },
  ],
};
const LB_TO_KG = 0.45359237;
function toKg(lb) { return lb * LB_TO_KG; }
function wt(lb) {                       // formatted value in current units
  if (S.units === 'kg') return (Math.round(toKg(lb) * 10) / 10).toFixed(1);
  return Number.isInteger(lb) ? String(lb) : (Math.round(lb * 10) / 10).toFixed(1);
}
function setRole(role, value) {
  document.querySelectorAll(`[data-role="${role}"]`).forEach(el => { el.textContent = value; });
}
function setRoleNum(role, lb) { setRole(role, wt(lb)); }

function render() {
  const lost = S.startLb - S.currentLb;
  const total = S.startLb - S.goalLb;
  const pct = total > 0 ? Math.max(0, Math.min(1, lost / total)) : 0;
  const togo = Math.max(0, S.currentLb - S.goalLb);
  const left = Math.max(0, S.dailyTarget - S.eaten);

  // static authored weights (e.g. slider min/max)
  document.querySelectorAll('[data-wt]').forEach(el => { el.textContent = wt(parseFloat(el.dataset.wt)); });
  // unit labels
  document.querySelectorAll('[data-wtu]').forEach(el => { el.textContent = S.units; });

  setRoleNum('start', S.startLb);
  setRoleNum('goal', S.goalLb);
  setRoleNum('current', S.currentLb);
  setRoleNum('lost', Math.abs(lost));
  setRoleNum('total', Math.abs(total));
  setRoleNum('togo', togo);
  setRole('weeks', Math.max(1, Math.round(Math.abs(total))));
  setRole('weeksleft', Math.max(1, Math.round(togo)));
  setRole('pct', Math.round(pct * 100));
  setRole('cu', wt(S.currentLb) + ' ' + S.units);

  // calorie target / ring
  setRole('target', S.dailyTarget.toLocaleString());
  document.querySelectorAll('[data-role="left"]').forEach(el => { el.dataset.count = left; el.textContent = left.toLocaleString(); });
  setRole('eaten', S.eaten.toLocaleString());
  const ringEl = document.querySelector('[data-role="ring-prog"]');
  if (ringEl) { ringEl.dataset.ring = (S.eaten / S.dailyTarget).toFixed(3); if (!isActive('home')) setRingFinal(ringEl); }

  // goal-bar fill
  document.querySelectorAll('[data-role="goalfill"]').forEach(el => { el.dataset.w = Math.round(pct * 100); if (!isActive('progress')) el.style.width = (pct * 100) + '%'; });
  const pctBig = document.getElementById('pctBig'); if (pctBig) pctBig.dataset.count = Math.round(pct * 100);

  // units label (Profile) + onboarding seg
  setRole('unitsLabel', S.units === 'kg' ? 'Metric (kg)' : 'Imperial (lb)');
  document.querySelectorAll('[data-unitseg] button').forEach(b => b.classList.toggle('on', b.textContent.trim() === S.units));

  // sync goal slider
  const gr = document.getElementById('goalRange');
  if (gr) { gr.value = S.goalLb; gr.style.setProperty('--fill', ((S.goalLb - 120) / (240 - 120) * 100) + '%'); }

  renderEntries();
}
function isActive(id) { const s = document.querySelector('.screen.is-active'); return s && s.dataset.screen === id; }

function renderEntries() {
  const box = document.getElementById('recentEntries');
  if (!box) return;
  box.innerHTML = S.entries.slice(0, 4).map(e => {
    const dlb = Math.abs(e.d);
    const dv = S.units === 'kg' ? (Math.round(toKg(dlb) * 10) / 10).toFixed(1) : (Math.round(dlb * 10) / 10).toFixed(1);
    const arrow = e.d <= 0 ? '▼' : '▲';
    return `<div class="editrow"><span class="k">${e.label}</span><span class="v">${wt(e.lb)} ${S.units}</span><span class="delta" style="margin-left:10px;">${arrow}${dv}</span></div>`;
  }).join('');
}

/* ---------- Units ----------------------------------------- */
function setUnits(u) {
  S.units = (u === 'kg') ? 'kg' : 'lb';
  try { localStorage.setItem('cs_units', S.units); } catch (e) {}
  render();
}

/* ---------- Goal-weight slider ---------------------------- */
function onGoalSlider(v) {
  S.goalLb = parseInt(v, 10);
  const gr = document.getElementById('goalRange');
  if (gr) gr.style.setProperty('--fill', ((S.goalLb - 120) / (240 - 120) * 100) + '%');
  render();
}

/* ---------- Start weight stepper (ob-stats) --------------- */
function bumpStartWeight(d) {
  S.startLb = Math.max(80, Math.min(400, S.startLb + d));
  render();
}

/* ---------- Daily calorie target -------------------------- */
function bumpTarget(d) {
  S.dailyTarget = Math.max(1000, Math.min(4000, S.dailyTarget + d));
  render();
  if (isActive('home')) { const r = document.querySelector('[data-role="ring-prog"]'); if (r) animateRing(r); }
}
function setTargetMode(mode, btn) {
  if (btn) segPick(btn);
  if (mode === 'auto') { S.dailyTarget = 2100; render(); }
}

/* ---------- Log-weight keypad ----------------------------- */
let wInput = '';
function logKey(k) {
  if (k === 'back') wInput = wInput.slice(0, -1);
  else if (k === '.') { if (!wInput.includes('.')) wInput += (wInput === '' ? '0.' : '.'); }
  else { if (wInput.replace('.', '').length < 4) wInput += k; }
  updateLogDisplay();
}
function updateLogDisplay() {
  const el = document.getElementById('logVal');
  if (el) el.textContent = (wInput === '') ? wt(S.currentLb) : wInput;
}
function saveWeight() {
  const raw = (wInput === '') ? parseFloat(wt(S.currentLb)) : parseFloat(wInput);
  if (!raw || isNaN(raw)) { goBack(); return; }
  const newLb = (S.units === 'kg') ? raw / LB_TO_KG : raw;
  const prev = S.currentLb;
  S.currentLb = Math.round(newLb * 10) / 10;
  const d = Math.round((S.currentLb - prev) * 10) / 10;
  S.entries.unshift({ label: 'Today', lb: S.currentLb, d });
  const ld = document.getElementById('logDelta');
  if (ld) { const a = d <= 0 ? '▼' : '▲'; const dv = S.units === 'kg' ? (Math.round(toKg(Math.abs(d)) * 100) / 100) : Math.abs(d); ld.textContent = `${a} ${dv} ${S.units} from last entry`; }
  wInput = '';
  render();
  goTo('progress', { noHistory: true, dir: 'back' });
  setTimeout(() => toast('Weight logged · ' + wt(S.currentLb) + ' ' + S.units), 280);
}

/* ---------- Tweaks bridge --------------------------------- */
window.applyTweaks = function (t) {
  if (t.accent) document.documentElement.setAttribute('data-accent', t.accent);
  if (t.units) setUnits(t.units);
};

/* Replay the active screen's entrance once the page becomes visible
   (covers loading while backgrounded, then switching to the tab). */
let _shownWhileHidden = (document.visibilityState !== 'visible');
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _shownWhileHidden) {
    _shownWhileHidden = false;
    const active = document.querySelector('.screen.is-active');
    if (active) runEnter(active);
  }
});

/* ---------- Boot ------------------------------------------ */
addEventListener('DOMContentLoaded', () => {
  fitDevice();
  applyTheme(localStorage.getItem('cs_theme') || 'light');
  render();
  pickDay('today', document.querySelector('#daychips .daychip.on'));
  setViz(localStorage.getItem('cs_viz') || 1);
  navStack = ['signin'];
  goTo('signin', { noHistory: true });
  navStack = ['signin'];
});
