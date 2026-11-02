// kyou.js：HP の TOP（https://nhori-navi.github.io/）に足す部分（版3）。HP の index.html の最後で lib.js・michikusa.js のあとに読む
// ・ミルトコ（アプリ）の中で開いたとき（?inapp=1）は、毎日使う形に切り替える
//   はじめの絵（少し低く。絵の中の道・ピン・飛行機・山の名前を押すとそのミル）→ ミルビーの入口（きょうのお題）→ 4つのミル（そのミルの今を1行）
//   → 最近のみるとこ → ミルトコの設定 → 紹介の段（「ミルトコについて」にたたむ）
//   MichiMiru から呼ばれる：tokoShow（TOP が見えたとき）・tokoJudge（散歩を終えたとき）・tokoReload（控えを読み込んだあと）
// ・版4：アプリを初めて開いたときは、TOP の上でミルビーが自己紹介（「なんでハシビロコウ？」。1回だけ。toko_bee_v1.intro）
// ・版5：ホーム画面のアイコンから開いたとき（Web 版のミルトコ。IN_WEBAPP）も、アプリと同じ毎日使う形。ボタンは普通に移る
// ・ブラウザで開いたとき（Web）は何もしない（ミルビーの紹介の段は、版4 から HP の index.html に直接書いた）
// ・版6：ミルビーの入口に、自己申告のお題のときだけ［できた］（押すと記録してミルビーのページへ。反応はそこで）。自己紹介の6を「まずは『歩く』」に
const BEE_FACE = TOKO_BASE + 'img/bee_side.svg#svgView(viewBox(33.4,29,367.5,367.5))';
const KY = {ctx: null};
const HERO_GO = {michi: 'walk', megu: 'megu', ten: 'sora', yama: 'yama'};

