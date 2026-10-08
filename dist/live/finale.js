import { $, $$, clamp, lerp, smooth } from './util.js';

// The yellow call-to-action starts as a small pill and opens to full screen as you scroll.
export function initFinale({ reduced }) {
  const pin = $('#final-pin'), panel = $('#final-panel');
  if (!pin || !panel) return;
  const header = $('#site-header');
  const teaser = $('.final-teaser'), copy = $('.final-copy'), marquee = $('.final-marquee');
  const icons = $$('.final-icons > span');
  const phone = matchMedia('(max-width: 699px)');
  let frame = 0;

  function update() {
    frame = 0;
    if (reduced()) {
      panel.style.cssText = '';
      pin.classList.add('static');
      [teaser, copy, marquee, ...icons].forEach(el => { if (el) { el.style.opacity = ''; el.style.transform = ''; } });
      return;
    }
    pin.classList.remove('static');
    const top = header.offsetHeight;
    const box = pin.getBoundingClientRect();
    const travel = Math.max(1, pin.offsetHeight - (innerHeight - top));
    // Starts opening a little before it pins, and is fully open at 70% of the pinned scroll.
    const before = smooth(innerHeight, top, box.top) * .18;
    const progress = clamp(before + clamp((top - box.top) / travel) / .7 * .82);
    const open = progress * progress * (3 - 2 * progress);
    const ix = lerp(phone.matches ? 16 : 33, 0, open), iy = lerp(phone.matches ? 41 : 39, 0, open);
    panel.style.setProperty('--clip', `inset(${iy.toFixed(2)}% ${ix.toFixed(2)}% ${iy.toFixed(2)}% ${ix.toFixed(2)}% round ${lerp(220, phone.matches ? 18 : 30, open).toFixed(1)}px)`);
    panel.style.setProperty('--panel-tilt', `${lerp(-4, 0, open).toFixed(2)}deg`);
    teaser.style.opacity = String(1 - smooth(.2, .4, progress));
    teaser.style.transform = `translate(-50%,-50%) scale(${lerp(1, 1.6, smooth(.18, .42, progress)).toFixed(3)})`;
    const reveal = smooth(.38, .9, progress);
    copy.style.opacity = String(reveal);
    copy.style.transform = `translate3d(0,${lerp(60, 0, reveal).toFixed(1)}px,0) scale(${lerp(.92, 1, reveal).toFixed(3)})`;
    marquee.style.opacity = String(smooth(.25, .7, progress));
    icons.forEach((el, i) => {
      const arrive = smooth(.5 + i * .04, .85 + i * .02, progress);
      el.style.opacity = String(arrive);
      el.style.setProperty('--icon-y', `${lerp(120 + i * 10, i % 2 ? -15 : 0, arrive).toFixed(1)}px`);
      el.style.setProperty('--icon-r', `${lerp(-70 + i * 19, i % 2 ? 12 : -14, arrive).toFixed(1)}deg`);
    });
    pin.classList.toggle('opened', progress > .95);
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  document.body.addEventListener('click', event => { if (event.target.closest('#reduce-motion')) setTimeout(request, 50); });
  update();
}
