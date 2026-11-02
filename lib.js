// lib.js：ミルトコの共通の部品（版3〜）。ミルビーのページ（toko/index.html）と、HP の TOP（アプリの中で開いたとき）の両方で読む
// ・Google Play 版（ミルトコ）では、MichiMiru（walk）のページの上に HP の TOP を iframe でかぶせる（walk の mirutoko.js）
//   → ボタンを押すと parent.tokoGo('walk'|'megu'|'sora'|'yama'|'bee')。歩くは TOP が下がり、ほかは MichiMiru の「重ねて開く」で開く（bee＝ミルビーのページ）
// ・Chrome で単独で開いたときは、普通のリンクで移る
// ・同じアドレス（nhori-navi.github.io）の下にあるので、4つのミルの保存を直接読める（書くのは toko_ で始まるものだけ）
// 読み込み順：lib.js → michikusa.js → bee.js（ミルビーのページ）／kyou.js（TOP）
// 版6（2026-11-02。仕様メモ 17）：山と飛行機のお題・TOP の入口に［できた］・最後の一言を残す・初日の案内・旅支度の完成と棚の段（持ち物・みちくさ帳・空の帳）
// 版7（2026-11-03）：月・星座のお題、空の帳は TenMiru v46 の sora_skyz_v1（ずっと残す帳）から数える、最近のみるとこに月のカードと星座、TenMiru の空の図鑑へのリンク
var TOKO_V = 7; // MichiMiru（mirutoko.js）が「読み込めた」の印に読むので var
const TOKO_BASE = (() => { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/toko/'; } })(); // toko フォルダーの場所（TOP から読んでも合うように）
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
// toko_set_v1：{dist, resume}
// toko_bee_v1：{n, first, items:{ミル: 日付}, kinds:{お題: 日付}, stage・scene（見せた段階）, greet（その日に一言を言った印）, react（反応）, intro（自己紹介を見た印）}
const K_DAYS = 'toko_days_v1', K_SET = 'toko_set_v1', K_BEE = 'toko_bee_v1';
const SET = Object.assign({dist: 'walk', resume: false}, lsGet(K_SET, {}));
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
// MichiMiru の画面より先に読み込まれることがある。?inapp=1 で中と分かり、呼ぶときに MichiMiru の準備を確かめる
const IN_WALK = (() => { try { return window.parent !== window && (/[?&]inapp=1/.test(location.search) || typeof parent.tokoGo === 'function'); } catch (e) { return false; } })();
const P = () => { try { return IN_WALK && typeof parent.tokoGo === 'function' ? parent : null; } catch (e) { return null; } };
// 版5：ホーム画面のアイコンから開いた HP（Web 版のミルトコ）。この窓の中では sessionStorage の toko_web で覚える
//   → 4つのミルは「◀ TOP」を出す（MichiMiru 版43・MeguMiru 版22・TenMiru v45・YamaMiru 版17）
const IN_WEBAPP = (() => {
  if (IN_WALK) return false;
  try {
    const sa = /[?&]home=1/.test(location.search) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true || sessionStorage.getItem('toko_web') === '1';
    if (sa) sessionStorage.setItem('toko_web', '1');
    return !!sa;
  } catch (e) { return false; }
})();

// ---------- 4つのミル ----------
const SITE_ROOT = new URL('../', TOKO_BASE).href;   // https://nhori-navi.github.io/
const APPS = {
  walk: {nm: '歩く', ap: 'MichiMiru', c: '#1e8a4c', cls: 'app-michi', img: SITE_ROOT + 'walk/icon-192.png', url: SITE_ROOT + 'walk/', it: '🗺️', itn: '地図', d0: '歩いた記録・徒歩ナビ'},
  megu: {nm: 'めぐる', ap: 'MeguMiru', c: '#7a5c8e', cls: 'app-megu', img: SITE_ROOT + 'megu/icons/icon-192.png', url: SITE_ROOT + 'megu/', it: '🎒', itn: 'リュック', d0: '行った場所を集める'},
  sora: {nm: '見上げる', ap: 'TenMiru', c: '#2f68b8', cls: 'app-ten', img: SITE_ROOT + 'sora/icon-192.png', url: SITE_ROOT + 'sora/', it: '🥽', itn: 'ゴーグル', d0: '頭の上の飛行機・星'},
  yama: {nm: '眺める', ap: 'YamaMiru', c: '#3f7a45', cls: 'app-yama', img: SITE_ROOT + 'yama/icon-192.png', url: SITE_ROOT + 'yama/', it: '🧢', itn: '登山帽', d0: '見えている山の名前'}
};
function tkGo(id, sub, tries) {
  const p = P();
  if (p) { try { p.tokoGo(id, sub); return; } catch (e) {} }
  if (IN_WALK) { if ((tries || 0) < 40) setTimeout(() => tkGo(id, sub, (tries || 0) + 1), 250); return; }   // MichiMiru の準備がまだ
  location.href = id === 'bee' ? TOKO_BASE : id === 'top' ? SITE_ROOT + (IN_WEBAPP ? '?home=1' : '') : APPS[id].url + (id === 'sora' && sub === 'skyz' ? '?open=skyz' : '');   // 版7：空の図鑑を直接開く（Web のとき）
}

// ---------- そのミルの今（ボタンの1行） ----------
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
  // 見上げる：次に見える宇宙ステーション（TenMiru が残す sora_iss_v1）、なければキャッチした数
  const iss = lsGet('sora_iss_v1', null), nx = iss && Array.isArray(iss.list) && iss.list.find(p => p && p.e > now);
  if (nx) L.sora = nx.s <= now ? '🛰 いま見えています' : `🛰 ${issWhen(nx.s)} ${hm(nx.s)}`;
  else { const ct = (lsGet('sora_catch_v1', {}) || {}).total; if (ct) L.sora = `キャッチ ${ct}機`; }
  // 眺める：MichiMiru の今日のおすすめと同じ見え方（walk_mk_v1.yama）、なければ見つけた山の数
  const y = c && c.mat && c.mat.yama;
  if (y && y.m && y.k === dayKey()) L.yama = `🗻 ${y.dd ? '明日' : '今日'}の${y.s} ${y.m}`;
  else { const pk = Object.keys(((lsGet('yama_zukan_v1', {}) || {}).peaks) || {}).length; if (pk) L.yama = `見つけた山 ${pk}座`; }
  return L;
}

// ---------- 最近のみるとこ（この1週間に4つのミルで見たもの・行った所） ----------
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
  // 版7：月のカードと星座（TenMiru v46 の空の図鑑・今日の空）
  const z = lsGet('sora_skyz_v1', null) || {};
  Object.entries(z.moon || {}).forEach(([ph, v]) => { if (v && v.t) add(v.t, '🌙', `月のカード「${ph}」`, 'sora'); });
  Object.values(((lsGet('sora_day_v1', {}) || {}).days) || {}).forEach(d => (d && d.con || []).forEach(c => { if (c && c.t && c.name) add(c.t, '✨', `${c.name}を見つけた`, 'sora'); }));
  if (typeof daysAll === 'function') Object.values(daysAll()).forEach(r => { const d = r && r.done, t = d && TASK[d.id]; if (t) add(d.t, '🌿', `みちくさ：${t.t(d.v)}`, 'bee'); });
  const uniq = new Set();
  return out.sort((a, b) => b.t - a.t).filter(x => { if (uniq.has(x.tx)) return false; uniq.add(x.tx); return true; }).slice(0, 4);
}
// ---------- 空の帳（版6〜。月8枚・星座30枚。カードそのものは TenMiru v46 の「空の図鑑」、ここでは数だけ） ----------
// TenMiru v46 の sora_skyz_v1：{moon:{月齢の名前:{t,d}}, con:{星座の略号:{t,d}}}（ずっと残す）。v45 までの sora_day_v1（30日分）の days[*].con も足す
const SKY_N = {moon: 8, con: 30};
const MOON_NAMES = ['新月', '三日月', '上弦の月', '十三夜', '満月', '寝待月', '下弦の月', '有明の月'];
function skyBook() {
  const z = lsGet('sora_skyz_v1', null) || {}, days = ((lsGet('sora_day_v1', {}) || {}).days) || {};
  const con = {}, moon = {};
  Object.entries(z.con || {}).forEach(([id, v]) => { if (v && v.t) con[id] = v.t; });
  Object.entries(z.moon || {}).forEach(([ph, v]) => { if (v && v.t) moon[ph] = v.t; });
  Object.values(days).forEach(d => {
    if (!d) return;
    (d.con || []).forEach(c => { if (c && c.id && !(c.id in con)) con[c.id] = c.t || 0; });
    if (d.moon && d.moon.ph && !(d.moon.ph in moon)) moon[d.moon.ph] = d.moon.t || 0;
  });
  const nc = Object.keys(con).length, nm = Object.keys(moon).length;
  return {con: nc, moon: nm, n: nc + nm, total: SKY_N.moon + SKY_N.con, conT: con, moonT: moon};
}
// 月齢の名前（おおよそ。TenMiru は Astronomy Engine で正確に出す。お題の文に使うだけで、判定には使わない）
function moonNameApprox(t = Date.now()) {
  const syn = 29.530588853 * 864e5, ref = Date.UTC(2000, 0, 6, 18, 14);   // 2000-01-06 18:14 UTC の新月から
  const a = (((t - ref) % syn + syn) % syn) / syn * 360;
  return MOON_NAMES[Math.floor(((a + 22.5) % 360) / 45)];
}
// TenMiru の記録（星座・月のカード）を、その日の分だけ数える（みちくさの判定）
function skyToday(d0, now) {
  const b = skyBook(); let con = 0, moon = 0;
  Object.values(b.conT).forEach(t => { if (t >= d0 && t <= now + 60000) con++; });
  Object.values(b.moonT).forEach(t => { if (t >= d0 && t <= now + 60000) moon++; });
  // その日の星座は、帳に入らなかった分（2つ目から）も TenMiru の今日の記録で数える
  Object.values(((lsGet('sora_day_v1', {}) || {}).days) || {}).forEach(d => (d && d.con || []).forEach(c => { if (c && c.t >= d0 && c.t <= now + 60000) con = Math.max(con, 1); }));
  return {con, moon};
}
function swHtml(id, label, note, on) {
  return `<label class="tsw"><span>${label}${note ? `<small>${note}</small>` : ''}</span><input type="checkbox" id="${id}"${on ? ' checked' : ''}></label>`;
}