function kyStyle() {
  const st = document.createElement('style');
  st.textContent =
    // アプリの中：はじめの絵を低く、「4つのアプリを見る」は出さない
    'html.toko-app .top-hero{height:min(58vh,540px);min-height:380px}html.toko-app .th-cta,html.toko-app .th-lead{display:none}' +   // 低くした分、説明の文は出さない（山と重なるため）
    
    'html.toko-app main.top-main>.tkAbout{margin:24px 0 8px}' +
    '#tkApp{padding-top:14px;padding-bottom:4px}' +
    '.tkBee{display:flex;align-items:center;gap:6px;width:100%;border:2px solid #d9cfae;background:#fbf8ee;border-radius:18px;padding:6px 8px 6px 6px;text-align:left;color:var(--text);position:relative;min-height:76px}' +
    '.tkBee .bm{display:flex;align-items:center;gap:10px;flex:1;min-width:0;border:0;background:transparent;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer;min-height:64px}' +
    '.tkBee .bok{flex:none;border:1px solid #3f6e74;background:#2f4c53;color:#fff;border-radius:12px;padding:8px 12px;min-height:42px;font:inherit;font-size:14px;font-weight:700;cursor:pointer}' +
    '.tkBee img{width:64px;height:64px;flex:none}.tkBee .tx{flex:1;min-width:0;line-height:1.45}.tkBee .tx b{display:block;font-size:13px;color:#2f4c53}.tkBee .tx span{display:block;font-size:16px;font-weight:700}' +
    '.tkBee .st{flex:none;font-size:13px;color:var(--sub)}.tkBee .st.ok{color:#2e7d4f;font-weight:700}.tkBee .dot{position:absolute;left:56px;top:8px;width:12px;height:12px;border-radius:6px;background:#e0533d;box-shadow:0 0 0 2px #fbf8ee}' +
    '.tkApps{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:12px}' +
    '.tkApp{position:relative;display:flex;align-items:center;gap:10px;border:0;border-left:6px solid var(--app);background:var(--card);border-radius:14px;padding:12px 10px;min-height:78px;text-align:left;box-shadow:0 1px 4px rgba(0,0,0,.08);color:var(--text);font:inherit;cursor:pointer}' +
    '.tkApp img{width:46px;height:46px;border-radius:12px;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.2)}.tkApp .tx{min-width:0;line-height:1.35}.tkApp b{display:block;font-size:18px}' +
    '.tkApp small{display:block;font-size:12px;color:var(--sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tkApp .it{position:absolute;right:6px;top:4px;font-size:17px;line-height:1}' +
    '.tkRec{display:none;width:100%;margin-top:10px;border:0;border-radius:12px;background:#1e7e34;color:#fff;padding:9px 12px;font:inherit;font-size:15px;font-weight:700;text-align:left;min-height:42px}.tkRec.on{display:block}.tkRec.veh{background:#55606a}' +
    '.tkRecent{margin-top:14px;background:var(--card);border-radius:14px;padding:10px 10px 4px;box-shadow:0 1px 4px rgba(0,0,0,.06)}.tkRecent h2{font-size:14px;margin:0 2px 4px;border:0;padding:0}' +
    '.tkRc{display:flex;align-items:center;gap:10px;width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;padding:9px 4px;text-align:left;min-height:44px;color:var(--text);font:inherit;cursor:pointer}.tkRc:last-child{border-bottom:0}' +
    '.tkRc .ic{font-size:20px;width:26px;text-align:center;flex:none}.tkRc .tx{flex:1;min-width:0;font-size:14px;line-height:1.4}.tkRc .dy{flex:none;font-size:12px;color:var(--sub)}.tkRc0{font-size:13px;color:var(--sub);padding:4px 4px 10px;line-height:1.6}' +
    '.tkSet,.tkAbout{margin-top:14px;background:var(--card);border-radius:14px;padding:4px 12px;box-shadow:0 1px 4px rgba(0,0,0,.06)}.tkSet summary,.tkAbout>summary{cursor:pointer;padding:10px 0;font-size:14px;font-weight:700;color:var(--sub)}' +
    '.tkAbout>summary{color:var(--text)}.tkAbout[open]{background:transparent;box-shadow:none;padding:0}.tkAbout[open]>summary{padding:10px 12px;background:var(--card);border-radius:14px}' +
    '.tsw{display:flex;align-items:center;gap:10px;min-height:48px;cursor:pointer;font-size:15px}.tsw span{flex:1;line-height:1.4}.tsw small{display:block;font-size:12px;color:var(--sub)}' +
    '.tsw input{appearance:none;-webkit-appearance:none;flex:0 0 52px;width:52px;height:30px;margin:0;border-radius:15px;background:#c9d3cd;position:relative;transition:background .15s;cursor:pointer}' +
    '.tsw input::after{content:"";position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s}.tsw input:checked{background:#3f6e74}.tsw input:checked::after{left:25px}' +
    '.tkSet .lnk{border:1px solid #3f6e74;background:transparent;color:inherit;border-radius:12px;padding:6px 12px;min-height:38px;font:inherit;font-size:14px;margin:4px 0 8px}.tkSet .sub{font-size:12px;color:var(--sub);padding-bottom:10px}' +
    '@media (prefers-color-scheme: dark){.tkBee{background:#2a3230;border-color:#4d5a4f}.tkBee .tx b{color:#9cc7c6}.tkBee .st.ok{color:#8fd4a8}.tkBee .dot{box-shadow:0 0 0 2px #2a3230}.tkBee .bok{background:#7fb0b0;color:#14201f;border-color:#7fb0b0}}' +
    // 初めて開いたときのミルビーの自己紹介
    '#tkHello{position:fixed;inset:0;z-index:50;background:rgba(10,20,20,.6);display:none}#tkHello.on{display:block}' +
    '#tkHello .hb{position:absolute;right:max(10px,4vw);bottom:max(14px,env(safe-area-inset-bottom));height:min(44vh,360px);max-width:46vw;object-fit:contain;object-position:right bottom;cursor:pointer}' +
    '#tkHello .hs{position:absolute;left:14px;right:14px;bottom:calc(min(44vh,360px) + 14px);max-width:520px;margin-left:auto;background:#fffdf4;color:#1f2b2a;border:2px solid #d9cfae;border-radius:16px;padding:12px 14px;font-size:17px;line-height:1.55;box-shadow:0 4px 16px rgba(0,0,0,.3);cursor:pointer}' +
    '#tkHello .hs::after{content:"";position:absolute;right:min(18vw,90px);bottom:-18px;border:9px solid transparent;border-top-color:#d9cfae}' +
    '#tkHello .hs .nx{display:block;text-align:right;font-size:12px;color:#5f6d6a;margin-top:4px}' +
    '#tkHello .hk{position:absolute;right:14px;top:max(14px,env(safe-area-inset-top));border:1px solid rgba(255,255,255,.6);background:rgba(255,255,255,.18);color:#fff;border-radius:999px;padding:6px 16px;font:inherit;font-size:14px;min-height:38px}' +
    '#tkHello .dots{position:absolute;left:16px;bottom:calc(min(44vh,360px) - 8px);display:flex;gap:6px}#tkHello .dots i{width:8px;height:8px;border-radius:4px;background:rgba(255,255,255,.45)}#tkHello .dots i.on{background:#fff}' +
    '@keyframes tkGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,196,64,0)}50%{box-shadow:0 0 0 6px rgba(255,196,64,.7)}}.tkBee.glow{animation:tkGlow 1s ease-in-out 3}';
  document.head.appendChild(st);
}

