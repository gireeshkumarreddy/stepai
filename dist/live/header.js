import { $, $$, bus, lerp } from './util.js';

export function initHeader({ reduced }) {
  const header = $('#site-header');
  const nav = $('#main-nav');
  const glider = $('.nav-glider');
  const brand = $('.live-brand');
  const burger = $('#menu-toggle');
  const mobile = $('#mobile-menu');

  // The logo is a loop: a light pulse travels it continuously and speeds up
  // when you scroll, hover the mark, or a new message lands in the inbox.
  const marks = $$('.mark-svg');
  let offset = 0, speed = 1, boost = 0, hovering = 0, lastTime = 0, lastY = scrollY;
  function pulse(time) {
    const dt = Math.min(64, lastTime ? time - lastTime : 16); lastTime = time;
    const velocity = Math.abs(scrollY - lastY) / dt; lastY = scrollY;
    if (!reduced()) {
      boost = Math.min(8, boost + velocity * .5) * Math.exp(-dt / 520);
      speed = lerp(speed, 1 + hovering * 3.2 + boost, 1 - Math.exp(-dt / 170));
      offset = (offset + dt * .0105 * speed) % 100;
      marks.forEach(mark => mark.style.setProperty('--pulse', (-offset).toFixed(2)));
    }
    requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);
  brand.addEventListener('pointerenter', () => { hovering = 1; });
  brand.addEventListener('pointerleave', () => { hovering = 0; });
  brand.addEventListener('click', () => {
    brand.classList.remove('is-bouncing'); void brand.offsetWidth; brand.classList.add('is-bouncing');
  });
  brand.addEventListener('animationend', () => brand.classList.remove('is-bouncing'));
  bus.on('pulse', () => { boost = Math.min(8, boost + 5); });
  let receiveTimer = 0;
  bus.on('message', () => {
    boost = Math.min(8, boost + 4);
    brand.classList.add('is-receiving');
    clearTimeout(receiveTimer); receiveTimer = setTimeout(() => brand.classList.remove('is-receiving'), 900);
  });

  // A soft pill glides under whichever link you point at.
  function glideTo(link) {
    if (!link) { glider.classList.remove('show'); return; }
    const box = link.getBoundingClientRect(), base = nav.getBoundingClientRect();
    glider.style.width = `${box.width}px`;
    glider.style.transform = `translateX(${box.left - base.left}px)`;
    glider.classList.add('show');
  }
  $$('.nav-link', nav).forEach(link => {
    link.addEventListener('pointerenter', () => glideTo(link));
    link.addEventListener('focus', () => glideTo(link));
  });
  nav.addEventListener('pointerleave', () => glideTo(openId ? $(`[data-menu="${openId}"]`) : null));

  // Mega menus open on hover with a little intent delay, or on click / keyboard.
  const triggers = $$('[data-menu]');
  let openId = null, openedAt = 0, openTimer = 0, closeTimer = 0;
  function setMenu(id) {
    if (id !== openId) openedAt = performance.now();
    openId = id;
    triggers.forEach(button => {
      const on = button.dataset.menu === id;
      button.setAttribute('aria-expanded', String(on));
      document.getElementById(button.dataset.menu).classList.toggle('open', on);
    });
    header.classList.toggle('menu-open', Boolean(id));
    if (id) glideTo($(`[data-menu="${id}"]`));
  }
  triggers.forEach(button => {
    const item = button.closest('.nav-item');
    button.addEventListener('click', () => {
      const fresh = performance.now() - openedAt < 450;
      setMenu(openId === button.dataset.menu && !fresh ? null : button.dataset.menu);
    });
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      clearTimeout(closeTimer); clearTimeout(openTimer);
      openTimer = setTimeout(() => setMenu(button.dataset.menu), openId ? 0 : 110);
    });
    item.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      clearTimeout(openTimer);
      closeTimer = setTimeout(() => { setMenu(null); if (!nav.matches(':hover')) glideTo(null); }, 240);
    });
  });
  document.addEventListener('click', event => { if (openId && !event.target.closest('.nav-item')) setMenu(null); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (openId) { const trigger = $(`[data-menu="${openId}"]`); setMenu(null); trigger.focus(); }
    if (document.body.classList.contains('mobile-menu-open')) { setMobile(false); burger.focus(); }
  });
  $$('.mega-menu a, .mega-menu button').forEach(link => link.addEventListener('click', () => setMenu(null)));
  $$('[data-goto-channel]').forEach(link => link.addEventListener('click', () => {
    setTimeout(() => document.getElementById(`channel-tab-${link.dataset.gotoChannel}`)?.click(), 60);
  }));
  $$('[data-open-industry]').forEach(button => button.addEventListener('click', () => {
    $(`.industry-card[data-industry="${button.dataset.openIndustry}"]`)?.click();
  }));

  // The header knows where you are on the page.
  const spy = [
    ['[data-menu="menu-product"]', ['channels', 'product', 'journey-explorer', 'integrations', 'team', 'setup']],
    ['[data-menu="menu-solutions"]', ['solutions']],
    ['[data-spy="stories"]', ['stories']]
  ].map(([selector, ids]) => ({ link: $(selector), sections: ids.map(id => document.getElementById(id)).filter(Boolean) }));
  let spyFrame = 0;
  function updateSpy() {
    spyFrame = 0;
    const middle = innerHeight * .45;
    header.classList.toggle('is-scrolled', scrollY > 24);
    spy.forEach(({ link, sections }) => link?.classList.toggle('is-current', sections.some(section => {
      const box = section.getBoundingClientRect(); return box.top < middle && box.bottom > middle;
    })));
  }
  addEventListener('scroll', () => { if (!spyFrame) spyFrame = requestAnimationFrame(updateSpy); }, { passive: true });
  updateSpy();

  // Live ticker: the newest message from the demo inbox slides into the header.
  const tickers = $$('.live-chip-text');
  function swap(el, value) {
    if (reduced() || !el.animate) { el.textContent = value; return; }
    el.getAnimations().forEach(animation => animation.cancel());
    const out = el.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-120%)', opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
    out.onfinish = () => {
      el.textContent = value;
      el.animate([{ transform: 'translateY(120%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' });
      out.cancel();
    };
  }
  bus.on('message', ({ channel, text }) => tickers.forEach(el => swap(el, `${channel} · ${text}`)));
  const megaQ = $('#mega-q'), megaA = $('#mega-a');
  bus.on('exchange', ({ question, answer }) => {
    [[megaQ, question], [megaA, answer]].forEach(([el, value], i) => {
      if (!el) return;
      if (reduced() || !el.animate) { el.textContent = value; return; }
      setTimeout(() => {
        el.getAnimations().forEach(animation => animation.cancel());
        const out = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 200, fill: 'forwards' });
        out.onfinish = () => {
          el.textContent = value;
          el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
          out.cancel();
        };
      }, i * 220);
    });
  });

  // Full-screen menu on small screens.
  function setMobile(open) {
    document.body.classList.toggle('mobile-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobile.inert = !open;
    document.documentElement.classList.toggle('scroll-locked', open);
  }
  burger.addEventListener('click', () => setMobile(!document.body.classList.contains('mobile-menu-open')));
  mobile.addEventListener('click', event => { if (event.target.closest('a,button')) setMobile(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', event => { if (event.matches) setMobile(false); });
}
