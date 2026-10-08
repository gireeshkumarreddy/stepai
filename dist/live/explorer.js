import { $, $$, escapeHTML, icon, channelMark } from './util.js';

// Who sends each line. Most demos are customer → agent; a few start with the business.
const ROLES = { '2-3': ['event', 'agent'], '3-1': ['agent', 'customer'], '3-3': ['agent', 'customer'] };
const TIMINGS = ['1 hour later', '1 day later', '3 days later'];

// Plays one journey feature as a small live scene: steps light up along a rail,
// messages type in, and the visitor can jump, pick options or write their own reply.
export function createDemoPlayer(container, { reduced, respond }) {
  let demo = null, roles = [], rail = [], timers = [], timing = 1, followUp = false;

  const later = (fn, ms) => { timers.push(setTimeout(fn, reduced() ? 0 : ms)); };
  const stop = () => { timers.forEach(clearTimeout); timers = []; };
  const chat = () => $('.dp-chat', container);

  function bubble(role, text, instant = false) {
    const el = document.createElement('div');
    if (role === 'event') {
      el.className = 'dp-event';
      el.innerHTML = `${icon('missed', 14)}<span>${escapeHTML(text)}</span>`;
    } else {
      el.className = `dp-msg ${role}`;
      el.innerHTML = `<span class="dp-who">${role === 'agent' ? `${icon('spark', 11)} AI agent` : 'Customer'}</span>${escapeHTML(text)}`;
    }
    if (instant || reduced()) el.classList.add('instant');
    chat().append(el);
    chat().scrollTo({ top: chat().scrollHeight, behavior: instant || reduced() ? 'auto' : 'smooth' });
    return el;
  }
  function typing(role) {
    const el = document.createElement('div');
    el.className = `dp-typing ${role}`;
    el.innerHTML = '<i></i><i></i><i></i>';
    chat().append(el);
    chat().scrollTo({ top: chat().scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
    return el;
  }
  function say(role, text, delay, typeFor = 750) {
    later(() => {
      const dots = typing(role);
      later(() => { dots.remove(); bubble(role, text); }, typeFor);
    }, delay);
  }
  function activate(index) {
    $$('.dp-rail button', container).forEach((button, i) => {
      button.classList.toggle('done', i < index);
      button.classList.toggle('current', i === index);
    });
  }
  function showResult(on) {
    $('.dp-result', container).classList.toggle('show', on);
    $('.dp-try', container).classList.toggle('show', on);
  }

  // Renders every step up to `from` instantly, then plays the rest.
  function play(from = 0) {
    stop();
    const log = chat();
    log.innerHTML = `<p class="dp-chat-label">${escapeHTML(demo.chatLabel)}</p>`;
    showResult(false);
    let t = 0;
    rail.forEach((step, index) => {
      const instant = index < from;
      const run = fn => instant ? fn(true) : later(() => fn(false), t);
      if (step.kind === 'chat') {
        run(fast => {
          activate(index);
          if (fast) { bubble(roles[0], demo.question, true); bubble(roles[1], demo.answer, true); return; }
          if (roles[0] === 'event') bubble('event', demo.question);
          else say(roles[0], demo.question, 0, 650);
          say(roles[1], demo.answer, roles[0] === 'event' ? 500 : 1500, 950);
        });
        if (!instant) t += 3000;
      } else {
        run(() => activate(index));
        if (!instant) t += step.kind === 'wait' ? 900 : 520;
      }
    });
    const finish = () => { activate(rail.length); showResult(true); };
    if (from >= rail.length) finish(); else later(finish, t);
  }

  function chips() {
    const holder = $('.dp-chips', container);
    const options = demo.options || [];
    holder.innerHTML = options.map(option => `<button type="button" class="dp-chip" data-option="${escapeHTML(option)}">${escapeHTML(option)}</button>`).join('')
      + (followUp ? `<button type="button" class="dp-chip ghost" data-timing>${icon('clock', 13)} Send ${escapeHTML(TIMINGS[(timing + 1) % TIMINGS.length])}</button>` : '')
      + `<button type="button" class="dp-chip ghost" data-replay>${icon('replay', 13)} Replay</button>`;
  }

  function customerSays(text, reply) {
    stop();
    bubble('customer', text);
    later(() => {
      const dots = typing('agent');
      later(() => { dots.remove(); bubble('agent', reply); }, 1000);
    }, 350);
  }

  container.addEventListener('click', event => {
    const jump = event.target.closest('.dp-rail button');
    if (jump) { play(Number(jump.dataset.step)); return; }
    if (event.target.closest('[data-replay]')) { play(0); return; }
    if (event.target.closest('[data-timing]')) {
      timing = (timing + 1) % TIMINGS.length;
      const waitButton = $('.dp-rail [data-kind="wait"] b', container);
      if (waitButton) waitButton.textContent = TIMINGS[timing];
      chips(); play(rail.findIndex(step => step.kind === 'wait'));
      return;
    }
    const option = event.target.closest('[data-option]');
    if (option) {
      $$('[data-option]', container).forEach(button => button.classList.toggle('selected', button === option));
      customerSays(option.dataset.option, `Thanks. I’ve noted “${option.dataset.option}”, and your team will see it with this conversation.`);
      $('.dp-result span', container).textContent = `Sample selection: ${option.dataset.option}. This is an illustration.`;
    }
  });
  container.addEventListener('submit', event => {
    event.preventDefault();
    const input = $('.dp-form input', container);
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    customerSays(text, respond(text).text);
  });

  return {
    load(next, stage, index) {
      demo = next;
      roles = ROLES[`${stage}-${index}`] || ['customer', 'agent'];
      followUp = stage === 3;
      rail = demo.fields.map(([label, value]) => ({ kind: 'field', label, value }));
      if (followUp) rail.push({ kind: 'wait', label: 'Timing', value: TIMINGS[timing] });
      rail.push({ kind: 'chat', label: 'Conversation', value: demo.chatLabel });
      rail.push({ kind: 'result', label: 'Result', value: demo.result });
      container.innerHTML = `<div class="dp-head"><span class="dp-title">${escapeHTML(demo.title)}</span><span class="dp-channel">${channelMark(demo.channel, 14)}${escapeHTML(demo.channel)}</span><span class="dp-live"><i></i>Live preview</span></div>`
        + `<div class="dp-context"><small>${escapeHTML(demo.contextLabel)}</small><strong>${escapeHTML(demo.context)}</strong></div>`
        + `<ol class="dp-rail" aria-label="Steps in this example, select one to jump to it">${rail.map((step, i) => `<li><button type="button" data-step="${i}" data-kind="${step.kind}"><small>${escapeHTML(step.label)}</small><b>${escapeHTML(step.value)}</b></button></li>`).join('')}</ol>`
        + '<div class="dp-chat" role="log" aria-live="polite"></div>'
        + `<div class="dp-try"><div class="dp-chips"></div><form class="dp-form"><input maxlength="160" placeholder="Try your own reply as the customer…" aria-label="Type a customer message"><button type="submit" aria-label="Send message">${icon('send', 15)}</button></form></div>`
        + `<div class="dp-result" role="status">${icon('check', 14, 2)}<span>${escapeHTML(demo.result)}</span></div>`;
      chips();
      play(0);
    },
    replay() { play(0); },
    stop
  };
}

// Advances through the features like a playlist while the section is on screen.
// Any click, key press or hover hands control back to the visitor.
export function createAutoplay({ root, hoverArea, duration, advance, reduced }) {
  let visible = false, hovering = false, off = false, idleUntil = 0, elapsed = 0, last = 0;
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .45 }).observe(root);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'autoplay-toggle';
  toggle.setAttribute('aria-pressed', 'true');
  toggle.innerHTML = '<i></i><span>Auto-play on</span>';
  $('.feature-bottom', root)?.prepend(toggle);
  toggle.addEventListener('click', event => {
    event.stopPropagation();
    off = !off; elapsed = 0;
    toggle.setAttribute('aria-pressed', String(!off));
    toggle.lastElementChild.textContent = off ? 'Auto-play off' : 'Auto-play on';
  });
  const hold = () => { idleUntil = performance.now() + 15000; elapsed = 0; };
  root.addEventListener('pointerdown', event => { if (!event.target.closest('.autoplay-toggle')) hold(); });
  root.addEventListener('keydown', hold);
  hoverArea.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
  hoverArea.addEventListener('pointerleave', () => { hovering = false; });

  function tick(time) {
    const dt = last ? Math.min(100, time - last) : 0; last = time;
    const running = visible && !hovering && !off && !document.hidden && performance.now() > idleUntil && !reduced();
    if (running) {
      elapsed += dt;
      if (elapsed >= duration) { elapsed = 0; advance(); }
    }
    const active = $('.feature-selector.active', root);
    if (active) active.style.setProperty('--autoplay', (elapsed / duration).toFixed(4));
    root.classList.toggle('autoplay-running', running);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { reset() { elapsed = 0; } };
}
