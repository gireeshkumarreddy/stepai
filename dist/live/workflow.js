import { $, $$, clamp, escapeHTML, icon, channelMark, whenVisible } from './util.js';

const EDGES = [['trigger', 'agent'], ['agent', 'condition'], ['condition', 'notify', 'Yes'], ['notify', 'team'], ['condition', 'reply', 'No'], ['reply', 'wait']];
const SVG = 'http://www.w3.org/2000/svg';

// A follow-up workflow that runs itself: each run takes a real example message,
// lights the path it travels and writes to a run log. Steps can be dragged around.
export function initWorkflow({ DEMOS, CHANNELS, reduced }) {
  const card = $('#flow-card');
  if (!card) return;
  const canvas = $('#flow-canvas'), svg = $('#flow-wires'), log = $('#flow-log');
  const nodes = Object.fromEntries($$('.flow-node', canvas).map(el => [el.dataset.node, el]));
  const details = Object.fromEntries($$('[data-detail]', canvas).map(el => [el.dataset.detail, el]));
  const defaults = Object.fromEntries(Object.entries(details).map(([key, el]) => [key, el.textContent]));
  const home = Object.fromEntries(Object.entries(nodes).map(([key, el]) => [key, [el.style.getPropertyValue('--x'), el.style.getPropertyValue('--y')]]));
  const samples = [
    { channel: 'WhatsApp', text: CHANNELS[0].question, person: false },
    { channel: 'Website', text: DEMOS[1][3].question, person: true },
    { channel: 'Instagram', text: CHANNELS[1].question, person: false },
    { channel: 'Website', text: DEMOS[2][2].question, person: true },
    { channel: 'Messenger', text: DEMOS[2][0].question, person: false },
    { channel: 'Website', text: CHANNELS[3].question, person: true }
  ];
  let runs = 0, token = 0, running = false, paused = false, visible = false, loopTimer = 0;

  // ---------- Wires ----------
  const wires = EDGES.map(([from, to, label]) => {
    const group = document.createElementNS(SVG, 'g');
    const make = cls => { const p = document.createElementNS(SVG, 'path'); p.setAttribute('class', cls); group.append(p); return p; };
    const wire = { from, to, base: make('wire'), flow: make('wire-flow'), hot: make('wire-hot') };
    wire.hot.setAttribute('pathLength', '1');
    if (label) {
      wire.label = document.createElement('span');
      wire.label.className = `flow-edge-label ${label.toLowerCase()}`;
      wire.label.textContent = label;
      canvas.append(wire.label);
    }
    svg.append(group);
    return wire;
  });
  const dot = document.createElementNS(SVG, 'circle');
  dot.setAttribute('class', 'wire-dot'); dot.setAttribute('r', '5');
  const halo = document.createElementNS(SVG, 'circle');
  halo.setAttribute('class', 'wire-halo'); halo.setAttribute('r', '13');
  svg.append(halo, dot);

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const edge = (el, bottom) => [el.offsetLeft, el.offsetTop + (bottom ? el.offsetHeight / 2 : -el.offsetHeight / 2)];
    wires.forEach(wire => {
      const [x1, y1] = edge(nodes[wire.from], true), [x2, y2] = edge(nodes[wire.to], false);
      const bend = Math.max(22, Math.abs(y2 - y1) * .55);
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}C${x1.toFixed(1)} ${(y1 + bend).toFixed(1)} ${x2.toFixed(1)} ${(y2 - bend).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      [wire.base, wire.flow, wire.hot].forEach(p => p.setAttribute('d', d));
      if (wire.label) { wire.label.style.left = `${(x1 + x2) / 2}px`; wire.label.style.top = `${(y1 + y2) / 2}px`; }
    });
  }
  const wireFor = (from, to) => wires.find(w => w.from === from && w.to === to);

  // ---------- Runs ----------
  const sleep = ms => new Promise(resolve => setTimeout(resolve, reduced() ? Math.min(ms, 120) : ms));
  function travel(from, to, current) {
    const wire = wireFor(from, to);
    wire.hot.classList.add('lit');
    if (reduced()) return Promise.resolve();
    const length = wire.base.getTotalLength();
    return new Promise(resolve => {
      const start = performance.now(), duration = 640;
      svg.classList.add('carrying');
      const step = time => {
        if (current !== token) { svg.classList.remove('carrying'); resolve(); return; }
        const p = Math.min(1, (time - start) / duration);
        const eased = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const point = wire.base.getPointAtLength(eased * length);
        [dot, halo].forEach(c => { c.setAttribute('cx', point.x); c.setAttribute('cy', point.y); });
        if (p < 1) requestAnimationFrame(step); else { svg.classList.remove('carrying'); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }
  function clearRun() {
    Object.values(nodes).forEach(n => n.classList.remove('is-active', 'is-done', 'is-skipped'));
    wires.forEach(w => { w.hot.classList.remove('lit'); w.base.classList.remove('skipped'); w.flow.classList.remove('skipped'); w.label?.classList.remove('taken', 'skipped'); });
    Object.entries(details).forEach(([key, el]) => { el.textContent = defaults[key]; });
  }
  function write(kind, text) {
    const item = document.createElement('li');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.className = kind;
    item.innerHTML = `<time>${time}</time><span>${text}</span>`;
    log.prepend(item);
    while (log.children.length > 4) log.lastElementChild.remove();
  }
  function setState(label, kind) {
    const state = $('#flow-state');
    state.className = `flow-state ${kind}`;
    state.lastChild.textContent = label;
  }

  async function run() {
    const current = ++token;
    running = true;
    clearTimeout(loopTimer);
    clearRun();
    runs++;
    $('#flow-runs').textContent = `Run ${runs}`;
    setState('Running', 'running');
    const sample = samples[(runs - 1) % samples.length];
    const path = sample.person ? ['trigger', 'agent', 'condition', 'notify', 'team'] : ['trigger', 'agent', 'condition', 'reply', 'wait'];
    const skip = sample.person ? ['reply', 'wait'] : ['notify', 'team'];
    const text = {
      trigger: `${sample.channel} · “${sample.text}”`,
      agent: 'Asked questions · details saved',
      condition: sample.person ? 'Yes · a person should step in' : 'No · the agent can answer',
      notify: 'Shared with the conversation',
      team: 'Your team has the context',
      reply: 'Answer sent from your information',
      wait: 'Follow-up set for 1 day later'
    };
    const entry = {
      trigger: `${channelMark(sample.channel, 12)} New enquiry: “${escapeHTML(sample.text)}”`,
      agent: 'AI agent asked and saved the details',
      condition: `Needs a person? <b>${sample.person ? 'Yes' : 'No'}</b>`,
      notify: 'Your team was notified',
      team: 'Conversation handed over with context',
      reply: 'Reply sent to the customer',
      wait: 'Follow-up scheduled · 1 day later'
    };
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (i) await travel(path[i - 1], key, current);
      if (current !== token) return;
      if (key === 'condition') {
        skip.forEach(k => nodes[k].classList.add('is-skipped'));
        wires.filter(w => skip.includes(w.to)).forEach(w => { w.base.classList.add('skipped'); w.flow.classList.add('skipped'); w.label?.classList.add('skipped'); });
        wires.find(w => w.from === 'condition' && w.to === path[3])?.label?.classList.add('taken');
      }
      nodes[key].classList.add('is-active');
      details[key].textContent = text[key];
      await sleep(key === 'trigger' ? 760 : key === 'condition' ? 700 : 560);
      if (current !== token) return;
      nodes[key].classList.replace('is-active', 'is-done');
      write(key === 'condition' ? 'branch' : '', entry[key]);
    }
    write('done', `${icon('check', 12, 2)} Run ${runs} complete`);
    running = false;
    setState(paused ? 'Paused' : 'Live', paused ? 'paused' : 'running');
    schedule(2600);
  }
  function schedule(delay) {
    clearTimeout(loopTimer);
    if (paused || !visible || reduced()) return;
    loopTimer = setTimeout(() => { if (!running && !paused && visible) run(); }, delay);
  }
  function abort() { token++; running = false; clearTimeout(loopTimer); svg.classList.remove('carrying'); }

  $('#flow-test').addEventListener('click', () => { abort(); run(); });
  $('#flow-toggle').addEventListener('click', () => {
    paused = !paused;
    const button = $('#flow-toggle');
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume workflow' : 'Pause workflow');
    button.innerHTML = icon(paused ? 'play' : 'pause', 15);
    if (paused) { abort(); setState('Paused', 'paused'); } else { setState('Live', 'running'); schedule(300); }
  });

  // ---------- Drag to rearrange (mouse and pen), tap to test ----------
  const canDrag = matchMedia('(pointer: fine)');
  let drag = null, moved = false;
  Object.values(nodes).forEach(node => {
    node.addEventListener('pointerdown', event => {
      if (!canDrag.matches || event.button !== 0) return;
      drag = { node, x: event.clientX, y: event.clientY, active: false };
      node.setPointerCapture(event.pointerId);
    });
    node.addEventListener('pointermove', event => {
      if (!drag || drag.node !== node) return;
      if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
      drag.active = true; node.classList.add('dragging');
      const box = canvas.getBoundingClientRect();
      const halfW = node.offsetWidth / 2 / box.width * 100, halfH = node.offsetHeight / 2 / box.height * 100;
      node.style.setProperty('--x', clamp((event.clientX - box.left) / box.width * 100, halfW + 1, 99 - halfW).toFixed(2));
      node.style.setProperty('--y', clamp((event.clientY - box.top) / box.height * 100, halfH + 1, 99 - halfH).toFixed(2));
      draw();
      if (!moved) { moved = true; card.classList.add('rearranged'); }
    });
    const end = () => {
      if (!drag || drag.node !== node) return;
      const wasDrag = drag.active; drag = null; node.classList.remove('dragging');
      if (!wasDrag) { abort(); run(); }
    };
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', () => { drag = null; node.classList.remove('dragging'); });
    node.addEventListener('click', event => { if (!canDrag.matches) { abort(); run(); } event.preventDefault(); });
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abort(); run(); } });
  });
  const hint = $('.flow-hint', canvas);
  hint.addEventListener('click', () => {
    if (!card.classList.contains('rearranged')) return;
    Object.entries(home).forEach(([key, [x, y]]) => { nodes[key].style.setProperty('--x', x); nodes[key].style.setProperty('--y', y); });
    card.classList.remove('rearranged'); moved = false; draw();
  });

  // ---------- The setup steps on the left steer the canvas ----------
  const focus = [
    { nodes: ['agent'], text: { agent: 'Uses your website, FAQs and documents' } },
    { nodes: ['agent', 'condition'], text: { agent: 'Your name, tone and instructions', condition: 'Decides when to call in your team' } },
    { nodes: ['reply', 'wait', 'notify'], text: { wait: 'Wait, then send a message' } },
    { nodes: [], test: true }
  ];
  $$('.setup-step').forEach((step, index) => step.addEventListener('toggle', () => {
    if (!step.open) return;
    const f = focus[index];
    if (!f) return;
    if (f.test) { abort(); run(); return; }
    abort(); clearRun(); setState('Editing', 'editing');
    Object.values(nodes).forEach(n => n.classList.toggle('is-focus', f.nodes.includes(n.dataset.node)));
    Object.entries(f.text).forEach(([key, value]) => { details[key].textContent = value; });
    clearTimeout(loopTimer);
    loopTimer = setTimeout(() => { Object.values(nodes).forEach(n => n.classList.remove('is-focus')); if (!paused) run(); }, 4200);
  }));

  draw();
  addEventListener('resize', draw, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(canvas);
  document.fonts?.ready.then(draw);
  whenVisible(card, on => {
    visible = on;
    if (on && !running) schedule(500);
    if (!on) clearTimeout(loopTimer);
  }, .35);
}
