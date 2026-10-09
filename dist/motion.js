export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => 1 - (1 - clamp(t)) ** 4;
const mix = (a, b, t) => Object.fromEntries(Object.keys(a).map(key => [key, lerp(a[key], b[key], t)]));

// The reference's opening: spread → gather → travel → diagonal cascade.
export function heroPose(index, seconds, width, height, mobile = false) {
  const offset = index - 2.5;
  const spread = { x: width * .5 + offset * Math.min(mobile ? 39 : 86, width * .07), y: height * (mobile ? .56 : .54) + Math.abs(offset) * 11, r: offset * 6, rx: 0, ry: offset * -2, s: mobile ? .82 : .86, a: 1 };
  const stack = { x: width * .5 + offset * 3, y: height * (mobile ? .58 : .57) + offset * 2, r: offset * .4, rx: 0, ry: 0, s: .87, a: 1 };
  const travel = { ...stack, x: width * (mobile ? .5 : .73) + offset * 3, y: height * (mobile ? .66 : .60) + offset * 2 };
  const diagonal = mobile
    ? { x: width * .5 + offset * 52, y: height * .70 + index * 15, r: -6 + index * 2, rx: 0, ry: 0, s: 1, a: 1 }
    : { x: width * (.53 + index * .092), y: height * .53 + index * Math.min(35, height * .045), r: 0, rx: 0, ry: 0, s: 1, a: 1 };
  let pose = mix(spread, stack, smoothstep(.22, .78, seconds));
  pose = mix(pose, travel, smoothstep(.68, 1.2, seconds));
  return mix(pose, diagonal, ease((seconds - 1.04 - index * .025) / 1.22));
}

// Six cards enter from depth, turn as a stack, spread, and resolve into 3 × 2.
export function cardPose(index, progress, width, height, cardWidth, cardHeight, mobile = false) {
  const offset = index - 2.5;
  const arrive = smoothstep(.01, .16, progress);
  const turn = smoothstep(.18, .34, progress);
  const fan = smoothstep(.36 + index * .009, .66 + index * .009, progress);
  const grid = smoothstep(.72 - index * .008, .96 - index * .008, progress);
  const stacked = { x: width * .5 + offset * lerp(3, 10, turn), y: height * (mobile ? .61 : .51) + offset * lerp(-7, -2, turn), r: lerp(0, offset * -5.6, turn), rx: lerp(9, -4, turn), ry: lerp(-12, 11, turn), s: lerp(.18, mobile ? 1.17 : 1.05, arrive), a: arrive };
  const diagonal = mobile
    ? { x: width * (.12 + index * .152), y: height * (.48 + index * .038), r: [-8, -5, -2, 2, 5, 8][index], rx: 0, ry: 0, s: .85, a: 1 }
    : { x: width * (.12 + index * .154), y: height * (.24 + index * .105), r: 0, rx: 0, ry: 0, s: 1, a: 1 };
  const gap = mobile ? 10 : 18;
  const cx = width * (mobile ? .5 : .742);
  const cy = height * (mobile ? .665 : .52);
  const ordered = { x: cx + (index % 3 - 1) * (cardWidth + gap), y: cy + (Math.floor(index / 3) - .5) * (cardHeight + gap), r: 0, rx: 0, ry: 0, s: 1, a: 1 };
  return mix(mix(stacked, diagonal, fan), ordered, grid);
}