// ---------- アプリの中の TOP ----------
function kyBuild() {
  document.documentElement.classList.add('toko-app');
  const hero = $('hero'); if (!hero) return;
  const sec = document.createElement('section'); sec.id = 'tkApp'; sec.className = 'wrap';
  sec.innerHTML = '<div class="tkBee" id="tkBee"></div><div class="tkApps" id="tkApps"></div><button class="tkRec" type="button" id="tkRec"></button>' +
    '<div class="tkRecent" id="tkRecent"></div><details class="tkSet" id="tkSet"><summary>⚙ ミルトコの設定</summary><div id="tkSetIn"></div></details>';
  hero.after(sec);
  // 紹介の段は「ミルトコについて」にたたむ（毎日見るには長いので）
  const main = document.querySelector('main.top-main');
  if (main) {
    const d = document.createElement('details'); d.className = 'tkAbout';
    d.innerHTML = '<summary>ミルトコについて（紹介を読む）</summary>';
    while (main.firstChild) d.appendChild(main.firstChild);
    main.appendChild(d);
  }
  // はじめの絵の道・ピン・飛行機・山の名前：そのミルを開く
  hero.addEventListener('click', e => {
    const h = e.target.closest && e.target.closest('.hot'); if (!h || !HERO_GO[h.dataset.go]) return;
    e.stopPropagation(); e.preventDefault(); tkGo(HERO_GO[h.dataset.go]);
  }, true);
  $('tkBee').addEventListener('click', e => {
    if (e.target.closest('.bok')) { if (mkSelfDone()) tkGo('bee'); return; }   // 版6：［できた］→ 記録してミルビーのページへ（反応はそこで）
    tkGo('bee');
  });
  $('tkApps').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) tkGo(b.dataset.app); });
  $('tkRecent').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (b) tkGo(b.dataset.app); });
  $('tkRec').onclick = () => tkGo('walk');
  $('tkSet').addEventListener('toggle', kySet);
  // シリーズ名：アプリの中では「ミルトコ」（site.js が書いたあとに）
  document.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('.series').forEach(e => { e.textContent = 'ミルトコ'; }); document.title = 'ミルトコ'; });
  kyRender();
  setInterval(kyRec, 5000);
}
function kyRender() {
  const c = KY.ctx, info = infoLines(c), d = beeData();
  // ミルビーの入口
  const rec = dayRec(), q = rec && rec.q && rec.q[SET.dist], t = q && TASK[q.id], done = rec && rec.done;
  const title = done && TASK[done.id] ? TASK[done.id].t(done.v) : t ? t.t(q.v) : '毎朝ひとつ、寄り道のお題';
  const selfOk = !done && t && !t.auto;   // 版6：自己申告のお題のときだけ［できた］
  $('tkBee').innerHTML = `<button class="bm" type="button" aria-label="ミルビーのページを開く"><img src="${BEE_FACE}" alt=""><span class="tx"><b>🐦 ミルビーのみちくさ</b><span>${esc(title)}</span></span>` +
    `<span class="st${done ? ' ok' : ''}">${done ? '✓ 達成' : selfOk ? '' : '›'}</span></button>` + (selfOk ? '<button class="bok" type="button">できた</button>' : '') + (beeNews() ? '<span class="dot"></span>' : '');
  // 4つのミル
  $('tkApps').innerHTML = Object.entries(APPS).map(([k, a]) =>
    `<button class="tkApp ${a.cls}" type="button" data-app="${k}" title="${a.ap}"><img src="${a.img}" alt="" onerror="this.style.visibility='hidden'"><span class="tx"><b>${a.nm}</b><small>${esc(info[k] || a.d0)}</small></span>` +
    (d.items[k] ? `<span class="it" title="ミルビーの${a.itn}">${a.it}</span>` : '') + '</button>').join('');
  // 最近のみるとこ
  const it = recentItems(c);
  $('tkRecent').innerHTML = '<h2>📍 最近のみるとこ</h2>' + (it.length
    ? it.map(x => `<button class="tkRc" type="button" data-app="${x.app}"><span class="ic">${x.ic}</span><span class="tx">${esc(x.tx)}</span><span class="dy">${relDay(x.t)}</span></button>`).join('')
    : '<div class="tkRc0">4つのミルで見つけたもの・行った所が、ここに集まります</div>');
  kyRec();
}
function kyRec() {
  const p = P(), b = $('tkRec'); if (!p || !b) return;
  let s = null; try { s = p.tokoState(); } catch (e) {}
  const on = !!(s && s.rec);
  b.classList.toggle('on', on); b.classList.toggle('veh', !!(s && s.veh));
  if (on) b.textContent = s.txt || '● 記録中';
}
function kySet() {
  const el = $('tkSetIn'); if (!el || !$('tkSet').open) return;
  const p = P(); let st = null; try { st = p && p.tokoState(); } catch (e) {}
  el.innerHTML = (IN_WALK ? swHtml('tkResume', '前回のアプリから始める', 'ミルトコを開いたとき、前に使っていたアプリから始めます', SET.resume) : '<div class="sub" style="padding-top:4px">Web 版（ホーム画面から開いたとき）です。iPhone では、画面を消すと MichiMiru の記録が止まります。</div>') +
    (st && st.trial ? '<div class="sub">いまは MichiMiru の「ミルトコのホーム（ためし）」で開いています。</div><button class="lnk" type="button" id="tkOff">ためしをやめて MichiMiru に戻る</button>' : '') +
    `<div class="sub">ミルトコ 版${TOKO_V}${st && st.ver ? `・MichiMiru 版${st.ver}` : ''}。暗い画面はスマホの設定に合わせます</div>`;
  const rs = $('tkResume'); if (rs) rs.onchange = e => { SET.resume = e.target.checked; saveSet(); };
  const o = $('tkOff'); if (o) o.onclick = () => { try { P().tokoOff(); } catch (e) {} };
}
// ---------- 初めて開いたときのミルビーの自己紹介（1回だけ） ----------
const HELLO = [['はじめまして。ハシビロコウのミルビーです。', 'front'], ['なんでハシビロコウなんだ？って思ったでしょ。', 'side'],
  ['……作った人が、アンバランスな感じが好きなんだって。', 'front'], ['ほんとは、何時間でも動かないで立ってる鳥なんだけどね。', 'lookup'],
  ['ここでは毎朝ひとつ、「みちくさ」のお題を出すよ。', 'side'], ['お題は、このカードから。まずは『歩く』を開いて、一度歩いてみて。', 'joy']];
