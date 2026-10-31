// michikusa.js：きょうのみちくさ（お題を選ぶ・達成の判定・カード）
// ・1日1枚。毎朝4時に入れ替わる。距離は 近所／散歩／遠出（カードの上の札で切り替え。最後に選んだ距離を次の日も使う）
// ・お題は、その日に初めてその距離を出したときに選んで保存する（あとで材料が変わっても、その日のお題は変わらない）
// ・自動判定のお題と自己申告のお題をおおよそ 7対3。近くにできるものがないお題は出さない。位置が分からないときは自己申告だけ
// ・判定の材料：MichiMiru の散歩のまとめ（IndexedDB michimiru／kv の 'walks'）、スタンプ帳（walk_stamps）、
//   MeguMiru の行った記録（IndexedDB megu／kv の 'log'・'rec'）、MichiMiru が書くお題の材料（walk_mk_v1：近くの神社・寺・公園の数、MeguMiru のまだの場所）
// ・達成を数えるのは1日1回だけ
const DISTS = {near: {nm: '近所', r: 500}, walk: {nm: '散歩', r: 1500}, far: {nm: '遠出', r: 5000}};
const DKEYS = Object.keys(DISTS);
const ALL = ['near', 'walk', 'far'];
const TASKS = [
  // ---- 自動判定 ----
  {id: 'mesh', app: 'walk', auto: 1, d: ALL, val: (c, d) => ({near: 3, walk: 5, far: 10})[d],
    t: v => `地図のマスを、新しく ${v}マス塗る`, s: () => 'まだ歩いていないマスに入ると、MichiMiru の地図のマスが塗られます',
    ok: (c, v) => c.sum.newMesh >= v, prog: (c, v) => `${Math.min(c.sum.newMesh, v)}／${v}`, say: '新しいマス、塗ってみる？'},
  {id: 'road', app: 'walk', auto: 1, d: ALL, val: (c, d) => ({near: 200, walk: 500, far: 1500})[d],
    t: v => `はじめて歩く道を ${fmtM(v)}`, s: () => '通ったことのない道を選んで歩きます',
    ok: (c, v) => c.sum.newRoad >= v, prog: (c, v) => `${fmtM(Math.min(c.sum.newRoad, v))}／${fmtM(v)}`, say: '知らない道、歩いてみる？'},
  {id: 'long', app: 'walk', auto: 1, d: ALL, need: c => c.avg > 0,
    val: (c, d) => Math.ceil((c.avg + ({near: 300, walk: 500, far: 1000})[d]) / 100) * 100,
    t: v => `いつもより長く、${fmtM(v)} 歩く`, s: c => c.avg > 0 ? `最近2週間の1回の平均は ${fmtM(c.avg)}。1回の散歩で` : '1回の散歩で',
    ok: (c, v) => c.maxWalk >= v, prog: (c, v) => c.maxWalk ? `今日いちばん長い散歩 ${fmtM(c.maxWalk)}` : '', say: '今日は少し遠くまで？'},
  {id: 'stamp', app: 'walk', auto: 1, d: ['near', 'walk'], need: (c, d) => !!(c.mat && c.mat.poi && c.mat.poi[d] > 0),
    t: () => '神社・寺・公園に立ち寄る', s: (c, v, d) => c.mat && c.mat.poi ? `${DISTS[d].nm}の範囲に ${c.mat.poi[d]}か所あります。MichiMiru のスタンプ帳に入ります` : 'MichiMiru のスタンプ帳に入ります',
    ok: c => c.stamp > 0, say: '寄り道、してみる？'},
  {id: 'spot', app: 'megu', auto: 1, d: ['walk', 'far'], need: (c, d) => !!(c.mat && c.mat.megu && c.mat.megu[d] && c.mat.megu[d].n > 0),
    t: () => 'MeguMiru のまだの場所を1つ訪ねる', s: (c, v, d) => { const m = c.mat && c.mat.megu && c.mat.megu[d]; return m && m.nm ? `いちばん近いのは「${m.nm}」（${fmtM(m.dd)}）` : 'ミュージアム・史跡・道の駅のうち、まだ行っていない所'; },
    ok: c => c.megu.spot > 0, megu: 1, say: 'まだの場所、行ってみる？'},
  {id: 'newplace', app: 'megu', auto: 1, d: ['far'],
    t: () => '初めての駅か市区町村へ行く', s: () => '初めての駅で降りるか、初めての市区町村を歩きます（MeguMiru に入ります）',
    ok: c => c.megu.place > 0, megu: 1, say: '知らない駅、行ってみる？'},
  // ---- 自己申告 ----
  {id: 'red3', app: 'walk', d: ALL, t: () => '赤いものを3つ見つける', s: () => '看板・花・郵便ポスト……。見つけたら［できた］', say: '赤いもの、いくつあるかな。'},
  {id: 'sky', app: 'sora', d: ALL, t: () => '立ち止まって、空を見上げる', s: () => '雲・鳥・飛行機。何が見えたか', say: '空、見上げてみない？', bee: 'lookup'},
  {id: 'shop', app: 'walk', d: ALL, t: () => '入ったことのない店をのぞく', s: () => '入らなくても、のぞくだけでいい', say: '気になるお店、ある？'},
  {id: 'alley', app: 'walk', d: ALL, t: () => '知らない路地を1本歩く', s: () => 'いつもの道から、1本だけそれてみる', say: '細い道、入ってみる？'},
  {id: 'flower', app: 'walk', d: ALL, t: () => '季節の花を見つける', s: () => '庭先・道ばた・公園。いま咲いている花', say: 'どんな花が咲いてるかな。'}
];
const TASK = Object.fromEntries(TASKS.map(t => [t.id, t]));
const MK = {ctx: null, at: 0, busy: null};

