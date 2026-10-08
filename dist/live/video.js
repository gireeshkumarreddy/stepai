import { $, $$, clamp, lerp, smooth, escapeHTML, icon, channelMark } from './util.js';

// A 19-second motion graphic built from live elements, not a video file: every
// element is a Web Animations track on one shared clock, so it plays, pauses,
// loops and jumps to a channel instantly and stays sharp at any size.

const T = 19;
const EASE = 'cubic-bezier(.22,1,.36,1)';
const POP = 'cubic-bezier(.34,1.56,.64,1)';
const IN_OUT = 'cubic-bezier(.65,0,.35,1)';
const CHAPTERS = [
  { key: 'intro', color: '#2c9cfa', glow: '#7b5cff', s: 0, e: 2 },
  { key: 'wa', name: 'WhatsApp', color: '#25d366', glow: '#2c9cfa', s: 2, e: 4.8 },
  { key: 'ig', name: 'Instagram', color: '#e1306c', glow: '#f58529', s: 4.8, e: 7.6 },
  { key: 'ms', name: 'Messenger', color: '#7b5cff', glow: '#0a7cff', s: 7.6, e: 10.4 },
  { key: 'web', name: 'Website', color: '#2c9cfa', glow: '#25d366', s: 10.4, e: 13.2 },
  { key: 'ph', name: 'Phone calls', color: '#ff8a3d', glow: '#f8b403', s: 13.2, e: 16 },
  { key: 'final', color: '#2c9cfa', glow: '#e1306c', s: 16, e: 19 }
];
const CHANNELS = CHAPTERS.slice(1, 6);
const ANGLES = [-90, -18, 54, 126, 198];
const R = 13;
const LAYOUTS = {
  wide: { ratio: 56.25, cluster: [25, 33], k: 1, finalCluster: [50, 22], finalScale: .82, panel: [71, 28.5], pk: 1, cap: [5, 5], ck: 1, final: [50, 41], fk: 1, fw: 92 },
  tall: { ratio: 156, cluster: [50, 42], k: 1.35, finalCluster: [50, 46], finalScale: 1, panel: [50, 108], pk: 2.1, cap: [7, 4.5], ck: 2, final: [50, 84], fk: 2, fw: 44 }
};
const MARK = 'M183 333C102 333 36 267 36 186C36 105 102 39 183 39C230 39 264 67 285 105L375 267C396 305 430 333 477 333C558 333 624 267 624 186C624 105 558 39 477 39L477 112L372 112L372 188L282 188L282 256L183 256Z';

const words = (text, cls = '') => text.split(' ').map(w => `<span class="v-w ${cls}"><span>${escapeHTML(w)}</span></span>`).join(' ');
const check = icon('check', 14, 2.4);

