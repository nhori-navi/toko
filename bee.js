// bee.js：ミルビーのページ（版3。ミルビーの家＝特別ページ）
// ・ミルトコ（アプリ）では HP の TOP の上に重ねて開く（MichiMiru の「重ねて開く」。上の緑の帯で TOP に戻る）。Chrome では普通のページ
// ・上にミルビーの景色（今の段階の絵と背景）、その下にきょうのみちくさのカード、これまでの回数・持ち物・Miru バッジ
// ・ミルビーが話すのはこのページの中だけ。話し方はやさしい相棒（「……」と命令はなし）
//   初めて開いたとき：自己紹介（6つの吹き出し。押すと次へ。アプリでは TOP で済ませる）／達成のあと：達成の一言（初めては驚いて揺れる）／
//   成長したとき：お辞儀して「ちょっと遠くまで来たね。」／その日に初めて開いたとき：お題の一言／2回目から：あいさつ／夜22時〜朝4時：眠い顔で、あいさつはしない
// ・版6：最後の一言は消さずに残す／持ち物4つがそろったら「旅支度、できたね。」と記念の1枚／棚は3段（持ち物・みちくさ帳・空の帳）
// ・版8：夜（22〜4時）の達成の反応は眠い顔のまま短く／景色は時間帯で色味が変わる（.scene の上に薄い色）／自己紹介に「上の絵も押せる」
// ・版9：月のふりかえり。月が替わって初めて開いたとき、先月に何かあればお辞儀して「先月も、いろいろ見たね。」→ 先月の1枚（canvas）。toko_bee_v1.month に見せた月。「先月のふりかえりを見る」でいつでも
const BEE_IMG = {front: 'img/bee_front.svg', side: 'img/bee_side.svg', joy: 'img/bee_joy.svg', surprised: 'img/bee_surprised.svg',
  lookup: 'img/bee_lookup.svg', sleepy: 'img/bee_sleepy.svg', bow: 'img/bee_bow.svg'};
const BEE = {sayT: 0, q: [], busy: false};
const isNight = (t = Date.now()) => { const h = new Date(t).getHours(); return h >= 22 || h < 4; };
const pickBy = (arr, s) => arr[hash(s) % arr.length];
// 自己紹介（アプリでは TOP で先に済ませるので、ここで出るのは Web で初めて開いたときなど）
const INTRO = [['はじめまして。ハシビロコウのミルビーです。', 'front'], ['なんでハシビロコウなんだ？って思ったでしょ。', 'side'],
  ['……作った人が、アンバランスな感じが好きなんだって。', 'front'], ['ほんとは、何時間でも動かないで立ってる鳥なんだけどね。', 'lookup'],
  ['ここでは毎朝ひとつ、「みちくさ」のお題を出すよ。', 'side'], ['お題は、このカードから。まずは『歩く』を開いて、一度歩いてみて。', 'joy']];   // Web 用（TOP の絵がないので「上の絵」の1枚はなし）