const HL = {i: 0, on: false};
function kyHello() {
  if (HL.on) return;
  let el = $('tkHello');
  if (!el) {
    el = document.createElement('div'); el.id = 'tkHello'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'ミルビーの自己紹介');
    el.innerHTML = '<button class="hk" type="button" id="hlSkip">飛ばす</button><div class="dots" id="hlDots"></div><div class="hs" id="hlSay"></div><img class="hb" id="hlImg" alt="ミルビー">';
    document.body.appendChild(el);
    $('hlSkip').onclick = e => { e.stopPropagation(); kyHelloEnd(false); };
    el.addEventListener('click', () => { if (HL.i >= HELLO.length - 1) kyHelloEnd(false); else kyHelloShow(HL.i + 1); });
  }
  HL.on = true; el.classList.add('on');
  try { history.pushState({tkHello: 1}, ''); } catch (e) {}
  kyHelloShow(0);
}
function kyHelloShow(i) {
  HL.i = i;
  const [t, f] = HELLO[i];
  $('hlSay').innerHTML = esc(t) + `<span class="nx">${i === HELLO.length - 1 ? 'はじめる ▶' : '▶'}</span>`;
  $('hlImg').src = TOKO_BASE + 'img/bee_' + f + '.svg';
  $('hlDots').innerHTML = HELLO.map((x, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
}
function kyHelloEnd(fromPop) {
  if (!HL.on) return;
  HL.on = false; $('tkHello').classList.remove('on');
  const l = beeLs(); l.intro = 1; lsSet(K_BEE, l);   // ミルビーのページの自己紹介も、もう出さない
  if (!fromPop && history.state && history.state.tkHello) { try { history.back(); } catch (e) {} }
  const b = $('tkBee'); if (b) { b.scrollIntoView({block: 'center', behavior: 'smooth'}); b.classList.remove('glow'); void b.offsetWidth; b.classList.add('glow'); setTimeout(() => b.classList.remove('glow'), 3200); }
}
window.addEventListener('popstate', () => { if (HL.on && !(history.state && history.state.tkHello)) kyHelloEnd(true); });

// MichiMiru から呼ばれるもの
window.tokoShow = async function () {
  try { KY.ctx = await mkCtx(true); await mkRefresh(false); KY.ctx = MK.ctx; } catch (e) {}
  kyRender();
};
window.tokoJudge = async function (reason) {
  const r = await mkJudge(reason || 'walk');
  KY.ctx = MK.ctx; kyRender();
  return r;
};
window.tokoReload = function () { Object.assign(SET, {dist: 'walk', resume: false}, lsGet(K_SET, {})); beeSync(); kyRender(); };
window.tkOnChange = () => kyRender();

kyStyle();
if (IN_WALK || IN_WEBAPP) {
  kyBuild(); window.tokoShow(); setTimeout(() => { if (!beeLs().intro) kyHello(); }, 700);
  // Web 版：ほかのミルから戻ってきたとき（ページが残っていたとき）・画面に戻ったときに描き直す
  if (IN_WEBAPP) {
    window.addEventListener('pageshow', e => { if (e.persisted) window.tokoShow(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') window.tokoShow(); });
  }
}
