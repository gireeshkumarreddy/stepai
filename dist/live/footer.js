import { $, $$, bus, clamp, lerp, smooth, whenVisible } from './util.js';

// The footer's centrepiece: a giant "steps ai" whose letters climb in like stairs,
// lift and fill with blue near the cursor, and hop when clicked. A glow follows
// the cursor across the footer, links get a gliding highlight like the header,
// and the back-to-top button leans toward the pointer.
export function initFooter({ reduced }) {
  const footer = $('#site-footer');
  if (!footer) return;
  const stage = $('.footer-stage', footer);
  const letters = $$('.footer-word > *', footer);
  const mark = $('.footer-mark', footer);
  const up = $('.footer-up i', footer), upLink = $('.footer-up', footer);
  const pointer = { x: 0, y: 0, active: false };
  const state = letters.map(() => ({ lift: 0, fill: 0 }));
  let centres = [], markBox = null, upBox = null, frame = 0, visible = false, wave = -1, waveStart = 0;

  function measure() {
    const box = stage.getBoundingClientRect();
    centres = letters.map(el => ({ x: box.left + el.offsetLeft + el.offsetWidth / 2, y: box.top + el.offsetTop + el.offsetHeight / 2, h: el.offsetHeight }));
    markBox = mark.getBoundingClientRect();
    // Measure the untransformed link so the leaning icon doesn't chase itself.
    const link = upLink.getBoundingClientRect();
    upBox = { left: link.right - up.offsetWidth, top: link.top + (link.height - up.offsetHeight) / 2, width: up.offsetWidth, height: up.offsetHeight };
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };

  function update(time) {
    frame = 0;
    measure();
    const calm = reduced();
    let moving = false;

    // Letters climb in as the stage reaches its resting place at the bottom of the page.
    const box = stage.getBoundingClientRect();
    const rest = footer.getBoundingClientRect().bottom - box.top;
    const climb = calm ? 1 : smooth(innerHeight, innerHeight - rest * .92, box.top);
    const reach = Math.max(260, box.height * 1.25);

    letters.forEach((el, i) => {
      const c = centres[i];
      const near = pointer.active ? clamp(1 - Math.hypot(pointer.x - c.x, pointer.y - c.y) / reach) : 0;
      let target = near * near * (3 - 2 * near);
      // Idle wave: a light runs along the letters on its own every few seconds.
      if (wave >= 0) {
        const t = (time - waveStart) / 1000 - i * .09;
        target = Math.max(target, t > 0 && t < .7 ? Math.sin(t / .7 * Math.PI) : 0);
      }
      const s = state[i];
      s.lift = lerp(s.lift, target, .16);
      s.fill = lerp(s.fill, target, .12);
      if (Math.abs(s.lift - target) > .002 || Math.abs(s.fill - target) > .002) moving = true;
      const rise = smooth(i * .07, .5 + i * .07, climb);
      const lift = calm ? 0 : -s.lift * c.h * .16;
      el.style.transform = `translate3d(0,${((1 - rise) * (60 + i * 16)).toFixed(2)}%,0) translateY(${lift.toFixed(2)}px)`;
      el.style.opacity = String(.15 + .85 * rise);
      el.style.setProperty('--fill', s.fill.toFixed(3));
    });
    if (wave >= 0 && (time - waveStart) / 1000 > letters.length * .09 + .8) wave = -1;

    // The mark tilts toward the pointer; the up button leans toward it.
    if (!calm && pointer.active) {
      const mx = (pointer.x - (markBox.left + markBox.width / 2)) / innerWidth;
      const my = (pointer.y - (markBox.top + markBox.height / 2)) / innerHeight;
      mark.style.transform = `perspective(700px) rotateY(${(mx * 28).toFixed(2)}deg) rotateX(${(-my * 22).toFixed(2)}deg)`;
      const dx = pointer.x - (upBox.left + upBox.width / 2), dy = pointer.y - (upBox.top + upBox.height / 2);
      const pull = clamp(1 - Math.hypot(dx, dy) / 120);
      up.style.transform = `translate(${(dx * pull * .35).toFixed(1)}px,${(dy * pull * .35).toFixed(1)}px)`;
    } else {
      mark.style.transform = '';
      up.style.transform = '';
    }
    if (moving || wave >= 0) request();
  }

  footer.addEventListener('pointermove', event => {
    const box = footer.getBoundingClientRect();
    footer.style.setProperty('--mx', `${event.clientX - box.left}px`);
    footer.style.setProperty('--my', `${event.clientY - box.top}px`);
    footer.classList.add('lit');
    if (event.pointerType === 'mouse') { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; }
    request();
  });
  footer.addEventListener('pointerleave', () => { footer.classList.remove('lit'); pointer.active = false; request(); });

  // Tap or click a letter: it hops, the logo's light pulse races, and a wave follows.
  letters.forEach((el, i) => {
    el.addEventListener('click', () => {
      el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
      bus.emit('pulse');
      if (!reduced()) { wave = i; waveStart = performance.now() - i * 90; request(); }
    });
    el.addEventListener('animationend', () => el.classList.remove('hop'));
  });
  mark.addEventListener('click', () => bus.emit('pulse'));

  // Gliding highlight inside each link column, like the header navigation.
  $$('.footer-col', footer).forEach(col => {
    const glider = $('.col-glider', col);
    $$('.footer-link', col).forEach(link => {
      const glide = () => {
        glider.style.transform = `translateY(${link.offsetTop - 4}px)`;
        glider.style.height = `${link.offsetHeight + 8}px`;
        glider.style.width = `${link.offsetWidth + 24}px`;
        glider.classList.add('show');
      };
      link.addEventListener('pointerenter', glide);
      link.addEventListener('focus', glide);
      link.addEventListener('blur', () => glider.classList.remove('show'));
    });
    col.addEventListener('pointerleave', () => glider.classList.remove('show'));
  });

  // While the footer is on screen and nobody is pointing at it, the letters breathe on their own.
  whenVisible(footer, on => { visible = on; request(); }, .15);
  setInterval(() => {
    if (!visible || pointer.active || reduced() || document.hidden) return;
    wave = 0; waveStart = performance.now(); request();
  }, 4200);
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  document.fonts?.ready.then(request);
  request();
}
