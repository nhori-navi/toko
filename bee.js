// bee.js：ミルビー（みちくさのカードの右上の顔・一言・ミルビーのページ・成長）
// ・版2：カードの右上の角からのぞく（前は右下の隅）。話し方はやさしい相棒（「……」と命令はやめた）
// ・話すのは、アプリを開いたとき・みちくさを出すとき・達成したとき（ホームに戻ったとき）だけ。1回開くごとに一言まで
// ・達成したときは達成の一言だけ。成長は赤い点で知らせ、ミルビーのページでお辞儀をして「ちょっと遠くまで来たね。」
// ・顔は横向き。表情ごとに切り抜く枠（viewBox）をそろえてあるので、切り替えても頭が跳ねない
// ・成長を進めるのは、みちくさを達成した回数だけ（1・5・15・30回で段階、30回から先は50・100回で背景が広がる）
// ・連続日数には触れない。できなかった日も何も言わない
const BEE_IMG = {front: 'img/bee_front.svg', side: 'img/bee_side.svg', joy: 'img/bee_joy.svg', surprised: 'img/bee_surprised.svg',
  lookup: 'img/bee_lookup.svg', sleepy: 'img/bee_sleepy.svg', bow: 'img/bee_bow.svg'};
// 隅の顔の切り抜き（元の絵の座標）
const BEE_VB = {side: '33.4,29,367.5,367.5', joy: '1035.4,28.6,217,217', surprised: '453.3,46.2,201.2,201.2', lookup: '746.6,354.3,190.8,190.8', sleepy: '1053.2,430.2,189.4,189.4'};
const beeCornerSrc = k => BEE_IMG[k] + '#svgView(viewBox(' + (BEE_VB[k] || BEE_VB.side) + '))';
const STAGES = [[0, 'じっと立つ', 'front'], [1, '首をかしげる', 'side'], [5, '一歩踏み出す', 'joy'], [15, '見上げる・見渡す', 'lookup'], [30, '旅に出る', 'side']];
const SCENES = [[0, 'bg1', '湿地'], [5, 'bg2', '草原'], [30, 'bg3', '街'], [50, 'bg4', '山'], [100, 'bg5', '空']];
const stageOf = n => STAGES.reduce((a, s, i) => (n >= s[0] ? i : a), 0);
const sceneOf = n => SCENES.reduce((a, s, i) => (n >= s[0] ? i : a), 0);
const BEE = {opened: false, sayT: 0, imgT: 0};
const NAVI = window.NAVI || (window.NAVI = {on: false});   // 使い方ナビ（navi.js）が出ている間は話さない
const beeLs = () => Object.assign({stage: 0, scene: 0}, lsGet(K_BEE, {}));

// 達成の記録から数え直す（控えを読み込んでも、取り消しても合う）
function beeData() {
  const a = daysAll(), out = {n: 0, first: '', items: {}, kinds: {}, month: 0};
  const mon = dayKey().slice(0, 7);
  Object.keys(a).sort().forEach(k => {
    const d = a[k] && a[k].done; if (!d || !TASK[d.id]) return;
    out.n++; if (!out.first) out.first = k;
    const app = TASK[d.id].app;
    if (!out.items[app]) out.items[app] = k;
    if (!out.kinds[d.id]) out.kinds[d.id] = k;
    if (k.slice(0, 7) === mon) out.month++;
  });
  return out;
}
function beeSync() {
  const d = beeData(), b = beeLs();
  Object.assign(b, {n: d.n, first: d.first, items: d.items, kinds: d.kinds});
  lsSet(K_BEE, b);
  return d;
}
function beeReact(r) { const b = beeLs(); b.react = r; lsSet(K_BEE, b); }
function beeUnreact(k) { const b = beeLs(); if (b.react && b.react.d === k) { delete b.react; lsSet(K_BEE, b); } }
const isNight = (t = Date.now()) => { const h = new Date(t).getHours(); return h >= 22 || h < 4; };
const pickBy = (arr, s) => arr[hash(s) % arr.length];