export function initMotion() {
  const body = document.body;
  const systemReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 699px)');
  let customReduce = false;
  try { customReduce = localStorage.getItem('steps-reduced-motion') === 'true'; } catch {}
  const reduced = () => customReduce || systemReduce.matches;
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const reduceButton = q('#reduce-motion');
  const stage = q('.journey-sticky'), section = q('.journey-scroll');
  const cards = all('.orbit-card'), intro = q('.journey-intro'), resolved = q('.journey-resolved');
  const words = all('.reading-word'), labels = all('.orbit-label');
  const hero = q('.hero-inner'), heroCards = all('.hero-card'), opening = q('.hero-opening');
  const heroCopy = q('.hero-copy'), heroDeck = q('.hero-deck');
  const story = q('.review-theatre');
  const review = q('.review-card'), backs = all('.review-back');
  const progressBar = q('.page-progress'), timeline = all('.journey-timeline i');
  const openingButton = q('#intro-replay');
  let frame = 0, lastTime = 0, metrics = null, targetY = scrollY, currentY = scrollY;
  let openingStart = performance.now(), openingDone = scrollY > 100, openingAnimations = [];
  // live.css reveals the hero on its own 3.2s after load if the scripts are slow; arriving
  // after that, don't replay the intro over a page that's already showing.
  const arrivedLate = performance.now() > 3200;
  let revealed = new WeakSet(), observer;
  let sections = [];
  const top = el => el.getBoundingClientRect().top + scrollY;
  const transformPose = (p, cw, ch) => `translate3d(${(p.x - cw / 2).toFixed(3)}px,${(p.y - ch / 2).toFixed(3)}px,0) rotateX(${p.rx.toFixed(3)}deg) rotateY(${p.ry.toFixed(3)}deg) rotate(${p.r.toFixed(3)}deg) scale(${p.s.toFixed(5)})`;

  function prepareText() {
    all('.section-top h2,.center-intro h2,.setup-copy h2,.faq-heading h2,.final-copy h2').forEach(heading => {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      let index = 0;
      textNodes.forEach(node => {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(word => {
          if (!word.trim()) { frag.append(document.createTextNode(word)); return; }
          const wrap = document.createElement('span'), inner = document.createElement('span');
          wrap.className = 'word-mask'; inner.className = 'word-inner'; inner.textContent = word;
          inner.style.setProperty('--word-delay', `${Math.min(index++ * 38, 380)}ms`);
          wrap.append(inner); frag.append(wrap);
        });
        node.replaceWith(frag);
      });
    });
    all('.industry-card').forEach((el, i) => el.style.setProperty('--card-delay', `${(i % 4) * 85}ms`));
    all('.team-feature').forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * 85}ms`));
    all('.closing-card').forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * 130}ms`));
  }

  function reveal(el) {
    if (revealed.has(el)) return;
    revealed.add(el); el.classList.add('visible');
  }
  function observe() {
    observer?.disconnect();
    if (reduced() || !('IntersectionObserver' in window)) { all('.reveal,.industry-card').forEach(reveal); return; }
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
    }), { threshold: .07, rootMargin: '0px 0px -25px 0px' });
    all('.reveal,.industry-card').forEach(el => observer.observe(el));
  }

  function playOpening(initial = false) {
    openingAnimations.forEach(a => a.cancel()); openingAnimations = [];
    openingDone = reduced() || scrollY > 100 || (initial && arrivedLate);
    openingStart = performance.now();
    all('.hero-copy .line>span').forEach((el, i) => {
      if (openingDone) { el.style.transform = 'none'; return; }
      el.style.removeProperty('transform');
      openingAnimations.push(el.animate([{ transform: 'translateY(112%)' }, { transform: 'translateY(0)' }], { delay: 1010 + i * 90, duration: 1050, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
    });
    all('.hero-enter').forEach((el, i) => {
      if (openingDone) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
      el.style.removeProperty('opacity'); el.style.removeProperty('transform');
      openingAnimations.push(el.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: 1360 + i * 70, duration: 750, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
    });
    openingButton.setAttribute('aria-pressed', 'false');
    requestTick();
  }
  openingButton.addEventListener('click', () => playOpening());

  function measure() {
    const h = stage.offsetHeight, w = stage.clientWidth;
    metrics = {
      pageHeight: document.documentElement.scrollHeight,
      viewHeight: innerHeight,
      stageTop: top(section), stageHeight: section.offsetHeight,
      pinHeight: h, width: w, header: q('.site-header').offsetHeight,
      cw: cards[0].offsetWidth, ch: cards[0].offsetHeight,
      heroTop: top(hero), heroHeight: hero.offsetHeight, heroWidth: hero.clientWidth,
      hcw: heroCards[0].offsetWidth, hch: heroCards[0].offsetHeight,
      storyTop: top(story), storyHeight: story.offsetHeight
    };
    sections = all('.live-inbox,.flow-card,.human-card,.personal-card').map(el => ({el,top:top(el),height:el.offsetHeight}));
    targetY = scrollY;
    requestTick();
  }
  function requestTick() { if (!frame) frame = requestAnimationFrame(tick); }
  function readScroll() {
    targetY = scrollY;
    if (!openingDone && targetY > 100) {
      openingDone = true;
      openingAnimations.forEach(a => { try { a.finish(); } catch {} });
    }
    requestTick();
  }

  function tick(now) {
    frame = 0;
    if (!metrics) return;
    const dt = Math.min(50, lastTime ? now - lastTime : 16.667); lastTime = now;
    // Exponential damping is independent of display refresh rate.
    const alpha = 1 - Math.exp(-dt / 72);
    currentY = reduced() || Math.abs(targetY - currentY) < .08 ? targetY : lerp(currentY, targetY, alpha);
    const m = metrics, mobile = phone.matches;
    progressBar.style.transform = `scaleX(${clamp(currentY / Math.max(1, m.pageHeight - m.viewHeight))})`;
    if (reduced()) return;

    const seconds = openingDone ? 3 : (now - openingStart) / 1000;
    if (seconds > 2.8) openingDone = true;
    heroCards.forEach((el, i) => {
      const p = heroPose(i, seconds, m.heroWidth, m.heroHeight, mobile);
      const leave = clamp((currentY - m.heroTop) / m.heroHeight);
      p.y -= leave * (mobile ? 15 : 42) * (i * .1 + 1);
      p.r += leave * (i - 2.5) * .9;
      el.style.setProperty('--hero-transform', transformPose(p, m.hcw, m.hch));
    });
    opening.style.opacity = String(1 - smoothstep(.22, .75, seconds));
    opening.style.transform = `translateY(${-smoothstep(.25, .9, seconds) * 35}px)`;
    heroCopy.style.setProperty('--hero-copy-y', `${-clamp(currentY / m.heroHeight) * (mobile ? 0 : 28)}px`);
    q('.deck-label').style.opacity = String(smoothstep(1.6, 2.35, seconds));

    const progress = clamp((currentY - m.stageTop + m.header) / Math.max(1, m.stageHeight - m.pinHeight));
    cards.forEach((el, i) => {
      const p = cardPose(i, progress, m.width, m.pinHeight, m.cw, m.ch, mobile);
      el.style.setProperty('--card-transform', transformPose(p, m.cw, m.ch));
      el.style.opacity = p.a.toFixed(4);
    });
    const exit = smoothstep(.37, .55, progress);
    intro.style.opacity = String(1 - exit);
    intro.style.transform = `translate3d(0,${-exit * (mobile ? 30 : 110)}px,0)`;
    words.forEach((word, i) => word.style.setProperty('--word-progress', smoothstep(i * .021, i * .021 + .13, progress)));
    const arrival = smoothstep(.72, .94, progress);
    resolved.style.opacity = String(arrival);
    resolved.style.transform = `translate3d(0,${(1 - arrival) * 45}px,0)`;
    resolved.inert = arrival < .5;
    labels.forEach((label, i) => { label.style.opacity = String(smoothstep(.03, .13, progress) * (1 - smoothstep(.36, .57, progress))); label.style.transform = `translateY(${-exit * 60}px) rotate(${i ? 8 : -9}deg)`; });
    timeline.forEach((line, i) => line.style.setProperty('--step-progress', clamp((progress - i * .25) * 4)));

    sections.forEach(item => {
      const p = clamp((currentY + m.viewHeight - item.top) / (m.viewHeight + item.height));
      item.el.style.setProperty('--panel-y', `${(1 - smoothstep(.01, .35, p)) * (mobile ? 24 : 75)}px`);
      item.el.style.setProperty('--panel-scale', lerp(.965, 1, smoothstep(.01, .35, p)));
    });
    const storyP = clamp((currentY + m.viewHeight - m.storyTop) / (m.viewHeight + m.storyHeight));
    const storyIn = smoothstep(.04, .45, storyP);
    review.style.setProperty('--story-scale', lerp(.73, 1, storyIn));
    review.style.setProperty('--story-y', `${lerp(100, 0, storyIn)}px`);
    backs.forEach((el, i) => { el.style.setProperty('--back-x', `${(i ? 1 : -1) * lerp(mobile ? 25 : 150, 0, storyIn)}px`); el.style.setProperty('--back-r', `${(i ? 1 : -1) * lerp(24, mobile ? 5 : 10, storyIn)}deg`); });
    // The closing panel's icons are driven by live/finale.js as the panel opens.
    if (!openingDone || currentY !== targetY) requestTick();
  }

  function applyReduction() {
    body.classList.toggle('reduce-motion', reduced());
    document.documentElement.style.scrollBehavior = reduced() ? 'auto' : '';
    reduceButton.setAttribute('aria-pressed', String(reduced()));
    reduceButton.textContent = reduced() ? 'Motion reduced' : 'Reduce motion';
    if (reduced()) {
      openingAnimations.forEach(a => { try { a.finish(); } catch {} });
      cards.forEach(el => el.style.opacity = '1');
      intro.style.opacity = '1'; intro.style.transform = 'none';
      words.forEach(word => word.style.setProperty('--word-progress', 1));
      heroCopy.style.setProperty('--hero-copy-y','0px');
      openingDone = true;
    }
    observe(); measure();
  }
  reduceButton.addEventListener('click', () => {
    if (systemReduce.matches) { reduceButton.textContent = 'Reduced by device setting'; return; }
    customReduce = !customReduce;
    try { localStorage.setItem('steps-reduced-motion', String(customReduce)); } catch {}
    applyReduction();
  });
  systemReduce.addEventListener('change', applyReduction);
  phone.addEventListener('change', measure);
  addEventListener('scroll', readScroll, { passive:true });
  addEventListener('resize', measure, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) {lastTime = 0; readScroll();} });
  prepareText();
  body.classList.add('motion-ready');
  applyReduction(); playOpening(true);
  if (!arrivedLate) body.classList.add('hero-intro');
  else {
    // Glide the cards from the fallback layout into place instead of jumping.
    body.classList.add('hero-settling');
    setTimeout(() => body.classList.remove('hero-settling'), 1000);
  }
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(q('main'));
  document.fonts.ready.then(measure);
  return {reduced};
}
