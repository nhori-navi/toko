// navi.js：版2 初めて開いたときの使い方ナビ（ミルビーが案内する6コマ）
// ・ホームを少し暗くして、説明している所だけを明るく抜く。ミルビーと吹き出しは、抜いた所と反対側（上か下）に
// ・［次へ］［飛ばす］、スマホの「戻る」でも閉じる。最後まで見るか飛ばしたら toko_nav_v1 に印（次からは出ない）
// ・使い方の「使い方ナビをもう一度見る」から、また見られる
// ・終わったら、その日の最初の一言（お題の一言）を言う
const NAV_STEPS = [
  {sel: null, face: 'front', say: ['はじめまして。ハシビロコウのミルビーです。', 'ミルトコの案内をするね。']},
  {sel: '#mk', face: 'side', say: ['毎朝4時に、ひとつ「みちくさ」を出すよ。', '近所・散歩・遠出で、距離を選べるよ。']},
  {sel: '.mkFt', face: 'side', say: ['歩けば自動で判定するよ。', '［できた］のお題は、自分で押してね。']},
  {sel: '#apps', face: 'side', say: ['歩く・めぐる・空・山。4つのミルが入ってるよ。', '戻るときは、上の緑の帯から。']},
  {sel: '#recent', face: 'lookup', say: ['4つのミルで見つけたものは、ここに集まるよ。']},
  {sel: '#bee', face: 'joy', say: ['ミルビーを押すと、これまでの記録が見られるよ。'], bee: true}
];
Object.assign(NAVI, {on: false, i: 0, steps: []});
function navStart(again) {
  NAVI.steps = NAV_STEPS.filter(s => !s.bee || SET.bee);
  NAVI.on = true; NAVI.i = 0;
  let el = $('nav');
  if (!el) {
    el = document.createElement('div'); el.id = 'nav'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '使い方ナビ');
    el.innerHTML = '<div class="hole" id="navHole"></div><div class="pnl" id="navPnl"><img id="navImg" alt=""><div class="bx"><div class="sy" id="navSay"></div>' +
      '<div class="ft"><span class="dots" id="navDots"></span><button type="button" id="navSkip" class="mkSub">飛ばす</button><button type="button" id="navNext" class="mkBtn">次へ</button></div></div></div>';
    document.body.appendChild(el);
    $('navSkip').onclick = () => navEnd(false);
    $('navNext').onclick = () => { if (NAVI.i >= NAVI.steps.length - 1) navEnd(false); else navShow(NAVI.i + 1); };
    el.addEventListener('click', e => { if (e.target === el || e.target.id === 'navHole') $('navNext').click(); });
  }
  el.classList.add('on');
  try { if (history.state && (history.state.tkSheet || history.state.tkNav)) history.replaceState({tkNav: 1}, ''); else history.pushState({tkNav: 1}, ''); } catch (e) {}
  window.scrollTo(0, 0);
  navShow(0);
}
function navShow(i) {
  NAVI.i = i;
  const st = NAVI.steps[i], el = $('nav'), hole = $('navHole'), pnl = $('navPnl'), img = $('navImg');
  $('navSay').innerHTML = st.say.map(x => `<p>${esc(x)}</p>`).join('');
  $('navDots').innerHTML = NAVI.steps.map((s, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  $('navNext').textContent = i === NAVI.steps.length - 1 ? 'はじめる' : '次へ';
  img.src = st.face === 'front' ? BEE_IMG.front : beeCornerSrc(st.face);
  img.className = st.face === 'front' ? 'big' : '';
  const tg = st.sel && document.querySelector(st.sel);
  if (!tg) { hole.style.display = 'none'; el.classList.add('full'); pnl.className = 'pnl mid'; return; }
  el.classList.remove('full');
  tg.scrollIntoView({block: 'center'});
  const place = () => {
    const r = tg.getBoundingClientRect(), p = 6;
    Object.assign(hole.style, {display: 'block', left: (r.left - p) + 'px', top: (r.top - p) + 'px', width: (r.width + p * 2) + 'px', height: (r.height + p * 2) + 'px'});
    pnl.className = 'pnl ' + (r.top + r.height / 2 < innerHeight / 2 ? 'bot' : 'top');
  };
  place(); setTimeout(place, 120);
}
function navEnd(fromPop) {
  if (!NAVI.on) return;
  NAVI.on = false; lsSet(K_NAV, 1);
  const el = $('nav'); if (el) el.classList.remove('on');
  if (!fromPop && history.state && history.state.tkNav) { try { history.back(); } catch (e) {} }
  window.scrollTo(0, 0);
  setTimeout(() => { try { beeOnShow(); } catch (e) {} }, 300);
}
window.addEventListener('popstate', () => { if (NAVI.on && !(history.state && history.state.tkNav)) navEnd(true); });
window.addEventListener('resize', () => { if (NAVI.on) navShow(NAVI.i); });