// ---------- 隅の顔 ----------
function beeFace(k) { const im = $('beeImg'); if (im && im.dataset.k !== k) { im.dataset.k = k; im.src = beeCornerSrc(k); } }
function beeCorner() {
  const b = $('bee'); if (!b) return;
  b.classList.toggle('off', !SET.bee); document.body.classList.toggle('nobee', !SET.bee);
  const ls = beeLs(), d = beeData();
  b.classList.toggle('new', stageOf(d.n) > (ls.stage || 0) || sceneOf(d.n) > (ls.scene || 0));
  if (!$('beeImg').dataset.k) beeFace(isNight() ? 'sleepy' : 'side');
}
function beeSay(text, face, opt) {
  opt = opt || {};
  if (!SET.bee) return;
  clearTimeout(BEE.sayT); clearTimeout(BEE.imgT);
  if (face) beeFace(face);
  const s = $('say');
  if (text) { s.textContent = text; s.classList.add('on'); BEE.sayT = setTimeout(() => s.classList.remove('on'), opt.ms || 6000); }
  else s.classList.remove('on');
  const b = $('bee');
  if (opt.shake) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 1100); }
  BEE.imgT = setTimeout(() => beeFace(isNight() ? 'sleepy' : 'side'), (opt.ms || 6000) + 1500);
}
function beeTaskLine() {
  const rec = dayRec(), q = rec && rec.q && rec.q[SET.dist], t = q && TASK[q.id];
  return t ? {text: t.say, face: t.bee || 'side'} : null;
}
function beeSayTask() { const l = beeTaskLine(); if (l && !(dayRec() || {}).done) beeSay(l.text, l.face); }
// ホームが見えたとき
function beeOnShow() {
  beeCorner();
  const ls = beeLs(), r = ls.react;
  if (r && r.d === dayKey()) {
    delete ls.react; lsSet(K_BEE, ls); BEE.opened = true;
    if (!SET.bee) return;
    const d = beeData();
    if (r.k === 'first') { beeSay((dayRec() || {}).done && dayRec().done.f ? 'わっ、初めてだ！' : 'これは初めてだね！', 'surprised', {shake: true}); return; }
    if (r.k === 'self') { beeSay('おつかれさま。', 'joy'); return; }
    beeSay(pickBy(['やったね。', 'いいね！', 'おみごと！'], dayKey() + d.n), 'joy');
    return;
  }
  if (r && r.d !== dayKey()) { delete ls.react; lsSet(K_BEE, ls); }
  if (BEE.opened) return;   // 一言は、開いたときに1回だけ
  BEE.opened = true;
  if (!SET.bee) return;
  if (isNight()) { beeFace('sleepy'); return; }   // 夜遅くは眠い顔で、何も言わない
  const k = dayKey();
  if (ls.greet !== k) {   // その日に初めて開いたとき：みちくさを出す
    ls.greet = k; lsSet(K_BEE, ls);
    const l = beeTaskLine(), done = (dayRec() || {}).done;
    if (l && !done) { beeSay(l.text, l.face); return; }
  }
  // 2回目からは短いあいさつ（久しぶりのときも責めない）
  const days = Object.keys(lsGet('walk_days_v1', {}) || {}).sort(), last = days[days.length - 1];
  const long = last && (new Date(k + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5 >= 7;
  beeSay(long ? 'ひさしぶり。待ってたよ。' : pickBy(['おかえり。', '今日はどこ行く？', 'いい一日になるといいね。', 'おかえり。何か見つけた？'], k + String(Date.now() / 3600000 | 0)), 'side');
}

// ---------- ミルビーのページ ----------
function beePageOpen() {
  const d = beeData(), ls = beeLs(), st = stageOf(d.n), sc = sceneOf(d.n);
  const grew = st > (ls.stage || 0) || sc > (ls.scene || 0);
  const nx = STAGES.find(s => s[0] > d.n), nxs = SCENES.find(s => s[0] > d.n);
  const next = nx ? `あと ${nx[0] - d.n}回で「${nx[1]}」` : nxs ? `あと ${nxs[0] - d.n}回で、${nxs[2]}へ` : 'ずいぶん遠くまで来た';
  const badges = Object.values(lsGet('walk_badges_v1', {}) || {}).filter(v => Array.isArray(v) && v.length).length;
  const fd = d.first ? d.first.slice(5).replace('-', '/').replace(/^0/, '') : '';
  const art = grew ? 'bow' : STAGES[st][2];
  const shelf = Object.entries(APPS).map(([k, a]) => d.items[k]
    ? `<div class="got"><span class="e">${a.it}</span><span>${a.itn}</span><br><span class="sub">${a.nm}・${d.items[k].slice(5).replace('-', '/').replace(/^0/, '')}</span></div>`
    : `<div class="no"><span class="e">${a.it}</span>？<br><span class="sub">${a.nm}のみちくさ</span></div>`).join('');
  shOpen('bee', 'ミルビー',
    `<div class="scene"><img class="bg" src="img/${SCENES[sc][1]}.svg" alt=""><img class="bd${!grew && st === 1 ? ' tilt' : ''}" id="bpArt" src="${BEE_IMG[art]}" alt="ミルビー">` +
    (grew ? '<div class="say2" id="bpSay">ちょっと遠くまで来たね。</div>' : '') + '</div>' +
    `<div class="stg"><b>${STAGES[st][1]}</b><span class="sub">${SCENES[sc][2]}・${next}</span></div>` +
    `<div class="stats"><div><b>${d.n}</b><small>これまでのみちくさ${fd ? `<br>初めての日 ${fd}` : ''}</small></div><div><b>${d.month}</b><small>今月のみちくさ</small></div></div>` +
    `<div class="box"><h3>持ち物</h3><div class="sub">それぞれのミルのみちくさを初めて達成すると、ミルビーが持ち物をもらいます</div><div class="shelf">${shelf}</div></div>` +
    `<div class="box"><h3>🏅 Miru バッジ ${badges}／10</h3><div class="sub">MichiMiru の散歩日記の、いちばん下にあります</div><button class="lnk" type="button" id="bpNikki" style="margin-top:6px">散歩日記を見る</button></div>` +
    '<div class="box">' + swHtml('bpOff', 'ミルビーを出さない', 'みちくさのカードの横のミルビーを隠します', !SET.bee) + '</div>',
    () => {
      $('bpNikki').onclick = () => { shClose(false); setTimeout(() => tkGo('walk', 'nikki'), 50); };
      $('bpOff').onchange = e => { SET.bee = !e.target.checked; saveSet(); beeCorner(); };
      if (grew) {
        ls.stage = st; ls.scene = sc; lsSet(K_BEE, ls); beeCorner();
        setTimeout(() => { const a = $('bpArt'), s = $('bpSay'); if (!a) return; a.src = BEE_IMG[STAGES[st][2]]; a.classList.toggle('tilt', st === 1); if (s) s.remove(); }, 3500);
      }
    });
}
(function () { const b = $('bee'); if (b) b.onclick = beePageOpen; })();
