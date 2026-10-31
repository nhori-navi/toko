// ミルトコ：ホーム画面（版2）。4つのミル（MichiMiru・MeguMiru・TenMiru・YamaMiru）をまとめるホーム
// ・Google Play 版（ミルトコ）では、MichiMiru（walk）のページの上に iframe でかぶせて使う（walk の mirutoko.js）
//   → ボタンを押すと parent.tokoGo('walk'|'megu'|'sora'|'yama')。歩くはホームが下がり、ほかは MichiMiru の「重ねて開く」で開く
//   版2：MichiMiru の画面より先に読み込まれることがある（開いたらすぐホーム）。?inapp=1 で「MichiMiru の中」と分かる
// ・Chrome で単独で開いたときは、4つのミルへ普通のリンクで移る（見た目を確かめる用）
// ・同じアドレス（nhori-navi.github.io）の下にあるので、4つのミルの保存を直接読める（書くのは toko_ で始まるものだけ）
// 読み込み順：toko.js → michikusa.js → bee.js → navi.js → tkInit()
var TOKO_V = 2; // MichiMiru（mirutoko.js）が「読み込めた」の印に読むので var
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pad2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const hm = t => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const fmtM = m => m < 1000 ? Math.round(m) + 'm' : (Math.round(m / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'km';
function distM(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
// 1日の区切りは朝4時（みちくさは毎朝4時に入れ替わる）
const DAY_H = 4;
const dayKey = (t = Date.now()) => ymd(t - DAY_H * 3600000);
const dayStart = (t = Date.now()) => { const k = dayKey(t); return new Date(k + 'T' + pad2(DAY_H) + ':00:00').getTime(); };
const mdw = k => { const d = new Date(k + 'T12:00:00'); return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`; };

// ---------- 置き場所 ----------
// toko_days_v1：{日付: {q:{near|walk|far: {id, v}}, rr:{距離: 1}, done:{id, d, v, t, self, f, kf, it}}}
// toko_set_v1：{dist, bee, resume}
// toko_bee_v1：{n, first, items:{ミル: 日付}, kinds:{お題: 日付}, stage・scene（見せた段階）, greet（その日に一言を言った印）, react（ホームに戻ったときの反応）}
// toko_nav_v1：使い方ナビを見た印
const K_DAYS = 'toko_days_v1', K_SET = 'toko_set_v1', K_BEE = 'toko_bee_v1', K_NAV = 'toko_nav_v1';
const SET = Object.assign({dist: 'walk', bee: true, resume: false}, lsGet(K_SET, {}));
const saveSet = () => lsSet(K_SET, SET);
// IndexedDB（MichiMiru の 'michimiru'、MeguMiru の 'megu'）。ないときは作らない（作ると、そのアプリの入れ物の準備が狂うため）
function idbOpen(name) {
  return new Promise(res => {
    let r;
    try { r = indexedDB.open(name); } catch (e) { res(null); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) {} };
    r.onerror = () => res(null); r.onblocked = () => res(null);
    r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('kv')) { db.close(); res(null); } else res(db); };
  });
}
const kvGet = (db, k) => new Promise(res => { try { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); } catch (e) { res(undefined); } });

// ---------- MichiMiru の中か ----------
// 版2：ホームが先に読み込まれると、MichiMiru の tokoGo などはまだない。?inapp=1 で中と分かり、呼ぶときに確かめる
const IN_WALK = (() => { try { return window.parent !== window && (/[?&]inapp=1/.test(location.search) || typeof parent.tokoGo === 'function'); } catch (e) { return false; } })();
const P = () => { try { return IN_WALK && typeof parent.tokoGo === 'function' ? parent : null; } catch (e) { return null; } };

// ---------- 4つのミル ----------
const APPS = {
  walk: {nm: '歩く', ap: 'MichiMiru', c: '#2fbf71', img: '../walk/icon-192.png', url: '../walk/', it: '🗺️', itn: '地図', d0: '歩いた記録・徒歩ナビ'},
  megu: {nm: 'めぐる', ap: 'MeguMiru', c: '#7a5c8e', img: '../megu/icons/icon-192.png', url: '../megu/', it: '🎒', itn: 'リュック', d0: '行った場所を集める'},
  sora: {nm: '空', ap: 'TenMiru', c: '#1f6fd1', img: '../sora/icon-192.png', url: '../sora/', it: '🥽', itn: 'ゴーグル', d0: '見上げた空の飛行機・星'},
  yama: {nm: '山', ap: 'YamaMiru', c: '#2e7d32', img: '../yama/icon-192.png', url: '../yama/', it: '🧢', itn: '登山帽', d0: '見えている山の名前'}
};
function tkGo(id, sub, tries) {
  const p = P();
  if (p) { try { p.tokoGo(id, sub); return; } catch (e) {} }
  if (IN_WALK) { if ((tries || 0) < 40) setTimeout(() => tkGo(id, sub, (tries || 0) + 1), 250); return; }   // MichiMiru の準備がまだ
  location.href = APPS[id].url;
}
const INFO = {line: {}};
function appsRender() {
  const items = (typeof beeData === 'function' ? beeData().items : {}) || {};
  $('apps').innerHTML = Object.entries(APPS).map(([k, a]) =>
    `<button class="app" type="button" data-app="${k}" style="--c:${a.c}" title="${a.ap}"><img src="${a.img}" alt="" onerror="this.style.visibility='hidden'"><span class="tx"><b>${a.nm}</b><small>${esc(INFO.line[k] || a.d0)}</small></span>` +
    (items[k] ? `<span class="it" title="ミルビーの${a.itn}">${a.it}</span>` : '') + '</button>').join('');
}

// ---------- 版2：ボタンの1行（そのミルの今） ----------
function issWhen(s) {
  const d = new Date(s), today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 864e5), h = d.getHours();
  return dd === 1 && h < 5 ? '今夜遅く' : dd === 0 ? (h < 12 ? '今朝' : h < 17 ? '今日' : '今夜') : dd === 1 ? (h < 12 ? '明日の朝' : '明日の夜') : (h < 12 ? 'あさっての朝' : 'あさっての夜');
}
function infoLines(c) {
  const now = Date.now(), L = {};
  // 歩く：今週（月曜から）の距離
  const ws = (c && c.raw.walks) || [];
  if (ws.length) {
    const m = new Date(); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    const km = ws.filter(w => w && w.t0 >= m.getTime()).reduce((a, w) => a + (w.dist || 0), 0);
    L.walk = km > 0 ? `今週 ${fmtM(km)}` : '今週はこれから';
  }
  // めぐる：集めた場所の数
  const rec = (c && c.raw.mrec) || {}, n = Object.values(rec).filter(r => r && r.lv >= 1 && !r.e).length;
  if (n) L.megu = `集めた場所 ${n}`;
  // 空：次に見える宇宙ステーション（TenMiru が残す sora_iss_v1）、なければキャッチした数
  const iss = lsGet('sora_iss_v1', null), nx = iss && Array.isArray(iss.list) && iss.list.find(p => p && p.e > now);
  if (nx) L.sora = nx.s <= now ? '🛰 いま見えています' : `🛰 ${issWhen(nx.s)} ${hm(nx.s)}`;
  else { const ct = (lsGet('sora_catch_v1', {}) || {}).total; if (ct) L.sora = `キャッチ ${ct}機`; }
  // 山：MichiMiru の今日のおすすめと同じ見え方（walk_mk_v1.yama）、なければ見つけた山の数
  const y = c && c.mat && c.mat.yama;
  if (y && y.m && y.k === dayKey()) L.yama = `🗻 ${y.dd ? '明日' : '今日'}の${y.s} ${y.m}`;
  else { const pk = Object.keys(((lsGet('yama_zukan_v1', {}) || {}).peaks) || {}).length; if (pk) L.yama = `見つけた山 ${pk}座`; }
  return L;
}

// ---------- 版2：最近のみるとこ（この1週間に4つのミルで見たもの・行った所） ----------
const MEGU_IC = {st: '🚉', city: '🗾', mi: '🛣️', mu: '🏛️', hi: '🏯'};
function relDay(t) {
  const a = new Date(dayKey(t) + 'T12:00:00'), b = new Date(dayKey() + 'T12:00:00'), n = Math.round((b - a) / 864e5);
  return n <= 0 ? 'きょう' : n === 1 ? 'きのう' : n + '日前';
}
function recentItems(c) {
  const now = Date.now(), t0 = now - 7 * 864e5, out = [];
  const add = (t, ic, tx, app) => { if (t >= t0 && t <= now + 60000) out.push({t, ic, tx, app}); };
  ((c && c.raw.walks) || []).forEach(w => {
    if (!w || !w.t0) return; const t = w.t1 || w.t0;
    if (w.newRoad >= 100) add(t, '🆕', `はじめて歩いた道 ${fmtM(w.newRoad)}`, 'walk');
    if (w.done) add(t, '🏆', `マスを${w.done > 1 ? w.done + 'つ' : ''}完全制覇`, 'walk');
    (w.stamps || []).filter(s => s && s.neu).forEach(s => add(t, '⛩', `${s.n}に寄った（はじめて）`, 'walk'));
  });
  const rec = (c && c.raw.mrec) || {}, seen = new Set();
  ((c && c.raw.mlog) || []).forEach(e => {
    if (!e || e.t < t0 || (e.k !== 'new' && e.k !== 'up') || seen.has(e.id)) return;
    const r = rec[e.id], s = r && r.s; if (!s || !s.n || !(r.lv >= 2)) return;
    seen.add(e.id); add(e.t, MEGU_IC[s.sh] || '📍', s.sh === 'st' ? `${s.n}で降りた` : `${s.n}に行った`, 'megu');
  });
  Object.values(((lsGet('yama_zukan_v1', {}) || {}).peaks) || {}).forEach(p => { if (p && p.t1 && p.n) add(p.t1, '🏔', `${p.n}を見つけた`, 'yama'); });
  ((lsGet('sora_catch_v1', {}) || {}).log || []).forEach(e => { if (e && e.t) add(e.t, '✈️', `${String(e.cs || e.ty || '飛行機').trim()} をキャッチ`, 'sora'); });
  Object.entries(daysAll()).forEach(([k, r]) => { const d = r && r.done, t = d && TASK[d.id]; if (t) add(d.t, '🌿', `みちくさ：${t.t(d.v)}`, t.app); });
  const uniq = new Set();
  return out.sort((a, b) => b.t - a.t).filter(x => { const k = x.tx; if (uniq.has(k)) return false; uniq.add(k); return true; }).slice(0, 4);
}
function recentRender(c) {
  const el = $('recent'); if (!el) return;
  const it = recentItems(c);
  el.innerHTML = '<h2>📍 最近のみるとこ</h2>' + (it.length
    ? it.map(x => `<button class="rc" type="button" data-app="${x.app}"><span class="ic">${x.ic}</span><span class="tx">${esc(x.tx)}</span><span class="dy">${relDay(x.t)}</span></button>`).join('')
    : '<div class="rc0">4つのミルで見つけたもの・行った所が、ここに集まります</div>');
}
function infoRender(c) { INFO.line = infoLines(c); appsRender(); recentRender(c); }

// ---------- 記録中の帯（MichiMiru から5秒ごとにもらう） ----------
function recUpd() {
  const p = P(), b = $('recBar'); if (!p || !b) return;
  let s = null; try { s = p.tokoState(); } catch (e) {}
  const on = !!(s && s.rec);
  b.classList.toggle('on', on); b.classList.toggle('veh', !!(s && s.veh));
  if (on) b.textContent = s.txt || '● 記録中';
}

// ---------- 明るさ（MichiMiru から知らせを受ける） ----------
window.miruThemeSet = t => { document.documentElement.classList.toggle('dark', !!(t && t.dark)); };

// ---------- 重ねる画面 ----------
const SH = {k: '', onClose: null};
function shOpen(k, title, html, after) {
  SH.k = k; $('shT').textContent = title; $('shBody').innerHTML = html;
  const s = $('sheet'); s.classList.add('on'); s.scrollTop = 0;
  try { if (!(history.state && history.state.tkSheet)) history.pushState({tkSheet: k}, ''); else history.replaceState({tkSheet: k}, ''); } catch (e) {}
  if (after) after();
}
// keepHist：履歴は戻さない（すぐあとに別の画面〔使い方ナビ〕で置き換えるとき）
function shClose(fromPop, keepHist) {
  if (!SH.k) return;
  SH.k = ''; $('sheet').classList.remove('on');
  const f = SH.onClose; SH.onClose = null; if (f) f();
  if (!fromPop && !keepHist && history.state && history.state.tkSheet) { try { history.back(); } catch (e) {} }
}
window.addEventListener('popstate', () => { if (SH.k && !(history.state && history.state.tkSheet)) shClose(true); });
function swHtml(id, label, note, on) {
  return `<label class="sw"><span>${label}${note ? `<small>${note}</small>` : ''}</span><input type="checkbox" id="${id}"${on ? ' checked' : ''}></label>`;
}
function setOpen() {
  const p = P(); let st = null; try { st = p && p.tokoState(); } catch (e) {}
  const trial = !!(st && st.trial);
  shOpen('set', '設定',
    '<div class="box">' + swHtml('swBee', 'ミルビーを出さない', 'みちくさのカードの横のミルビーを隠します（みちくさは今までどおり）', !SET.bee) +
    swHtml('swResume', '前回のアプリから始める', 'ミルトコを開いたとき、前に使っていたアプリから始めます', SET.resume) + '</div>' +
    '<div class="box"><h3>暗い画面</h3><p>MichiMiru の設定（設定タブの「画面の明るさ・文字の大きさ」）に合わせます。</p></div>' +
    (trial ? '<div class="box"><h3>ミルトコのホームを試すのをやめる</h3><p>いつもの MichiMiru に戻ります。MichiMiru の設定タブの「🏠 ミルトコのホーム（ためし）」で、また試せます。みちくさの記録は消えません。</p><button class="lnk" id="tkOff" type="button">やめて MichiMiru に戻る</button></div>' : '') +
    `<div class="box sub">ミルトコ 版${TOKO_V}${st && st.ver ? `・MichiMiru 版${st.ver}` : ''}</div>`,
    () => {
      $('swBee').onchange = e => { SET.bee = !e.target.checked; saveSet(); beeCorner(); };
      $('swResume').onchange = e => { SET.resume = e.target.checked; saveSet(); };
      const o = $('tkOff'); if (o) o.onclick = () => { try { P().tokoOff(); } catch (e) {} };
    });
}
function helpOpen() {
  shOpen('help', '使い方',
    '<div class="box"><button class="lnk" id="navAgain" type="button">🐦 使い方ナビをもう一度見る</button></div>' +
    '<div class="box"><h3>🌿 きょうのみちくさ</h3><p>毎朝4時に、ミルビーが小さなお題を1つ出します。「近所・散歩・遠出」で、歩けそうな距離に合わせて選べます。気に入らなければ「↻ 引き直す」（距離ごとに1回）。</p>' +
    '<p>「歩けば自動で判定」のお題は、MichiMiru で記録して歩くと、散歩を終えたときやホームに戻ったときに判定します。［できた］のお題は、できたら自分で押します（その日のうちなら取り消せます）。</p>' +
    '<p>達成として数えるのは1日1回です。できなかった日も、次の朝に静かに入れ替わるだけです。</p></div>' +
    '<div class="box"><h3>4つのミル</h3><p>歩く＝MichiMiru（徒歩ナビ・歩いた記録）、めぐる＝MeguMiru（行った場所を集める）、空＝TenMiru（見上げた空の飛行機・星）、山＝YamaMiru（見えている山の名前）。ボタンの小さな字は、そのミルの今です。</p>' +
    '<p>開いたミルから戻るときは、画面の上の緑の帯「◀ ホームに戻る」かスマホの「戻る」。</p></div>' +
    '<div class="box"><h3>📍 最近のみるとこ</h3><p>この1週間に4つのミルで見たもの・行った所（はじめて歩いた道・行った場所・見つけた山・キャッチした飛行機・みちくさ）が、新しい順に出ます。押すとそのミルが開きます。</p></div>' +
    '<div class="box"><h3>ミルビー</h3><p>みちくさのカードの横にいるハシビロコウ。みちくさを達成すると喜び、回数に合わせて少しずつ遠くへ出かけます。押すとミルビーのページ（これまでの回数・持ち物）。</p></div>',
    () => { $('navAgain').onclick = () => { shClose(false, true); navStart(true); }; });
}
function srcOpen() {
  shOpen('src', 'データの出典',
    '<div class="box"><p>地図・道・神社・寺・公園：© OpenStreetMap contributors、地図の表示：© Mapbox</p>' +
    '<p>そのほかのデータ（駅・市区町村・史跡・飛行機・星・山・天気など）の出典は、それぞれのアプリの使い方・設定にあります。</p></div>');
}

// ---------- MichiMiru から呼ばれるもの ----------
// ホームが見えたとき（初めて・ほかの画面から戻ったとき）
window.tokoShow = async function () {
  try { await mkRefresh(true); } catch (e) {}
  try { infoRender(MK.ctx); } catch (e) {}
  if (!NAVI.on) { try { beeOnShow(); } catch (e) {} }
  recUpd();
};
// 散歩を終えたとき（MichiMiru の散歩のまとめを保存したあと）。新しく達成したら {now:true, title}
window.tokoJudge = async function (reason) {
  const r = await mkJudge(reason || 'walk');
  try { mkRender(); infoRender(MK.ctx); } catch (e) {}
  return r;
};
// 控えを読み込んだあと
window.tokoReload = function () {
  Object.assign(SET, {dist: 'walk', bee: true, resume: false}, lsGet(K_SET, {}));
  beeSync(); mkRender(); infoRender(MK.ctx); beeCorner();
};

function tkInit() {
  $('day').textContent = mdw(dayKey());
  appsRender(); recentRender(null);
  $('apps').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) tkGo(b.dataset.app); });
  $('recent').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) tkGo(b.dataset.app); });
  $('recBar').onclick = () => tkGo('walk');
  document.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => ({set: setOpen, help: helpOpen, src: srcOpen})[b.dataset.sh]());
  $('shBack').onclick = () => shClose(false);
  beeSync(); beeCorner();
  mkRender();
  if (!lsGet(K_NAV, 0)) navStart(false);   // 初めて開いたとき：ミルビーの使い方ナビ
  window.tokoShow();
  setInterval(recUpd, 5000);
  // 朝4時を過ぎたら入れ替える（開いたままのとき）
  let day = dayKey();
  setInterval(() => { if (dayKey() !== day) { day = dayKey(); $('day').textContent = mdw(day); mkRender(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !IN_WALK) window.tokoShow(); });
}