// ---------- 景色 ----------
function stageArt() { const st = Math.min(stageOf(beeData().n), beeLs().stage || 0); return isNight() ? 'sleepy' : STAGES[st][2]; }
function beeArt(k) {
  const a = $('bpArt'); if (!a) return;
  if (a.dataset.k !== k) { a.dataset.k = k; a.src = BEE_IMG[k]; }
  a.classList.toggle('tilt', k === 'side' && !BEE.busy && Math.min(stageOf(beeData().n), beeLs().stage || 0) === 1);
}
function beeShake() { const a = $('bpArt'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); setTimeout(() => a.classList.remove('shake'), 1100); }
// 吹き出しを順に出す。items：[{t:文, f:絵, ms, shake, tap（押すまで待つ）, then}]
function beeSeq(items) { clearTimeout(BEE.sayT); BEE.q = items.slice(); BEE.busy = true; beeNext(); }
function beeNext() {
  clearTimeout(BEE.sayT);
  const s = $('bpSay'), it = BEE.q.shift();
  if (!it) { s.classList.remove('on', 'tap'); BEE.busy = false; beeArt(stageArt()); return; }
  if (it.then) it.then();
  if (it.f) beeArt(it.f);
  if (it.shake) beeShake();
  if (it.t) { s.innerHTML = esc(it.t) + (it.tap ? '<span class="nx">▶</span>' : ''); s.classList.add('on'); s.classList.toggle('tap', !!it.tap); }
  else s.classList.remove('on', 'tap');
  // 版6：続きがあるときだけ、数秒で次へ。最後の一言は消さずに残す（次に何かするまで）
  if (!it.tap) {
    if (BEE.q.length) BEE.sayT = setTimeout(beeNext, it.t ? (it.ms || 4500) : 0);
    else { BEE.busy = false; if (!it.t) beeArt(stageArt()); }
  }
}
function beeTaskLine() {
  const rec = dayRec(), q = rec && rec.q && rec.q[SET.dist], t = q && TASK[q.id];
  return t && !(rec && rec.done) ? {t: t.say, f: t.bee || 'side'} : null;
}
function reactItems(r) {
  const d = beeData();
  if (isNight()) return [{t: r.k === 'first' ? '……お、初めてだ。' : '……おつかれ。', f: 'sleepy'}];   // 版8：夜は眠いまま
  if (r.k === 'first') return [{t: (dayRec() || {}).done && dayRec().done.f ? 'わっ、初めてだ！' : 'これは初めてだね！', f: 'surprised', shake: true}];
  if (r.k === 'self') return [{t: 'おつかれさま。', f: 'joy'}];
  return [{t: pickBy(['やったね。', 'いいね！', 'おみごと！'], dayKey() + d.n), f: 'joy'}];
}
// 成長をまだ見せていなければ、お辞儀して「ちょっと遠くまで来たね。」（そのとき景色と段階が進む）
function growItems() {
  const d = beeData(), ls = beeLs(), st = stageOf(d.n), sc = sceneOf(d.n);
  if (!(st > (ls.stage || 0) || sc > (ls.scene || 0))) return [];
  return [{t: 'ちょっと遠くまで来たね。', f: 'bow', ms: 4000, then: () => { const l = beeLs(); l.stage = st; l.scene = sc; lsSet(K_BEE, l); pageRender(); }}];
}
// みちくさ帳に出す短い名前（版6）
const KIND_NM = {mesh: '新しいマス', road: 'はじめての道', long: 'いつもより長く', stamp: '神社・寺・公園', spot: 'まだの場所', newplace: '初めての駅・町', peak: '山を見つける', catch: '飛行機1機', moon: '月を見上げる', constel: '星座を見つける', red3: '赤いもの3つ', sky: '空を見上げる', shop: '店をのぞく', alley: '知らない路地', flower: '季節のもの'};
// 版6：持ち物4つがそろって、まだ見せていなければ、お辞儀して「旅支度、できたね。」（そのとき記念の1枚が出る）
function tripItems() {
  const d = beeData(), ls = beeLs();
  if (ls.trip || Object.keys(APPS).some(k => !d.items[k])) return [];
  return [{t: '旅支度、できたね。', f: 'bow', ms: 5000, shake: false, then: () => { const l = beeLs(); l.trip = dayKey(); lsSet(K_BEE, l); pageRender(); }}];
}
// 版9：月が替わって初めて開いたとき（先月に何かあったときだけ）
function monthItems() {
  const ls = beeLs(), ym = ymKey();
  if (ls.month === ym) return [];
  const o = monthStats(prevYm(ym), MK.ctx);
  if (!o.any) { const l = beeLs(); l.month = ym; lsSet(K_BEE, l); return []; }
  return [{t: '先月も、いろいろ見たね。', f: 'bow', ms: 4500, then: () => { const l = beeLs(); l.month = ym; lsSet(K_BEE, l); monthShow(o); }}];
}
// 開いたとき
function beeOnOpen() {
  const ls = beeLs(), k = dayKey(), items = [];
  if (!ls.intro) {
    INTRO.forEach(([t, f]) => items.push({t, f, tap: true}));
    items.push({then: () => { const l = beeLs(); l.intro = 1; lsSet(K_BEE, l); }});
  }
  const r = ls.react;
  if (r && r.d === k) items.push(...reactItems(r));
  if (r) { const l = beeLs(); delete l.react; lsSet(K_BEE, l); }
  items.push(...growItems(), ...tripItems(), ...monthItems());
  if (ls.greet !== k) {
    const l = beeLs(); l.greet = k; lsSet(K_BEE, l);
    const tl = beeTaskLine(); if (tl) items.push(tl);
  } else if (!items.length && !isNight()) {
    const days = Object.keys(lsGet('walk_days_v1', {}) || {}).sort(), last = days[days.length - 1];
    const long = last && (new Date(k + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5 >= 7;
    items.push({t: long ? 'ひさしぶり。待ってたよ。' : pickBy(['おかえり。', '今日はどこ行く？', 'いい一日になるといいね。', 'おかえり。何か見つけた？'], k + String(Date.now() / 3600000 | 0)), f: 'side'});
  }
  if (items.length) beeSeq(items); else beeArt(stageArt());
}
// みちくさのカードで何か起きたとき（michikusa.js から）
window.tkOnChange = function (ev) {
  if (ev === 'reroll' || ev === 'dist') { const tl = beeTaskLine(); if (tl) beeSeq([tl]); return; }
  if (ev === 'done') {
    const ls = beeLs(), r = ls.react, items = [];
    if (r && r.d === dayKey()) { items.push(...reactItems(r)); delete ls.react; lsSet(K_BEE, ls); }
    items.push(...growItems(), ...tripItems());
    pageRender(); beeSeq(items); return;
  }
  if (ev === 'undo') { pageRender(); beeSeq([]); }
};

// ---------- ページ ----------
function pageRender() {
  const d = beeData(), ls = beeLs(), st = Math.min(stageOf(d.n), ls.stage || 0), sc = Math.min(sceneOf(d.n), ls.scene || 0);
  // 景色と段階は「見せた段階」まで（お辞儀のときに進む）
  $('bpBg').src = `img/${SCENES[sc][1]}.svg`;
  document.querySelector('.scene').dataset.part = dayPart();   // 版8：時間帯の色味
  const nx = STAGES.find(s => s[0] > d.n), nxs = SCENES.find(s => s[0] > d.n);
  $('bpStage').innerHTML = `<b>${STAGES[st][1]}</b><span class="sub">${SCENES[sc][2]}・${nx ? `あと ${nx[0] - d.n}回で「${nx[1]}」` : nxs ? `あと ${nxs[0] - d.n}回で、${nxs[2]}へ` : 'ずいぶん遠くまで来た'}</span>`;
  const fd = d.first ? d.first.slice(5).replace('-', '/').replace(/^0/, '') : '';
  $('bpStats').innerHTML = `<div><b>${d.n}</b><small>これまでのみちくさ${fd ? `<br>初めての日 ${fd}` : ''}</small></div><div><b>${d.month}</b><small>今月のみちくさ</small></div>`;
  const md = k => k.slice(5).replace('-', '/').replace(/^0/, '');
  // 1段目：持ち物（4つで「旅支度」が完成）
  const gotN = Object.keys(APPS).filter(k => d.items[k]).length;
  $('bpShelfN').textContent = `${gotN}／${Object.keys(APPS).length}`;
  $('bpShelf').innerHTML = Object.entries(APPS).map(([k, a]) => d.items[k]
    ? `<div class="got"><span class="e">${a.it}</span><span>${a.itn}</span><br><span class="sub">${a.nm}・${md(d.items[k])}</span></div>`
    : `<div class="no"><span class="e">${a.it}</span>？<br><span class="sub">${a.nm}のみちくさ</span></div>`).join('');
  // 旅支度の記念の1枚（4つそろって、お辞儀を見せたあと）
  const trip = $('bpTrip'); trip.hidden = !ls.trip;
  if (ls.trip) { $('bpTripTx').textContent = `${ls.trip.replace(/-/g, '/')}、持ち物が4つそろいました`; if (!trip.dataset.drawn) { trip.dataset.drawn = '1'; tripCard(d, ls.trip); } }
  // 2段目：みちくさ帳（達成したお題の種類）
  const kindsN = Object.keys(d.kinds).filter(id => TASK[id]).length;
  $('bpKindsN').textContent = `${kindsN}／${TASKS.length}`;
  $('bpKinds').innerHTML = TASKS.map(t => d.kinds[t.id]
    ? `<div class="got"><span class="e">${APPS[t.app].it}</span><span>${esc(KIND_NM[t.id] || t.id)}</span><br><span class="sub">${t.auto ? '自動' : 'できた'}・${md(d.kinds[t.id])}</span></div>`
    : `<div class="no"><span class="e">${APPS[t.app].it}</span>？<br><span class="sub">${APPS[t.app].nm}</span></div>`).join('');
  // 3段目：空の帳（数だけ。カードは TenMiru の空の図鑑〔次の版〕）
  const sk = skyBook();
  $('bpSkyN').textContent = `${sk.n}／${sk.total}`;
  $('bpSkyTx').textContent = `月 ${sk.moon}／${SKY_N.moon}・星座 ${sk.con}／${SKY_N.con}`;
  $('bpSky').textContent = IN_WALK ? 'TenMiru を開く（記録 → 空の図鑑）' : '空の図鑑を開く';
  const badges = Object.values(lsGet('walk_badges_v1', {}) || {}).filter(v => Array.isArray(v) && v.length).length;
  $('bpBadge').textContent = `🏅 Miru バッジ ${badges}／10`;
  if (!BEE.busy) beeArt(stageArt());
}
// ---------- 旅支度の記念の1枚（版6。canvas に描いて画像にする。長押しで保存、［保存・共有］で共有） ----------
async function tripCard(d, day) {
  const cv = document.createElement('canvas'), W = 1000, H = 640; cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  if (!g.roundRect) g.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };   // 古い Chrome 向け
  g.fillStyle = '#2f4c53'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fbf8ee'; g.beginPath(); g.roundRect(28, 28, W - 56, H - 56, 28); g.fill();
  const jp = 'system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif';
  g.fillStyle = '#2f4c53'; g.font = `bold 46px ${jp}`; g.textAlign = 'left'; g.fillText('旅支度、できた。', 70, 118);
  g.fillStyle = '#5f6d6a'; g.font = `24px ${jp}`; g.fillText(`${day.replace(/-/g, '/')}　これまでのみちくさ ${d.n}回`, 72, 160);
  const ks = Object.keys(APPS), bw = 150, x0 = 70;
  ks.forEach((k, i) => {
    const a = APPS[k], x = x0 + i * (bw + 22), y = 215;
    g.fillStyle = '#fff'; g.strokeStyle = '#d9cfae'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, bw, 190, 18); g.fill(); g.stroke();
    g.textAlign = 'center'; g.font = `80px ${jp}`; g.fillStyle = '#1f2b2a'; g.fillText(a.it, x + bw / 2, y + 100);
    g.font = `bold 24px ${jp}`; g.fillText(a.itn, x + bw / 2, y + 140);
    g.font = `18px ${jp}`; g.fillStyle = '#5f6d6a'; g.fillText(`${a.nm}・${(d.items[k] || '').slice(5).replace('-', '/').replace(/^0/, '')}`, x + bw / 2, y + 170);
  });
  g.textAlign = 'left'; g.fillStyle = '#5f6d6a'; g.font = `22px ${jp}`; g.fillText('ミルトコ・ミルビー', 72, H - 72);
  try {
    const im = new Image(); im.src = 'img/bee_bow.svg';
    await new Promise((ok, ng) => { im.onload = ok; im.onerror = ng; });
    const h = 250, w = im.naturalWidth && im.naturalHeight ? h * im.naturalWidth / im.naturalHeight : h;
    g.drawImage(im, W - 70 - w, H - 60 - h, w, h);
  } catch (e) {}
  const url = cv.toDataURL('image/png');
  const img = $('bpTripImg'); img.src = url; img.hidden = false;
  $('bpTripSave').onclick = () => cardSave(url, 'mirubee-tabijitaku.png', 'ミルビーの旅支度');
}
// 画像を保存・共有（共有できる端末は共有の画面、だめならダウンロード）
async function cardSave(url, fname, title) {
  try {
    const b = await (await fetch(url)).blob(), f = new File([b], fname, {type: 'image/png'});
    if (navigator.canShare && navigator.canShare({files: [f]})) { await navigator.share({files: [f], title}); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
}
// ---------- 月のふりかえりの1枚（版9） ----------
function monthShow(o) {
  const box = $('bpMonth'); box.hidden = false;
  $('bpMonthH').textContent = `${o.m}月のふりかえり`;
  $('bpMonthTx').textContent = o.any ? `${o.y}年${o.m}月に、4つのミルで見たもの・行った所` : `${o.y}年${o.m}月は、記録がありませんでした`;
  monthCard(o).catch(() => {});
  setTimeout(() => box.scrollIntoView({behavior: 'smooth', block: 'nearest'}), 100);
}
async function monthCard(o) {
  const cv = document.createElement('canvas'), W = 1000, H = 640; cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  if (!g.roundRect) g.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  g.fillStyle = '#2f4c53'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fbf8ee'; g.beginPath(); g.roundRect(28, 28, W - 56, H - 56, 28); g.fill();
  const jp = 'system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif';
  g.fillStyle = '#2f4c53'; g.font = `bold 44px ${jp}`; g.textAlign = 'left'; g.fillText(`${o.y}年${o.m}月の、みるとこ`, 70, 112);
  const km = v => (Math.round(v / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'km';
  const rows = [];
  if (o.walks) rows.push(['🚶', `歩いた ${km(o.dist)}（${o.walks}回）`, o.newRoad >= 100 ? `はじめての道 ${km(o.newRoad)}` : '']);
  if (o.st || o.places) rows.push(['🗾', `${o.st ? `駅 ${o.st}` : ''}${o.st && o.places ? '・' : ''}${o.places ? `場所 ${o.places}` : ''}`, '']);
  if (o.peaks || o.planes) rows.push(['🏔', `${o.peaks ? `山 ${o.peaks}座` : ''}${o.peaks && o.planes ? '　' : ''}${o.planes ? `✈️ 飛行機 ${o.planes}機` : ''}`, '']);
  if (o.moon || o.con) rows.push(['🌙', `${o.moon ? `月のカード ${o.moon}` : ''}${o.moon && o.con ? '・' : ''}${o.con ? `星座 ${o.con}` : ''}`, '']);
  if (o.mk) rows.push(['🌿', `みちくさ ${o.mk}回`, '']);
  if (o.days) rows.push(['📅', `出かけた日 ${o.days}日`, '']);
  if (!rows.length) rows.push(['', 'この月の記録はありません', '']);
  let y = 178;
  rows.slice(0, 6).forEach(([ic, a, b]) => {
    g.font = `34px ${jp}`; g.fillStyle = '#1f2b2a'; g.fillText(ic, 70, y);
    g.font = `bold 32px ${jp}`; g.fillText(a, 130, y); const aw = g.measureText(a).width;
    if (b) { g.font = `24px ${jp}`; g.fillStyle = '#5f6d6a'; g.fillText(b, 130 + aw + 24, y); }
    y += 56;
  });
  // ミルビーと一言
  const say = monthSay(o);
  g.font = `bold 28px ${jp}`; g.fillStyle = '#2f4c53';
  const sw = g.measureText(say).width + 44, sx = W - 70 - 200 - sw, sy = H - 60 - 96;   // 版10：ミルビーの左下（行は最大6行で y 458 まで。重ならない）
  g.fillStyle = '#fff'; g.strokeStyle = '#d9cfae'; g.lineWidth = 3; g.beginPath(); g.roundRect(sx, sy, sw, 58, 18); g.fill(); g.stroke();
  g.fillStyle = '#1f2b2a'; g.fillText(say, sx + 22, sy + 40);
  try {
    const im = new Image(); im.src = 'img/bee_side.svg';
    await new Promise((ok, ng) => { im.onload = ok; im.onerror = ng; });
    const h = 240, w = im.naturalWidth && im.naturalHeight ? h * im.naturalWidth / im.naturalHeight : h;
    g.drawImage(im, W - 70 - w, H - 60 - h, w, h);
  } catch (e) {}
  g.textAlign = 'left'; g.fillStyle = '#5f6d6a'; g.font = `22px ${jp}`; g.fillText('ミルトコ・ミルビー', 72, H - 50);
  const url = cv.toDataURL('image/png');
  const img = $('bpMonthImg'); img.src = url; img.hidden = false;
  $('bpMonthSave').onclick = () => cardSave(url, `mirutoko-${o.ym}.png`, `${o.m}月のふりかえり`);
}
window.miruThemeSet = t => { document.documentElement.classList.toggle('dark', !!(t && t.dark)); };
async function beeInit() {
  $('bpTop').hidden = IN_WALK;   // アプリの中では上の緑の帯で戻る
  $('bpTop').onclick = e => { e.preventDefault(); tkGo('top'); };
  $('bpSay').onclick = () => { if ($('bpSay').classList.contains('tap')) beeNext(); };
  $('bpArt').onclick = () => { if ($('bpSay').classList.contains('tap')) beeNext(); };
  $('bpNikki').onclick = () => tkGo('walk', 'nikki');
  $('bpSky').onclick = () => tkGo('sora', 'skyz');
  $('bpMonthBtn').onclick = () => { const o = monthStats(prevYm(), MK.ctx); monthShow(o); };
  $('bpMonthClose').onclick = () => { $('bpMonth').hidden = true; };   // 版7：Web では空の図鑑を直接開く（アプリの中では TenMiru → 記録 → 空の図鑑）
  $('bpVer').textContent = `ミルトコ 版${TOKO_V}`;
  pageRender(); mkRender();
  try { await mkRefresh(true); } catch (e) {}
  pageRender();
  beeOnOpen();
  // 朝4時を過ぎたら入れ替える（開いたままのとき）
  let day = dayKey();
  setInterval(() => { if (dayKey() !== day) { day = dayKey(); mkRefresh(true).then(pageRender); } const sc = document.querySelector('.scene'); if (sc && sc.dataset.part !== dayPart()) sc.dataset.part = dayPart(); }, 60000);
}