const daysAll = () => lsGet(K_DAYS, {}) || {};
const dayRec = (k = dayKey()) => daysAll()[k] || null;
function daySave(k, rec) { const a = daysAll(); a[k] = rec; lsSet(K_DAYS, a); }
function here() {
  const lp = lsGet('walk_lastpos', null);
  if (Array.isArray(lp) && lp.length === 2 && isFinite(lp[0])) return lp;
  const h = lsGet('walk_home', null);
  if (Array.isArray(h) && h.length === 2 && (h[0] || h[1])) return h;
  return null;
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- 判定の材料 ----------
async function mkCtx(force) {
  if (!force && MK.ctx && Date.now() - MK.at < 20000) return MK.ctx;
  if (MK.busy) return MK.busy;
  MK.busy = (async () => {
    const now = Date.now(), d0 = dayStart(now);
    const c = {now, d0, here: here(), sum: {newMesh: 0, newRoad: 0}, maxWalk: 0, avg: 0, walkToday: false, stamp: 0, megu: {spot: 0, place: 0, ok: false}, mat: null, meguOn: false,
      raw: {walks: [], mlog: [], mrec: {}}};   // raw：ボタンの1行と「最近のみるとこ」に使う
    // 散歩のまとめ
    const db = await idbOpen('michimiru');
    if (db) {
      try {
        const ws = (await kvGet(db, 'walks')) || [], past = [];
        c.raw.walks = Array.isArray(ws) ? ws : [];
        ws.forEach(w => {
          if (!w || !w.t0) return;
          if (w.t0 >= d0) { c.sum.newMesh += w.newMesh || 0; c.sum.newRoad += w.newRoad || 0; c.maxWalk = Math.max(c.maxWalk, w.dist || 0); c.walkToday = true; }
          else if (w.t0 >= d0 - 14 * 864e5 && (w.dist || 0) >= 300) past.push(w.dist);
        });
        if (past.length >= 3) c.avg = past.reduce((a, b) => a + b, 0) / past.length;
      } finally { db.close(); }
    }
    // スタンプ帳（その日の朝4時から今までの日付に入っているもの）
    const dates = new Set([ymd(d0), ymd(now)]);
    Object.values(lsGet('walk_stamps', {}) || {}).forEach(s => { if (s && (s.days || []).some(x => dates.has(x)) && !(s.first > now)) c.stamp++; });
    // MeguMiru：今日、訪問（段階2）になった場所
    const mdb = await idbOpen('megu');
    if (mdb) {
      try {
        const log = (await kvGet(mdb, 'log')) || [], rec = (await kvGet(mdb, 'rec')) || {};
        c.megu.ok = true; c.raw.mlog = Array.isArray(log) ? log : []; c.raw.mrec = rec || {};
        const seen = new Set();
        log.forEach(e => {
          if (!e || e.t < d0 || (e.k !== 'new' && e.k !== 'up') || seen.has(e.id)) return;
          const r = rec[e.id], sh = r && r.s && r.s.sh; if (!r || !(r.lv >= 2)) return;
          seen.add(e.id);
          if (sh === 'mu' || sh === 'hi' || sh === 'mi') c.megu.spot++;
          else if (sh === 'st' || sh === 'city') c.megu.place++;
        });
      } finally { mdb.close(); }
    }
    // お題の材料（MichiMiru が書く）。3日以内で、今の場所から1km 以内のときだけ使う
    const mat = lsGet('walk_mk_v1', null);
    if (mat && mat.p && c.here && now - mat.t < 3 * 864e5 && distM(mat.p, c.here) < 1000) c.mat = mat;
    try { const p = P(); if (p) c.meguOn = !!p.tokoState().meguOn; } catch (e) {}
    MK.ctx = c; MK.at = Date.now();
    return c;
  })();
  try { return await MK.busy; } finally { MK.busy = null; }
}

// ---------- お題を選ぶ ----------
function mkPick(k, dist, rr, c, avoidId) {
  const R = rng(hash(`${k}|${dist}|${rr}`));
  const prev = daysAll()[ymd(new Date(k + 'T12:00:00').getTime() - 864e5)];
  const yid = prev && prev.q && prev.q[dist] && prev.q[dist].id;
  const ok = TASKS.filter(t => t.d.includes(dist) && (!t.auto || (c.here && (!t.need || t.need(c, dist)))));
  const auto = ok.filter(t => t.auto), self = ok.filter(t => !t.auto);
  const pref = a => { const b = a.filter(t => t.id !== yid && t.id !== avoidId); return b.length ? b : a; };
  const pool = auto.length && R() < 0.7 ? pref(auto) : pref(self);
  const t = pool[Math.floor(R() * pool.length)];
  const q = {id: t.id}; if (t.val) q.v = t.val(c, dist);
  return q;
}
// その距離のお題がまだなければ選んで保存
function mkEnsure(dist, c) {
  const k = dayKey(); const rec = dayRec(k) || {q: {}, rr: {}};
  rec.q = rec.q || {}; rec.rr = rec.rr || {};
  if (!rec.q[dist] || !TASK[rec.q[dist].id]) { rec.q[dist] = mkPick(k, dist, 0, c); daySave(k, rec); return true; }
  return false;
}
function mkReroll() {
  const c = MK.ctx; if (!c) return;
  const k = dayKey(), rec = dayRec(k), dist = SET.dist;
  if (!rec || rec.done || (rec.rr && rec.rr[dist])) return;
  rec.rr = rec.rr || {}; rec.rr[dist] = 1;
  rec.q[dist] = mkPick(k, dist, 1, c, rec.q[dist] && rec.q[dist].id);
  daySave(k, rec); mkRender(); beeSayTask();
}

// ---------- 判定 ----------
async function mkJudge(reason, c0) {
  const c = c0 || await mkCtx(true);
  const k = dayKey(), rec = dayRec(k);
  if (!rec || !rec.q) return {now: false, done: false};
  if (rec.done) return {now: false, done: true};
  const order = [SET.dist].concat(DKEYS.filter(d => d !== SET.dist));
  for (const d of order) {
    const q = rec.q[d], t = q && TASK[q.id];
    if (t && t.auto && t.ok(c, q.v)) return mkDone(k, rec, d, q, false);
  }
  return {now: false, done: false};
}
function mkDone(k, rec, d, q, self) {
  const before = beeData(), t = TASK[q.id];
  rec.done = {id: q.id, d, t: Date.now()};
  if (q.v != null) rec.done.v = q.v;
  if (self) rec.done.self = 1;
  if (!before.n) rec.done.f = 1;
  if (!before.kinds[q.id]) rec.done.kf = 1;
  if (!before.items[t.app]) rec.done.it = t.app;
  daySave(k, rec);
  const after = beeSync();
  const up = stageOf(after.n) > stageOf(before.n) || sceneOf(after.n) !== sceneOf(before.n);
  const first = !!(rec.done.f || (!self && rec.done.kf));
  beeReact({k: first ? 'first' : self ? 'self' : 'joy', up, it: rec.done.it || '', d: k});
  return {now: true, done: true, first, title: t.t(q.v), self: !!self};
}
function mkUndo() {
  const k = dayKey(), rec = dayRec(k);
  if (!rec || !rec.done || !rec.done.self) return;
  delete rec.done; daySave(k, rec);
  beeSync(); beeUnreact(k);
  mkRender(); appsRender(); beeCorner();
}

// ---------- カード ----------
function mkRender() {
  const el = $('mk'); if (!el) return;
  const k = dayKey(), rec = dayRec(k) || {q: {}, rr: {}}, dist = SET.dist, c = MK.ctx;
  const q = rec.q && rec.q[dist], t = q && TASK[q.id];
  let h = `<div class="mkHd"><span class="mkT">🌿 ミルビーの きょうのみちくさ</span></div><div class="mkHd2"><div class="mkDist" role="group" aria-label="距離">` +
    DKEYS.map(d => `<button type="button" data-d="${d}" class="${d === dist ? 'on' : ''}" aria-pressed="${d === dist}">${DISTS[d].nm}</button>`).join('') + '</div></div>';
  if (!t || !c) { el.innerHTML = h + '<div class="mkBody"><div class="mkTx"><div class="mkS">お題を選んでいます…</div></div></div>'; mkWire(); return; }
  const a = APPS[t.app];
  h += `<div class="mkBody"><div class="mkTx"><div class="mkQ">${esc(t.t(q.v))}</div><div class="mkS">${esc(t.s(c, q.v, dist))}</div></div>` +
    `<button class="mkApp" type="button" data-app="${t.app}" aria-label="${a.ap} を開く"><img src="${a.img}" alt="" onerror="this.style.visibility='hidden'"></button></div>`;
  let f = '';
  if (rec.done) {
    if (rec.done.d === dist && rec.done.id === q.id) f += '<span class="mkDone">✓ 達成</span>' + (rec.done.self ? '<button class="mkSub" type="button" id="mkUndo">取り消す</button>' : '');
    else f += `<span class="mkSt">今日はもう達成（${DISTS[rec.done.d].nm}：${esc(TASK[rec.done.id] ? TASK[rec.done.id].t(rec.done.v) : '')}）</span>`;
  } else if (t.auto) {
    const pg = t.prog ? t.prog(c, q.v) : '';
    f += `<span class="mkSt">歩けば自動で判定${pg ? `・いま <b>${esc(pg)}</b>` : ''}</span>`;
    if (t.megu && c.walkToday && !c.meguOn) f += '<div class="mkWait">MeguMiru を開くと判定します（行った場所は MeguMiru が記録から拾います）</div>';
  } else f += '<button class="mkBtn" type="button" id="mkOk">できた</button>';
  if (!rec.done && !(rec.rr && rec.rr[dist])) f += '<button class="mkSub mkRr" type="button" id="mkRr">↻ 引き直す</button>';
  el.innerHTML = h + `<div class="mkFt">${f}</div>`;
  mkWire();
}
function mkWire() {
  const el = $('mk');
  el.querySelectorAll('.mkDist button').forEach(b => b.onclick = () => mkSetDist(b.dataset.d));
  const ap = el.querySelector('.mkApp'); if (ap) ap.onclick = () => tkGo(ap.dataset.app);
  const ok = $('mkOk'); if (ok) ok.onclick = () => {
    const k = dayKey(), rec = dayRec(k), q = rec && rec.q[SET.dist]; if (!q || rec.done) return;
    mkDone(k, rec, SET.dist, q, true); mkRender(); appsRender(); beeOnShow();
  };
  const un = $('mkUndo'); if (un) un.onclick = mkUndo;
  const rr = $('mkRr'); if (rr) rr.onclick = mkReroll;
}
async function mkSetDist(d) {
  if (!DISTS[d] || d === SET.dist) return;
  SET.dist = d; saveSet();
  const c = MK.ctx || await mkCtx(false);
  mkEnsure(d, c); mkRender();
}
// ホームが見えたとき：材料を読み直して、お題を用意して、判定して、描く
async function mkRefresh(force) {
  const c = await mkCtx(force);
  mkEnsure(SET.dist, c);
  await mkJudge('show', c);
  mkRender(); appsRender();
}
