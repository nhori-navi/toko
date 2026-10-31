// ミルトコ：ホーム画面（版1）。4つのミル（MichiMiru・MeguMiru・TenMiru・YamaMiru）をまとめるホーム
// ・Google Play 版（ミルトコ）では、MichiMiru（walk）のページの上に iframe でかぶせて使う（walk の mirutoko.js）
//   → ボタンを押すと parent.tokoGo('walk'|'megu'|'sora'|'yama')。歩くはホームが下がり、ほかは MichiMiru の「重ねて開く」で開く
// ・Chrome で単独で開いたときは、4つのミルへ普通のリンクで移る（見た目を確かめる用）
// ・同じアドレス（nhori-navi.github.io）の下にあるので、4つのミルの保存を直接読める（書くのは toko_ で始まるものだけ）
// 読み込み順：toko.js → michikusa.js → bee.js → tkInit()
var TOKO_V = 1; // MichiMiru（mirutoko.js）が「読み込めた」の印に読むので var
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pad2 = n => String(n).padStart(2, '0');
const ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
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
// toko_bee_v1：{n, first, items:{ミル: 日付}, kinds:{お題: 日付}, stage（見せた段階）, greet（その日に一言を言った印）, react（ホームに戻ったときの反応）}
const K_DAYS = 'toko_days_v1', K_SET = 'toko_set_v1', K_BEE = 'toko_bee_v1';
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
const IN_WALK = (() => { try { return window.parent !== window && typeof parent.tokoGo === 'function'; } catch (e) { return false; } })();
const P = () => { try { return IN_WALK ? parent : null; } catch (e) { return null; } };

// ---------- 4つのミル ----------
const APPS = {
  walk: {nm: '歩く', ap: 'MichiMiru', c: '#2fbf71', img: '../walk/icon-192.png', url: '../walk/', it: '🗺️', itn: '地図'},
  megu: {nm: 'めぐる', ap: 'MeguMiru', c: '#7a5c8e', img: '../megu/icons/icon-192.png', url: '../megu/', it: '🎒', itn: 'リュック'},
  sora: {nm: '空', ap: 'TenMiru', c: '#1f6fd1', img: '../sora/icon-192.png', url: '../sora/', it: '🥽', itn: 'ゴーグル'},
  yama: {nm: '山', ap: 'YamaMiru', c: '#2e7d32', img: '../yama/icon-192.png', url: '../yama/', it: '🧢', itn: '登山帽'}
};
function tkGo(id, sub) {
  const p = P();
  if (p) { try { p.tokoGo(id, sub); return; } catch (e) {} }
  location.href = APPS[id].url;
}
function appsRender() {
  const items = (typeof beeData === 'function' ? beeData().items : {}) || {};
  $('apps').innerHTML = Object.entries(APPS).map(([k, a]) =>
    `<button class="app" type="button" data-app="${k}" style="--c:${a.c}"><img src="${a.img}" alt="" onerror="this.style.visibility='hidden'"><span><b>${a.nm}</b><small>${a.ap}</small></span>` +
    (items[k] ? `<span class="it" title="ミルビーの${a.itn}">${a.it}</span>` : '') + '</button>').join('');
}

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
function shClose(fromPop) {
  if (!SH.k) return;
  SH.k = ''; $('sheet').classList.remove('on');
  const f = SH.onClose; SH.onClose = null; if (f) f();
  if (!fromPop && history.state && history.state.tkSheet) { try { history.back(); } catch (e) {} }
}
window.addEventListener('popstate', () => { if (SH.k && !(history.state && history.state.tkSheet)) shClose(true); });
function swHtml(id, label, note, on) {
  return `<label class="sw"><span>${label}${note ? `<small>${note}</small>` : ''}</span><input type="checkbox" id="${id}"${on ? ' checked' : ''}></label>`;
}
function setOpen() {
  const p = P(); let st = null; try { st = p && p.tokoState(); } catch (e) {}
  const trial = !!(st && st.trial);
  shOpen('set', '設定',
    '<div class="box">' + swHtml('swBee', 'ミルビーを出さない', 'ホームの右下のミルビーを隠します（みちくさは今までどおり）', !SET.bee) +
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
    '<div class="box"><h3>🌿 きょうのみちくさ</h3><p>毎朝4時に、小さなお題が1つ出ます。上の「近所・散歩・遠出」で、歩けそうな距離に合わせて選べます。気に入らなければ「↻ 引き直す」（距離ごとに1回）。</p>' +
    '<p>「歩けば自動で判定」のお題は、MichiMiru で記録して歩くと、散歩を終えたときやホームに戻ったときに判定します。［できた］のお題は、できたら自分で押します（その日のうちなら取り消せます）。</p>' +
    '<p>達成として数えるのは1日1回です。できなかった日も、次の朝に静かに入れ替わるだけです。</p></div>' +
    '<div class="box"><h3>4つのミル</h3><p>歩く＝MichiMiru（徒歩ナビ・歩いた記録）、めぐる＝MeguMiru（行った場所を集める）、空＝TenMiru（見上げた空の飛行機・星）、山＝YamaMiru（見えている山の名前）。</p>' +
    '<p>開いたミルから戻るときは、画面の上の「◀ ホームに戻る」かスマホの「戻る」。MichiMiru の地図からは、右の「▦」でホームに戻ります。</p></div>' +
    '<div class="box"><h3>ミルビー</h3><p>右下のハシビロコウ。みちくさを達成すると反応し、回数に合わせて少しずつ遠くへ出かけます。押すとミルビーのページ（これまでの回数・持ち物）。</p></div>');
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
  try { beeOnShow(); } catch (e) {}
  recUpd();
};
// 散歩を終えたとき（MichiMiru の散歩のまとめを保存したあと）。新しく達成したら {now:true, title}
window.tokoJudge = async function (reason) {
  const r = await mkJudge(reason || 'walk');
  try { mkRender(); appsRender(); } catch (e) {}
  return r;
};
// 控えを読み込んだあと
window.tokoReload = function () {
  Object.assign(SET, {dist: 'walk', bee: true, resume: false}, lsGet(K_SET, {}));
  beeSync(); mkRender(); appsRender(); beeCorner();
};

function tkInit() {
  $('day').textContent = mdw(dayKey());
  appsRender();
  $('apps').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) tkGo(b.dataset.app); });
  $('recBar').onclick = () => tkGo('walk');
  document.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => ({set: setOpen, help: helpOpen, src: srcOpen})[b.dataset.sh]());
  $('shBack').onclick = () => shClose(false);
  beeSync(); beeCorner();
  mkRender();
  window.tokoShow();
  setInterval(recUpd, 5000);
  // 朝4時を過ぎたら入れ替える（開いたままのとき）
  let day = dayKey();
  setInterval(() => { if (dayKey() !== day) { day = dayKey(); $('day').textContent = mdw(day); mkRender(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !IN_WALK) window.tokoShow(); });
}
