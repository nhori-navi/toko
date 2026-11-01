// bee.js：ミルビーのページ（版3。ミルビーの家＝特別ページ）
// ・ミルトコ（アプリ）では HP の TOP の上に重ねて開く（MichiMiru の「重ねて開く」。上の緑の帯で TOP に戻る）。Chrome では普通のページ
// ・上にミルビーの景色（今の段階の絵と背景）、その下にきょうのみちくさのカード、これまでの回数・持ち物・Miru バッジ
// ・ミルビーが話すのはこのページの中だけ。話し方はやさしい相棒（「……」と命令はなし）
//   初めて開いたとき：自己紹介（6つの吹き出し。押すと次へ。アプリでは TOP で済ませる）／達成のあと：達成の一言（初めては驚いて揺れる）／
//   成長したとき：お辞儀して「ちょっと遠くまで来たね。」／その日に初めて開いたとき：お題の一言／2回目から：あいさつ／夜22時〜朝4時：眠い顔で、あいさつはしない
const BEE_IMG = {front: 'img/bee_front.svg', side: 'img/bee_side.svg', joy: 'img/bee_joy.svg', surprised: 'img/bee_surprised.svg',
  lookup: 'img/bee_lookup.svg', sleepy: 'img/bee_sleepy.svg', bow: 'img/bee_bow.svg'};
const BEE = {sayT: 0, q: [], busy: false};
const isNight = (t = Date.now()) => { const h = new Date(t).getHours(); return h >= 22 || h < 4; };
const pickBy = (arr, s) => arr[hash(s) % arr.length];
// 自己紹介（アプリでは TOP で先に済ませるので、ここで出るのは Web で初めて開いたときなど）
const INTRO = [['はじめまして。ハシビロコウのミルビーです。', 'front'], ['なんでハシビロコウなんだ？って思ったでしょ。', 'side'],
  ['……作った人が、アンバランスな感じが好きなんだって。', 'front'], ['ほんとは、何時間でも動かないで立ってる鳥なんだけどね。', 'lookup'],
  ['ここでは毎朝ひとつ、「みちくさ」のお題を出すよ。', 'side'], ['できたら、ここで教えてね。', 'joy']];

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
  if (!it.tap) BEE.sayT = setTimeout(beeNext, it.t ? (it.ms || 4500) : 0);
}
function beeTaskLine() {
  const rec = dayRec(), q = rec && rec.q && rec.q[SET.dist], t = q && TASK[q.id];
  return t && !(rec && rec.done) ? {t: t.say, f: t.bee || 'side'} : null;
}
function reactItems(r) {
  const d = beeData();
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
  items.push(...growItems());
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
    items.push(...growItems());
    pageRender(); beeSeq(items); return;
  }
  if (ev === 'undo') { pageRender(); beeSeq([]); }
};

// ---------- ページ ----------
function pageRender() {
  const d = beeData(), ls = beeLs(), st = Math.min(stageOf(d.n), ls.stage || 0), sc = Math.min(sceneOf(d.n), ls.scene || 0);
  // 景色と段階は「見せた段階」まで（お辞儀のときに進む）
  $('bpBg').src = `img/${SCENES[sc][1]}.svg`;
  const nx = STAGES.find(s => s[0] > d.n), nxs = SCENES.find(s => s[0] > d.n);
  $('bpStage').innerHTML = `<b>${STAGES[st][1]}</b><span class="sub">${SCENES[sc][2]}・${nx ? `あと ${nx[0] - d.n}回で「${nx[1]}」` : nxs ? `あと ${nxs[0] - d.n}回で、${nxs[2]}へ` : 'ずいぶん遠くまで来た'}</span>`;
  const fd = d.first ? d.first.slice(5).replace('-', '/').replace(/^0/, '') : '';
  $('bpStats').innerHTML = `<div><b>${d.n}</b><small>これまでのみちくさ${fd ? `<br>初めての日 ${fd}` : ''}</small></div><div><b>${d.month}</b><small>今月のみちくさ</small></div>`;
  $('bpShelf').innerHTML = Object.entries(APPS).map(([k, a]) => d.items[k]
    ? `<div class="got"><span class="e">${a.it}</span><span>${a.itn}</span><br><span class="sub">${a.nm}・${d.items[k].slice(5).replace('-', '/').replace(/^0/, '')}</span></div>`
    : `<div class="no"><span class="e">${a.it}</span>？<br><span class="sub">${a.nm}のみちくさ</span></div>`).join('');
  const badges = Object.values(lsGet('walk_badges_v1', {}) || {}).filter(v => Array.isArray(v) && v.length).length;
  $('bpBadge').textContent = `🏅 Miru バッジ ${badges}／10`;
  if (!BEE.busy) beeArt(stageArt());
}
window.miruThemeSet = t => { document.documentElement.classList.toggle('dark', !!(t && t.dark)); };
async function beeInit() {
  $('bpTop').hidden = IN_WALK;   // アプリの中では上の緑の帯で戻る
  $('bpTop').onclick = e => { e.preventDefault(); tkGo('top'); };
  $('bpSay').onclick = () => { if ($('bpSay').classList.contains('tap')) beeNext(); };
  $('bpArt').onclick = () => { if ($('bpSay').classList.contains('tap')) beeNext(); };
  $('bpNikki').onclick = () => tkGo('walk', 'nikki');
  $('bpVer').textContent = `ミルトコ 版${TOKO_V}`;
  pageRender(); mkRender();
  try { await mkRefresh(true); } catch (e) {}
  pageRender();
  beeOnOpen();
  // 朝4時を過ぎたら入れ替える（開いたままのとき）
  let day = dayKey();
  setInterval(() => { if (dayKey() !== day) { day = dayKey(); mkRefresh(true).then(pageRender); } }, 60000);
}