export function initVideo({ reduced, CHANNELS: copy, DEMOS }) {
  const root = $('#channel-video');
  if (!root) return;
  const frame = $('#vid-frame', root), stage = $('#vid-stage', root);
  const chips = $$('[data-chapter]', root);
  const phone = matchMedia('(max-width: 699px)');
  let anims = [], mode = '', playing = false, userSeeked = false, focus = 0;

  // ---------- Scene markup ----------
  function nodes() {
    return CHANNELS.map((c, i) => {
      const a = ANGLES[i] * Math.PI / 180;
      return { ...c, i, x: Math.cos(a) * R, y: Math.sin(a) * R };
    });
  }
  function curve(n) {
    const len = Math.hypot(n.x, n.y), ux = n.x / len, uy = n.y / len;
    const s = [n.x - ux * 3.4, n.y - uy * 3.4], e = [ux * 5.6, uy * 5.6];
    const m = [(s[0] + e[0]) / 2 - uy * 2.4, (s[1] + e[1]) / 2 + ux * 2.4];
    const at = t => [0, 1].map(k => (1 - t) ** 2 * s[k] + 2 * (1 - t) * t * m[k] + t * t * e[k]);
    return { d: `M${s[0].toFixed(2)} ${s[1].toFixed(2)}Q${m[0].toFixed(2)} ${m[1].toFixed(2)} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`, at };
  }
  function bubble(kind, text, at, extra = '') {
    const who = kind === 'ai' ? `<span class="vb-who">${icon('spark', 11)} AI agent</span>` : '';
    return `<div class="vb ${kind}" data-at="${at}" ${extra}>${who}${escapeHTML(text)}</div>`;
  }
  const typing = (from, until) => `<div class="vtyping" data-at="${from}" data-until="${until}"><i></i><i></i><i></i></div>`;
  const slot = (...items) => `<div class="vslot">${items.join('')}</div>`;
  const chip = (text, at = 2.05) => `<div class="vp-chip" data-at="${at}">${check}<span>${escapeHTML(text)}</span></div>`;
  const head = (c, title, sub) => `<div class="vp-head"><span class="vp-logo">${channelMark(c.name, 24)}</span><span><b>${title}</b><small>${sub}</small></span><span class="vp-status"><i></i>AI agent on</span></div>`;

  function panels() {
    const [wa, ig, ms, web, ph] = CHANNELS;
    return [
      `<div class="v-panel vp-wa" style="--c:${wa.color}">${head(wa, 'Your store', 'WhatsApp Business')}<div class="vp-body">
        <div class="vb out campaign" data-at=".25"><img src="assets/industries/ecommerce.webp" alt=""><span>Hi Maya, your new offer is here ✨</span><small class="vb-tag">Campaign · personalised</small></div>
        ${bubble('in', copy[0].question, .85)}
        ${slot(typing(1.05, 1.5), bubble('ai', copy[0].answer, 1.5))}
      </div>${chip(copy[0].result)}</div>`,
      `<div class="v-panel vp-ig" style="--c:${ig.color}">${head(ig, 'yourstore', 'Instagram')}<div class="vp-body">
        <div class="vp-post"><img src="assets/industries/ecommerce.webp" alt=""><span class="vp-heart" data-at=".3" data-until="1.2" data-from="scale(0)" data-out="scale(1.7)">${'<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.7 0 5.9 3.8 4.3 7.3C19.5 16.4 12 21 12 21Z"/></svg>'}</span></div>
        <div class="vp-comment" data-at=".5"><span class="vp-av">MP</span><span><b>maya.p</b> ${escapeHTML(DEMOS[0][1].question)} 🔗</span></div>
        <div class="vp-divider" data-at=".95"><span>${icon('send', 12)} Private reply sent</span></div>
        ${slot(typing(1.05, 1.5), bubble('ai', DEMOS[0][1].answer, 1.5))}
      </div>${chip(DEMOS[0][1].result)}</div>`,
      `<div class="v-panel vp-ms" style="--c:${ms.color}">${head(ms, 'Your business', 'Messenger')}<div class="vp-body">
        ${bubble('in', copy[2].question, .3)}
        <div class="vp-know"><small data-at=".5">Using your information</small>${[['globe', 'Website'], ['file', 'FAQs'], ['file', 'Documents']].map(([ic, label], i) => `<span data-at="${.6 + i * .12}" data-from="translateX(-5em) scale(.6)">${ic === 'globe' ? icon('globe', 14) : '📄'} ${label}</span>`).join('')}</div>
        ${slot(typing(1.0, 1.55), bubble('ai', copy[2].answer, 1.55))}
      </div>${chip('Answers from your information')}</div>`,
      `<div class="v-panel vp-web" style="--c:${web.color}"><div class="vp-browser"><i></i><i></i><i></i><span>${icon('globe', 12)} yourbusiness.com</span></div><div class="vp-body">
        <div class="vp-skel"><b></b><i></i></div>
        ${bubble('in', copy[3].question, .3)}
        ${slot(typing(.6, 1.05), bubble('ai', 'Of course. Share a little about your business so our team can prepare.', 1.05))}
        <div class="vp-lead" data-at="1.4" data-from="translateX(4em) scale(.9)"><b>${icon('people', 14)} New lead</b>
          <span data-at="1.55">Name <em>Jordan Lee</em>${check}</span><span data-at="1.7">Interest <em>Product demo</em>${check}</span><span data-at="1.85">Saved to CRM <em>with the chat</em>${check}</span></div>
      </div>${chip(copy[3].result, 2.1)}</div>`,
      `<div class="v-panel vp-ph" style="--c:${ph.color}">${head(ph, 'Customer call', 'Phone · AI calling agent')}<div class="vp-body vp-call">
        <div class="vp-caller"><i class="vp-wave" data-wave="0"></i><i class="vp-wave" data-wave="1"></i><i class="vp-wave" data-wave="2"></i><span>${icon('phone', 30)}</span></div>
        ${slot(`<p class="vp-state" data-at="0" data-until=".55">Incoming call…</p>`, `<p class="vp-state live" data-at=".55"><i></i>AI agent answered · 0:04</p>`)}
        <div class="vp-bars" data-at=".55">${Array.from({ length: 22 }, (_, i) => `<i data-bar="${i}"></i>`).join('')}</div>
        ${bubble('in', copy[4].question, .95)}
        ${slot(typing(1.15, 1.6), bubble('ai', copy[4].answer, 1.6))}
      </div>${chip(copy[4].result)}</div>`
    ].join('');
  }

  function captions() {
    const caps = [
      ['<span class="v-cap-mark">' + markSVG('cap') + '</span>Steps AI', 'Start a conversation.'],
      ...CHANNELS.map((c, i) => [`${channelMark(c.name, 16)}${c.name}`, ['Campaigns that start chats.', 'Comments become DMs.', 'Answers from your information.', 'Leads saved as you talk.', 'A helpful voice on every call.'][i]])
    ];
    return caps.map(([label, title], i) => `<div class="v-cap" data-cap="${i}"><span class="v-cap-chip" style="--c:${CHAPTERS[i].color}">${label}</span><h3>${words(title)}</h3></div>`).join('');
  }
  function markSVG(id) {
    return `<svg class="v-mark" viewBox="0 0 660 372" aria-hidden="true"><defs><linearGradient id="vg-${id}" x1="0" y1="0" x2="660" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1b3fc7"/><stop offset="1" stop-color="#5ca3ff"/></linearGradient></defs><path class="v-mark-track" d="${MARK}" stroke="url(#vg-${id})" pathLength="100"/><path class="v-mark-pulse" d="${MARK}" pathLength="100"/></svg>`;
  }

  function template(L) {
    const ns = nodes();
    const pos = ([x, y]) => `left:${x}%;top:${(y / L.ratio * 100).toFixed(3)}%`;
    const dots = Array.from({ length: 16 }, (_, i) => `<i class="v-dot" style="left:${(i * 37 + 11) % 100}%;top:${(i * 53 + 7) % 100}%;--s:${.5 + (i % 4) * .25}"></i>`).join('');
    return `<div class="v-bg"><i class="v-blob a"></i><i class="v-blob b"></i>${dots}</div>
      <div class="v-cluster" style="${pos(L.cluster)};font-size:${L.k}em">
        <svg class="v-wires" viewBox="-22 -22 44 44" aria-hidden="true">
          ${ns.map(n => `<path class="v-wire" d="${curve(n).d}" pathLength="1"/>`).join('')}
          ${ns.map(n => `<path class="v-wire-hot" d="${curve(n).d}" pathLength="1" style="stroke:${n.color}"/>`).join('')}
          <circle class="v-ring" r="5.4"/><circle class="v-ring b" r="5.4"/>
          <g class="v-packets"></g>
        </svg>
        <div class="v-hub"><span class="v-hub-halo"></span>${markSVG('hub')}</div>
        <div class="v-hub-label">steps<b>ai</b></div>
        ${ns.map(n => `<button type="button" class="v-node" data-node="${n.i}" aria-label="Jump to ${n.name}" style="left:calc(50% + ${n.x.toFixed(2)}em);top:calc(50% + ${n.y.toFixed(2)}em);--c:${n.color}"><span class="v-node-glow"></span><span class="v-node-face">${channelMark(n.name, 26)}</span></button>`).join('')}
      </div>
      <div class="v-caps" style="${pos(L.cap)};font-size:${L.ck}em">${captions()}</div>
      <div class="v-panels" style="${pos(L.panel)};font-size:${L.pk}em">${panels()}</div>
      <div class="v-final" style="${pos(L.final)};font-size:${L.fk}em;width:${L.fw}em"><h3>${words('One platform.')} ${words('Every conversation.', 'accent')}</h3>
        <div class="v-final-logos">${CHANNELS.map(c => `<span style="--c:${c.color}">${channelMark(c.name, 22)}</span>`).join('')}</div></div>
      <div class="v-water">steps<b>ai</b><span>Illustrative demo</span></div>`;
  }

  // ---------- Timeline ----------
  function track(el, frames) {
    if (!el) return;
    frames = frames.filter(Boolean).sort((a, b) => a[0] - b[0]);
    const kf = frames.map(([t, props, easing]) => ({ ...props, offset: clamp(t / T), easing: easing || 'linear' }));
    if (kf[0].offset > 0) kf.unshift({ ...frames[0][1], offset: 0 });
    if (kf[kf.length - 1].offset < 1) kf.push({ ...frames[frames.length - 1][1], offset: 1 });
    anims.push(el.animate(kf, { duration: T * 1000, iterations: Infinity, fill: 'both' }));
  }
  function show(el, a, b, { from = 'translateY(1.2em) scale(.86)', to = 'none', out = 'translateY(-.5em) scale(.97)', dur = .45, outDur = .3, ease = POP } = {}) {
    const f = [[a, { opacity: 0, transform: from }, ease], [a + dur, { opacity: 1, transform: to }]];
    if (b != null) f.push([Math.max(a + dur, b - outDur), { opacity: 1, transform: to }, EASE], [b, { opacity: 0, transform: out }]);
    track(el, f);
  }
  function holdSwap(frames, t, from, to, dur, easing = EASE) {
    frames.push([t, from, easing], [t + dur, to]);
  }

  function build() {
    anims.forEach(a => a.cancel());
    anims = [];
    const L = LAYOUTS[mode];
    stage.innerHTML = template(L);
    frame.style.aspectRatio = `100 / ${L.ratio}`;
    sizeStage();
    const ns = nodes();
    const cluster = $('.v-cluster', stage), hub = $('.v-hub', stage);
    const packets = $('.v-packets', stage);
    const hubPulses = [];

    // Background: colour washes follow the active channel; dots drift.
    const wash = key => CHAPTERS.flatMap((c, i) => {
      const prev = CHAPTERS[(i + CHAPTERS.length - 1) % CHAPTERS.length];
      return [[c.s, { color: prev[key] }, EASE], [c.s + .7, { color: c[key] }]];
    });
    track($('.v-blob.a', stage), wash('color'));
    track($('.v-blob.b', stage), wash('glow'));
    $$('.v-dot', stage).forEach((dot, i) => track(dot, [[0, { transform: 'translate(0,0)', opacity: 0 }], [1, { opacity: .6 }], [T - 1, { opacity: .6 }], [T, { transform: `translate(${(i % 2 ? 1 : -1) * (3 + i % 5)}em,-${8 + i % 7}em)`, opacity: 0 }]]));

    // Hub: pops in, draws the mark, pulses whenever a message arrives, bursts at the end.
    track($('.v-hub-label', stage), [[.9, { opacity: 0, transform: 'translateY(.8em)' }, EASE], [1.4, { opacity: 1, transform: 'none' }], [18.5, { opacity: 1, transform: 'none' }, EASE], [18.9, { opacity: 0, transform: 'translateY(.4em)' }]]);
    track($('.v-hub .v-mark-track', stage), [[.25, { strokeDashoffset: 100 }, EASE], [1.4, { strokeDashoffset: 0 }], [18.5, { strokeDashoffset: 0 }, EASE], [19, { strokeDashoffset: 100 }]]);
    $$('.v-mark-pulse', stage).forEach(p => track(p, [[0, { strokeDashoffset: 0, opacity: 0 }], [1.3, { opacity: 0 }], [1.6, { opacity: 1 }], [T, { strokeDashoffset: -600, opacity: 1 }]]));

    // Channel nodes: fly in, light up for their chapter, all together at the end.
    ns.forEach(n => {
      const node = $(`.v-node[data-node="${n.i}"]`, stage);
      const out = `translate(${(n.x * 1.1).toFixed(1)}em,${(n.y * 1.1).toFixed(1)}em) scale(.3)`;
      const f = [[0, { opacity: 0, transform: out }], [.45 + n.i * .08, { opacity: 0, transform: out }, POP], [1.1 + n.i * .08, { opacity: 1, transform: 'none' }]];
      CHANNELS.forEach((c, j) => {
        const on = j === n.i;
        const to = on ? { opacity: 1, transform: 'scale(1.34)' } : { opacity: .42, transform: 'scale(.9)' };
        f.push([c.s, { opacity: 1, transform: 'none' }, EASE], [c.s + .4, to], [c.e - .3, to, EASE], [c.e, { opacity: 1, transform: 'none' }]);
      });
      f.push([16.05 + n.i * .06, { opacity: 1, transform: 'none' }, POP], [16.45 + n.i * .06, { opacity: 1, transform: 'scale(1.2)' }], [17.3, { opacity: 1, transform: 'scale(1.2)' }, EASE], [17.7, { opacity: 1, transform: 'none' }], [18.5, { opacity: 1, transform: 'none' }, EASE], [19, { opacity: 0, transform: 'scale(.4)' }]);
      track(node, f);
      const glow = [[0, { opacity: 0 }]];
      const c = CHANNELS[n.i];
      glow.push([c.s, { opacity: 0 }, EASE], [c.s + .4, { opacity: 1 }], [c.e - .3, { opacity: 1 }, EASE], [c.e, { opacity: 0 }], [16.1, { opacity: 0 }, EASE], [16.5, { opacity: .8 }], [18.4, { opacity: .8 }, EASE], [18.9, { opacity: 0 }]);
      track($('.v-node-glow', node), glow);

      // Wires draw in during the intro; the active channel's wire lights up in its colour.
      const wire = $$('.v-wire', stage)[n.i], hot = $$('.v-wire-hot', stage)[n.i];
      track(wire, [[.65 + n.i * .07, { strokeDashoffset: 1 }, EASE], [1.4 + n.i * .07, { strokeDashoffset: 0 }], [18.5, { strokeDashoffset: 0 }, EASE], [19, { strokeDashoffset: -1 }]]);
      const hf = [[c.s, { strokeDashoffset: 1 }, EASE], [c.s + .5, { strokeDashoffset: 0 }], [c.e - .3, { strokeDashoffset: 0 }, EASE], [c.e, { strokeDashoffset: -1 }],
        [16.04, { strokeDashoffset: -1 }], [16.05, { strokeDashoffset: 1 }, EASE], [16.55, { strokeDashoffset: 0 }], [18.5, { strokeDashoffset: 0 }, EASE], [19, { strokeDashoffset: -1 }]];
      if (c.s > 0) hf.unshift([c.s - .01, { strokeDashoffset: 1 }]);
      track(hot, hf);
    });

    // Message packets travel the wires: in = customer to hub, out = agent to customer.
    const sends = [[0, 'out', .3], [0, 'in', .85], [0, 'out', 1.55], [1, 'in', .55], [1, 'out', 1.55], [2, 'in', .35], [2, 'out', 1.6], [3, 'in', .35], [3, 'out', 1.1], [3, 'out', 1.45], [4, 'in', .95], [4, 'out', 1.6]];
    sends.forEach(([i, dir, at]) => packet(i, dir, CHANNELS[i].s + at));
    ns.forEach(n => packet(n.i, 'in', 16.1 + n.i * .06));
    function packet(i, dir, at) {
      const n = ns[i], { at: point } = curve(n);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '1.05');
      c.setAttribute('class', 'v-packet');
      c.style.fill = n.color;
      packets.append(c);
      const dur = .45, steps = 10, xy = k => { const p = point(dir === 'in' ? k : 1 - k); return `translate(${p[0].toFixed(2)}px,${p[1].toFixed(2)}px)`; };
      const f = [[at - .01, { opacity: 0, transform: xy(0) }], [at, { opacity: 1, transform: xy(0) }]];
      for (let s = 1; s <= steps; s++) f.push([at + dur * s / steps, { opacity: 1, transform: xy(s / steps) }]);
      f.push([at + dur + .06, { opacity: 0, transform: xy(1) }]);
      track(c, f);
      if (dir === 'in' && at < 16) hubPulses.push(at + dur);
    }
    hubPulses.push(16.62);
    const hubFrames = [[0, { transform: 'scale(0)' }], [.1, { transform: 'scale(0)' }, POP], [.75, { transform: 'scale(1)' }]];
    hubPulses.sort((a, b) => a - b).forEach(p => {
      const big = p > 16;
      hubFrames.push([p, { transform: 'scale(1)' }, EASE], [p + .15, { transform: `scale(${big ? 1.22 : 1.13})` }], [p + .5, { transform: 'scale(1)' }, EASE]);
    });
    hubFrames.push([18.5, { transform: 'scale(1)' }, EASE], [19, { transform: 'scale(0)' }]);
    track(hub, dedupe(hubFrames));
    [$('.v-ring', stage), $('.v-ring.b', stage)].forEach((ring, k) => {
      const f = [[0, { opacity: 0, transform: 'scale(1)' }]];
      hubPulses.forEach(p => { const t = p + k * .12; f.push([t, { opacity: .7, transform: 'scale(1)' }, EASE], [t + .7, { opacity: 0, transform: `scale(${p > 16 ? 3.2 : 2.2})` }]); });
      track(ring, dedupe(f));
    });

    // Finale: the network glides to the centre and the line lands underneath.
    const L2 = LAYOUTS[mode];
    const dx = (L2.finalCluster[0] - L2.cluster[0]) / L2.k, dy = (L2.finalCluster[1] - L2.cluster[1]) / L2.k;
    track(cluster, [[0, { transform: 'none', opacity: 1 }], [16, { transform: 'none', opacity: 1 }, IN_OUT], [16.7, { transform: `translate(${dx.toFixed(2)}em,${dy.toFixed(2)}em) scale(${L2.finalScale})`, opacity: 1 }], [18.6, { transform: `translate(${dx.toFixed(2)}em,${dy.toFixed(2)}em) scale(${L2.finalScale})`, opacity: 1 }, EASE], [19, { transform: `translate(${dx.toFixed(2)}em,${dy.toFixed(2)}em) scale(${L2.finalScale * .9})`, opacity: 0 }]]);
    $$('.v-final .v-w > span', stage).forEach((w, i) => show(w, 16.6 + i * .07, 18.7, { from: 'translateY(110%)', out: 'translateY(-110%)', dur: .6, ease: EASE }));
    $$('.v-final-logos > span', stage).forEach((logo, i) => show(logo, 17 + i * .08, 18.7, { from: 'translateY(1.5em) scale(.3) rotate(-25deg)', out: 'scale(.6)', dur: .5 }));

    // Captions: words rise out of a mask for each chapter.
    $$('.v-cap', stage).forEach((cap, i) => {
      const c = CHAPTERS[i];
      const until = i === 0 ? 1.85 : c.e - .1;
      show($('.v-cap-chip', cap), c.s + .05, until, { from: 'translateY(.8em) scale(.9)', dur: .4 });
      $$('.v-w > span', cap).forEach((w, k) => show(w, c.s + .12 + k * .06, until, { from: 'translateY(110%) rotate(4deg)', out: 'translateY(-110%)', dur: .55, ease: EASE }));
    });

    // Channel panels: swing in, play their conversation, swing out.
    $$('.v-panel', stage).forEach((panel, i) => {
      const c = CHANNELS[i];
      show(panel, c.s, c.e, { from: 'translateX(6em) rotateY(-16deg) scale(.9)', out: 'translateX(-5em) rotateY(10deg) scale(.92)', dur: .55, outDur: .35, ease: EASE });
      $$('[data-at]', panel).forEach(el => {
        const d = el.dataset;
        show(el, c.s + Number(d.at), d.until ? c.s + Number(d.until) : c.e - .02, { from: d.from || undefined, out: d.out || undefined });
      });
      $$('[data-wave]', panel).forEach(w => {
        const f = [[0, { opacity: 0, transform: 'scale(1)' }]];
        [.05, .3].forEach(base => { const t = c.s + base + Number(w.dataset.wave) * .1; f.push([t, { opacity: .55, transform: 'scale(1)' }, EASE], [t + .5, { opacity: 0, transform: 'scale(2.3)' }]); });
        track(w, f);
      });
      $$('[data-bar]', panel).forEach(bar => {
        const k = Number(bar.dataset.bar), f = [[c.s + .55, { transform: 'scaleY(.2)' }]];
        for (let t = c.s + .6; t < c.e - .2; t += .11) f.push([t, { transform: `scaleY(${(.35 + Math.abs(Math.sin(k * 1.7 + t * 9)) * (k % 3 ? .9 : 1.25)).toFixed(2)})` }, 'ease-in-out']);
        f.push([c.e - .1, { transform: 'scaleY(.2)' }]);
        track(bar, f);
      });
    });

    seek(t0);
    if (playing) anims.forEach(a => a.play()); else anims.forEach(a => a.pause());
  }
  function dedupe(frames) {
    // Overlapping pulses can produce out-of-order times; keep the timeline monotonic.
    frames.sort((a, b) => a[0] - b[0]);
    return frames.filter((f, i) => i === 0 || f[0] > frames[i - 1][0] + .001);
  }

  // ---------- Playback: no player controls, it simply runs while it is in view ----------
  let t0 = 0, started = false, raf = 0;
  const now = () => anims.length ? ((anims[0].currentTime || 0) / 1000) % T : t0;
  function seek(t) { t0 = clamp(t, 0, T - .001); anims.forEach(a => { a.currentTime = t0 * 1000; }); render(); }
  function play() {
    if (playing || reduced()) return;
    // Until it first comes into view the frame holds a still; then it starts from the top.
    if (!started) { started = true; if (!userSeeked) seek(0); }
    playing = true; anims.forEach(a => a.play());
    loop();
  }
  function pause() {
    if (!playing) return;
    playing = false; t0 = now(); anims.forEach(a => a.pause());
  }
  function loop() { cancelAnimationFrame(raf); const step = () => { render(); if (playing) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); }
  function render() {
    const t = now();
    chips.forEach(chip => {
      const c = CHAPTERS[Number(chip.dataset.chapter)];
      chip.style.setProperty('--f', clamp((t - c.s) / (c.e - c.s)).toFixed(3));
      chip.setAttribute('aria-selected', String(t >= c.s && t < c.e));
    });
  }

  // The channel tabs, and the badges around the hub, jump straight to that channel.
  // With reduced motion they show that channel's finished scene instead.
  function jump(chapter) {
    userSeeked = true;
    seek(chapter.s + (reduced() ? 2.4 : .01));
    if (focus > .5) play();
  }
  chips.forEach(chip => chip.addEventListener('click', () => jump(CHAPTERS[Number(chip.dataset.chapter)])));
  stage.addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (node) jump(CHANNELS[Number(node.dataset.node)]);
  });

  // ---------- Size, mode, and scroll: small when away, full size and playing when in focus ----------
  function sizeStage() { stage.style.fontSize = `${stage.clientWidth / 100}px`; }
  function setMode() {
    const next = phone.matches ? 'tall' : 'wide';
    if (next === mode) return;
    t0 = now(); mode = next; build();
  }
  let frameReq = 0;
  function onScroll() {
    frameReq = 0;
    if (reduced()) { frame.style.transform = ''; return; }
    const box = root.getBoundingClientRect(), header = 88;
    const centre = box.top + frame.offsetHeight / 2;
    const target = header + (innerHeight - header) / 2;
    const away = Math.abs(centre - target) / innerHeight;
    focus = smooth(.5, .1, away);
    const scale = lerp(.6, 1, focus);
    frame.style.transform = `scale(${scale.toFixed(4)})`;
    frame.style.borderRadius = `${(28 / scale).toFixed(1)}px`;
    root.classList.toggle('is-minimised', focus < .6);
    if (focus > .82) play();
    if (focus < .35) pause();
  }
  const request = () => { if (!frameReq) frameReq = requestAnimationFrame(onScroll); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  phone.addEventListener('change', setMode);
  if ('ResizeObserver' in window) new ResizeObserver(sizeStage).observe(frame);

  setMode();
  seek(reduced() ? 16.9 : 1.9);
  render();
  request();
}
