import { $, $$, bus, escapeHTML, icon, channelMark, pick, rand, whenVisible } from './util.js';

const CHANNELS = ['WhatsApp', 'Instagram', 'Messenger', 'Website'];
const NAMES = ['Maya Patel', 'Leo Martins', 'Aisha Khan', 'Noah Fischer', 'Sofia Rossi', 'Daniel Okafor', 'Hana Sato', 'Lucas Silva',
  'Priya Nair', 'Omar Haddad', 'Emma Clarke', 'Kenji Mori', 'Jordan Lee', 'Alex Kim', 'Sam Rivera', 'Chloe Martin'];
const STAGES = ['New', 'Answered', 'Details saved', 'With your team'];

// A self-running demo inbox. Sample customers write in on their own; the AI agent
// answers from the supplied product content; the visitor can reply, take over and resolve.
export function initInbox({ DEMOS, CHANNELS: channelContent, respond, reduced }) {
  const root = $('#live-inbox');
  if (!root) return;
  const list = $('#li-convos'), thread = $('#li-thread'), suggest = $('#li-suggest');
  const input = $('#li-input'), form = $('#li-composer');

  // Opening lines come straight from the supplied channel and journey examples.
  const scripts = [
    { channel: 'WhatsApp', interest: 'Product question', ...pickQA(channelContent[0]) },
    { channel: 'Instagram', interest: 'Collection details', ...pickQA(channelContent[1]) },
    { channel: 'Messenger', interest: 'Services', ...pickQA(channelContent[2]), saved: true },
    { channel: 'Website', interest: 'Product demo', ...pickQA(channelContent[3]), saved: true },
    { channel: 'Instagram', interest: 'Product link', ...pickQA(DEMOS[0][1]) },
    { channel: 'WhatsApp', interest: 'New enquiry', ...pickQA(DEMOS[0][2]), saved: true },
    { channel: 'Instagram', interest: 'Sizes', ...pickQA(DEMOS[0][3]) },
    { channel: 'WhatsApp', interest: 'Gift ideas', ...pickQA(DEMOS[1][0]) },
    { channel: 'Website', interest: 'Customer support', ...pickQA(DEMOS[1][1]), saved: true },
    { channel: 'Website', interest: 'Product demo', ...pickQA(DEMOS[1][2]) },
    { channel: 'Website', interest: 'Specialist help', ...pickQA(DEMOS[1][3]), handoff: true },
    { channel: 'Messenger', interest: 'Appointments', ...pickQA(DEMOS[2][0]) },
    { channel: 'WhatsApp', interest: 'Order status', ...pickQA(DEMOS[2][1]) },
    { channel: 'Website', interest: 'Order issue', ...pickQA(DEMOS[2][2]), ticket: true },
    { channel: 'WhatsApp', interest: 'Delivery options', ...pickQA(DEMOS[3][0]) },
    { channel: 'WhatsApp', interest: 'Order follow-up', ...pickQA(DEMOS[3][2]) }
  ];
  const followUps = ['Thanks, that helps!', 'Can someone from your team call me?', 'Could we arrange a demo?', 'Something isn’t right with my order.', 'Where is my order?', 'Perfect, thank you.'];
  function pickQA(item) { return { question: item.question, answer: item.answer, options: item.options }; }

  const convos = [];
  const state = { active: null, filter: 'all', query: '', as: 'customer', lastTouch: 0, nextName: 0, nextScript: 0 };
  const stats = { convos: 0, customer: 0, ai: 0, saved: 0, firstReplies: [], perChannel: Object.fromEntries(CHANNELS.map(c => [c, 0])), buckets: Array(14).fill(0) };
  let simTimer = 0, visible = false, idSeq = 0;

  const now = () => Date.now();
  const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2);
  const hue = name => [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  const byId = id => convos.find(c => c.id === id);
  const active = () => byId(state.active);
  const ago = t => { const s = Math.round((now() - t) / 1000); return s < 20 ? 'now' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`; };
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? Math.min(ms, 150) : ms));

  // ---------- Conversation model ----------
  function createConvo(script, { quiet = false } = {}) {
    const name = NAMES[state.nextName++ % NAMES.length];
    const convo = { id: ++idSeq, name, channel: script.channel, interest: script.interest, script, messages: [], mode: 'ai', stage: 0, unread: 0, tags: [script.channel], created: now(), updated: now(), typing: null, firstAt: 0, replied: false };
    convos.unshift(convo);
    stats.convos++;
    if (convos.length > 9) { const old = convos.findLastIndex(c => c.id !== state.active); if (old > -1) convos.splice(old, 1); }
    if (!quiet) toast(`${icon('bolt', 13)} New conversation · <b>${escapeHTML(name)}</b> on ${escapeHTML(script.channel)}`, convo.id);
    return convo;
  }
  function push(convo, message) {
    convo.messages.push({ ...message, t: now() });
    convo.updated = now();
    if (convo.id !== state.active && message.from === 'customer') convo.unread++;
    if (convo.id === state.active) appendMessage(message, convo);
    renderList();
    if (convo.id === state.active) renderDetails();
  }
  function setTyping(convo, who) {
    convo.typing = who;
    if (convo.id === state.active) renderTyping();
    renderList();
  }

  async function customerMessage(convo, text, { fromVisitor = false } = {}) {
    if (!fromVisitor) { setTyping(convo, 'customer'); await wait(rand(700, 1300)); setTyping(convo, null); }
    if (!convo.firstAt) convo.firstAt = now();
    if (convo.mode === 'resolved') { convo.mode = 'ai'; system(convo, 'Conversation reopened'); }
    push(convo, { from: 'customer', text });
    stats.customer++; stats.perChannel[convo.channel]++; stats.buckets[stats.buckets.length - 1]++;
    bus.emit('message', { channel: convo.channel, text, name: convo.name });
    renderStats();
    if (convo.mode === 'team') {
      if (!fromVisitor) toast(`${icon('people', 13)} <b>${escapeHTML(convo.name)}</b> is waiting for your team`, convo.id);
      return;
    }
    if (convo.mode === 'waiting') return;
    await wait(rand(450, 800));
    setTyping(convo, 'ai');
    await wait(rand(900, 1600));
    setTyping(convo, null);
    const reply = fromVisitor || convo.replied ? respond(text) : { text: convo.script.answer, options: convo.script.options, handoff: convo.script.handoff, ticket: convo.script.ticket, saved: convo.script.saved };
    if (convo.mode !== 'ai') return;
    push(convo, { from: 'ai', text: reply.text, options: reply.options });
    stats.ai++;
    if (!convo.replied) { convo.replied = true; stats.firstReplies.push((now() - convo.firstAt) / 1000); }
    convo.stage = Math.max(convo.stage, 1);
    bus.emit('exchange', { question: text, answer: reply.text });
    if (reply.saved) saveDetails(convo);
    if (reply.ticket) { addTag(convo, 'Ticket'); system(convo, 'Ticket created with the conversation attached', 'ticket'); }
    if (reply.handoff) handoff(convo);
    renderStats(); renderDetails();
  }
  function saveDetails(convo) {
    if (convo.tags.includes('Details saved')) return;
    convo.stage = Math.max(convo.stage, 2); addTag(convo, 'Details saved'); stats.saved++;
    system(convo, 'Customer details saved to your CRM', 'save');
  }
  function handoff(convo) {
    convo.mode = 'waiting'; convo.stage = 3; addTag(convo, 'Needs your team');
    system(convo, 'Your team was notified · conversation shared', 'people');
    toast(`${icon('people', 13)} <b>${escapeHTML(convo.name)}</b> needs a person. <u>Take over</u>`, convo.id);
    if (convo.id === state.active) { state.as = 'team'; renderHead(); }
  }
  function addTag(convo, tag) { if (!convo.tags.includes(tag)) convo.tags.push(tag); }
  function system(convo, text, kind = 'info') { push(convo, { from: 'system', text, kind }); }

  // ---------- Simulation ----------
  function nextScript() { const script = scripts[state.nextScript % scripts.length]; state.nextScript += 1 + Math.floor(Math.random() * 3); return script; }
  async function simulate() {
    clearTimeout(simTimer);
    if (!document.hidden) {
      const open = convos.filter(c => c.mode === 'ai' && c.replied && c.id !== state.active);
      if (convos.length < 4 || !open.length || Math.random() < .55) {
        const convo = createConvo(nextScript());
        if (now() - state.lastTouch > 14000 && visible) select(convo.id);
        renderList();
        customerMessage(convo, convo.script.question);
      } else {
        const convo = pick(open);
        customerMessage(convo, pick(followUps));
      }
    }
    simTimer = setTimeout(simulate, visible ? rand(5200, 8200) : rand(9000, 14000));
  }

  // ---------- Rendering ----------
  const listItems = new Map();
  function renderList() {
    const shown = convos
      .filter(c => state.filter === 'all' || c.channel === state.filter)
      .filter(c => !state.query || `${c.name} ${c.messages.map(m => m.text).join(' ')}`.toLowerCase().includes(state.query))
      .sort((a, b) => b.updated - a.updated);
    const before = new Map([...listItems].map(([id, el]) => [id, el.getBoundingClientRect().top]));
    listItems.forEach((el, id) => { if (!shown.find(c => c.id === id)) { el.remove(); listItems.delete(id); } });
    shown.forEach(convo => {
      let el = listItems.get(convo.id);
      if (!el) {
        el = document.createElement('li');
        el.innerHTML = '<button type="button"></button>';
        el.firstChild.addEventListener('click', () => { state.lastTouch = now(); select(convo.id); });
        listItems.set(convo.id, el);
        if (!reduced()) {
          el.classList.add('is-new');
          el.addEventListener('animationend', () => el.classList.remove('is-new'), { once: true });
        }
      }
      const last = [...convo.messages].reverse().find(m => m.from !== 'system');
      const status = convo.mode === 'team' ? '<em class="st team">You</em>' : convo.mode === 'waiting' ? '<em class="st wait">Needs team</em>' : convo.mode === 'resolved' ? '<em class="st done">Resolved</em>' : '<em class="st ai">AI</em>';
      const preview = convo.typing ? `<span class="li-typing-mini">${convo.typing === 'ai' ? 'AI agent' : 'Customer'} is typing<i></i><i></i><i></i></span>` : escapeHTML(last ? last.text : 'New conversation');
      const button = el.firstChild;
      button.className = `${convo.id === state.active ? 'active' : ''} ${convo.unread ? 'unread' : ''}`;
      button.setAttribute('aria-current', String(convo.id === state.active));
      button.dataset.ch = convo.channel;
      button.innerHTML = `<span class="li-avatar" style="--h:${hue(convo.name)}">${initials(convo.name)}<span class="li-ch">${channelMark(convo.channel, 12)}</span></span>`
        + `<span class="li-row"><b>${escapeHTML(convo.name)}</b><time>${ago(convo.updated)}</time></span>`
        + `<span class="li-row"><small>${preview}</small>${convo.unread ? `<span class="li-unread">${convo.unread}</span>` : status}</span>`;
    });
    // Move only the rows whose position changed; re-inserting a node restarts its animation.
    shown.forEach((convo, index) => {
      const el = listItems.get(convo.id);
      if (list.children[index] !== el) list.insertBefore(el, list.children[index] || null);
    });
    if (!reduced()) listItems.forEach((el, id) => {
      const old = before.get(id);
      if (old === undefined) return;
      const delta = old - el.getBoundingClientRect().top;
      if (Math.abs(delta) > 2) el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    $$('[data-count]', root).forEach(count => {
      const key = count.dataset.count;
      count.textContent = key === 'all' ? convos.length : convos.filter(c => c.channel === key).length;
    });
    if (!shown.length) list.innerHTML = '<li class="li-empty">No conversations match.</li>';
    else $('.li-empty', list)?.remove();
  }

  function messageHTML(message) {
    if (message.from === 'system') return `<div class="li-sys ${message.kind || ''}">${icon(message.kind === 'ticket' ? 'ticket' : message.kind === 'save' ? 'save' : message.kind === 'people' ? 'people' : 'bolt', 12)}<span>${escapeHTML(message.text)}</span></div>`;
    const label = message.from === 'ai' ? `${icon('spark', 10)} AI agent` : message.from === 'team' ? 'You · Team' : '';
    const options = message.options ? `<span class="li-options">${message.options.map(o => `<button type="button" data-li-option="${escapeHTML(o)}">${escapeHTML(o)}</button>`).join('')}</span>` : '';
    return `<div class="li-msg ${message.from}">${label ? `<span class="li-msg-who">${label}</span>` : ''}<p>${escapeHTML(message.text)}</p>${options}<time>${new Date(message.t || now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`;
  }
  function appendMessage(message) {
    $('.li-typing', thread)?.remove();
    thread.insertAdjacentHTML('beforeend', messageHTML(message));
    if (!reduced()) thread.lastElementChild.classList.add('enter');
    renderTyping();
    scrollThread();
  }
  function renderTyping() {
    const convo = active();
    $('.li-typing', thread)?.remove();
    if (convo?.typing) {
      thread.insertAdjacentHTML('beforeend', `<div class="li-typing ${convo.typing}"><i></i><i></i><i></i><span>${convo.typing === 'ai' ? 'AI agent is replying' : `${escapeHTML(convo.name.split(' ')[0])} is typing`}</span></div>`);
      scrollThread();
    }
  }
  const scrollThread = () => thread.scrollTo({ top: thread.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });

  function renderThread() {
    const convo = active();
    if (!convo) return;
    thread.innerHTML = `<p class="li-day">Today · ${escapeHTML(convo.channel)} conversation</p>` + convo.messages.map(messageHTML).join('');
    renderTyping();
    thread.scrollTop = thread.scrollHeight;
  }
  function renderHead() {
    const convo = active();
    if (!convo) return;
    $('#li-avatar').textContent = initials(convo.name);
    $('#li-avatar').style.setProperty('--h', hue(convo.name));
    $('#li-name').textContent = convo.name;
    $('#li-meta').innerHTML = `${channelMark(convo.channel, 12)} ${escapeHTML(convo.channel)} · ${escapeHTML(convo.interest)}`;
    const mode = $('#li-mode');
    mode.className = `li-mode ${convo.mode}`;
    mode.lastChild.textContent = { ai: 'AI agent replying', team: 'You’re replying · AI paused', waiting: 'Waiting for your team', resolved: 'Resolved' }[convo.mode];
    const take = $('#li-takeover');
    take.textContent = convo.mode === 'team' ? 'Hand back to AI' : 'Take over';
    take.setAttribute('aria-pressed', String(convo.mode === 'team'));
    take.classList.toggle('attention', convo.mode === 'waiting');
    $('#li-resolve').disabled = convo.mode === 'resolved';
    root.classList.toggle('team-mode', convo.mode === 'team');
    setAs(state.as);
  }
  function renderDetails() {
    const convo = active();
    if (!convo) return;
    $('#li-d-avatar').textContent = initials(convo.name);
    $('#li-d-avatar').style.setProperty('--h', hue(convo.name));
    $('#li-d-name').textContent = convo.name;
    $('#li-d-channel').innerHTML = `${channelMark(convo.channel, 12)} ${escapeHTML(convo.channel)}`;
    $('#li-d-interest').textContent = convo.interest;
    $('#li-d-handler').textContent = convo.mode === 'team' ? 'You (team)' : convo.mode === 'waiting' ? 'Your team, next' : convo.mode === 'resolved' ? 'Resolved' : 'AI agent';
    $$('#li-stages li').forEach((li, i) => { li.classList.toggle('done', i <= convo.stage); li.classList.toggle('now', i === convo.stage); });
    $('#li-tags').innerHTML = convo.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('');
    renderSuggestions();
  }
  let suggestionsFor = '';
  function renderSuggestions() {
    const convo = active();
    const asTeam = state.as === 'team';
    // Rebuild only when the context changes, so a chip is never swapped out mid-click.
    const key = `${convo?.id}-${state.as}`;
    if (key === suggestionsFor) return;
    suggestionsFor = key;
    const ideas = asTeam
      ? ['Hi, I’m from the team. Happy to help.', 'I’ve booked that in for you.', 'Let me check that for you now.']
      : ['Do you have this in a smaller size?', 'Where is my order?', 'Can I speak to a person?', 'How much does it cost?'];
    suggest.innerHTML = convo ? ideas.map(text => `<button type="button" data-li-suggest="${escapeHTML(text)}">${escapeHTML(text)}</button>`).join('') : '';
  }

  function tween(el, value, format) {
    const from = Number(el.dataset.value || 0);
    el.dataset.value = value;
    if (reduced() || from === value) { el.textContent = format(value); return; }
    const start = performance.now();
    const step = t => { const p = Math.min(1, (t - start) / 600); el.textContent = format(from + (value - from) * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function renderStats() {
    tween($('#k-convos'), stats.convos, v => Math.round(v));
    tween($('#k-ai'), stats.customer ? Math.round(stats.ai / stats.customer * 100) : 0, v => `${Math.round(v)}%`);
    const avg = stats.firstReplies.length ? stats.firstReplies.reduce((a, b) => a + b, 0) / stats.firstReplies.length : 0;
    tween($('#k-reply'), avg, v => `${v.toFixed(1)}s`);
    tween($('#k-saved'), stats.saved, v => Math.round(v));
    const most = Math.max(1, ...Object.values(stats.perChannel));
    const bars = $('#li-bars');
    if (!bars.children.length) bars.innerHTML = CHANNELS.map(c => `<div data-bar="${c}"><span>${channelMark(c, 12)}${c}</span><i></i><b>0</b></div>`).join('');
    CHANNELS.forEach(c => {
      const row = $(`[data-bar="${c}"]`, bars);
      row.querySelector('i').style.setProperty('--w', `${(stats.perChannel[c] / most * 100).toFixed(1)}%`);
      row.querySelector('b').textContent = stats.perChannel[c];
    });
    renderSpark();
  }
  function renderSpark() {
    const b = stats.buckets, max = Math.max(2, ...b), w = 220, h = 44;
    const pts = b.map((v, i) => [i / (b.length - 1) * w, h - 4 - v / max * (h - 10)]);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    $('#li-spark .li-spark-line').setAttribute('d', line);
    $('#li-spark .li-spark-fill').setAttribute('d', `${line}L${w} ${h}L0 ${h}Z`);
  }
  setInterval(() => { stats.buckets.push(0); stats.buckets.shift(); renderSpark(); }, 6000);
  setInterval(() => { $('#li-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); $$('time', list).forEach((t, i) => { const c = convos.find(cv => listItems.get(cv.id) === t.closest('li')); if (c) t.textContent = ago(c.updated); }); }, 5000);
  $('#li-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let toastTimer = 0;
  function toast(html, id) {
    const el = $('#li-toast');
    el.innerHTML = `<button type="button" data-open="${id}">${html}</button>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  // ---------- Visitor actions ----------
  function select(id) {
    const convo = byId(id);
    if (!convo) return;
    state.active = id; convo.unread = 0;
    state.as = convo.mode === 'team' || convo.mode === 'waiting' ? 'team' : 'customer';
    renderList(); renderHead(); renderThread(); renderDetails();
  }
  function setAs(who) {
    state.as = who;
    $$('[data-as]', root).forEach(button => button.setAttribute('aria-checked', String(button.dataset.as === who)));
    input.placeholder = who === 'team' ? `Reply to ${active()?.name.split(' ')[0] || 'the customer'} as your team…` : 'Type as the customer to test the AI agent…';
    root.dataset.as = who;
    renderSuggestions();
  }
  function takeOver(convo, on) {
    if (on) { convo.mode = 'team'; convo.stage = 3; addTag(convo, 'Team replying'); system(convo, 'You took over · AI replies paused', 'people'); setAs('team'); }
    else { convo.mode = 'ai'; system(convo, 'AI agent resumed the conversation'); setAs('customer'); }
    renderHead(); renderDetails(); renderList();
  }
  async function send(text) {
    const convo = active();
    if (!convo || !text.trim()) return;
    state.lastTouch = now();
    if (state.as === 'team') {
      if (convo.mode !== 'team') takeOver(convo, true);
      push(convo, { from: 'team', text });
      await wait(1300);
      setTyping(convo, 'customer'); await wait(1100); setTyping(convo, null);
      push(convo, { from: 'customer', text: pick(['Thank you, that’s great.', 'Perfect, thanks for your help!', 'Great, appreciate it.']) });
      stats.customer++; stats.perChannel[convo.channel]++; stats.buckets[stats.buckets.length - 1]++; renderStats();
      bus.emit('message', { channel: convo.channel, text: 'Customer replied to your team', name: convo.name });
    } else {
      if (convo.mode === 'waiting') { convo.mode = 'ai'; }
      await customerMessage(convo, text, { fromVisitor: true });
      if (convo.mode === 'team') toast(`${icon('people', 13)} AI is paused while your team replies. <u>Hand back to AI</u>`, convo.id);
    }
  }

  form.addEventListener('submit', event => { event.preventDefault(); const text = input.value; input.value = ''; send(text); });
  suggest.addEventListener('click', event => { const b = event.target.closest('[data-li-suggest]'); if (b) send(b.dataset.liSuggest); });
  thread.addEventListener('click', event => {
    const option = event.target.closest('[data-li-option]');
    if (!option) return;
    option.parentElement.querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.toggle('picked', b === option); });
    const convo = active(); state.lastTouch = now();
    push(convo, { from: 'customer', text: option.dataset.liOption });
    setTimeout(() => { push(convo, { from: 'ai', text: `Thanks. I’ve noted “${option.dataset.liOption}”, and your team will see it with this conversation.` }); saveDetails(convo); renderDetails(); renderStats(); }, reduced() ? 0 : 1200);
  });
  $$('[data-as]', root).forEach(button => button.addEventListener('click', () => { state.lastTouch = now(); setAs(button.dataset.as); }));
  $('#li-takeover').addEventListener('click', () => { const c = active(); if (c) { state.lastTouch = now(); takeOver(c, c.mode !== 'team'); } });
  $('#li-resolve').addEventListener('click', () => {
    const c = active(); if (!c) return;
    state.lastTouch = now(); c.mode = 'resolved'; system(c, 'Marked as resolved'); renderHead(); renderDetails(); renderList();
  });
  $$('[data-filter]', root).forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter; state.lastTouch = now();
    $$('[data-filter]', root).forEach(b => b.setAttribute('aria-selected', String(b === button)));
    renderList();
  }));
  $('#li-search').addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); state.lastTouch = now(); renderList(); });
  $('#li-toast').addEventListener('click', event => {
    const b = event.target.closest('[data-open]'); if (!b) return;
    state.lastTouch = now(); select(Number(b.dataset.open));
    const c = active(); if (c?.mode === 'waiting') takeOver(c, true);
    $('#li-toast').classList.remove('show');
  });
  root.addEventListener('pointerdown', () => { state.lastTouch = now(); });

  // ---------- Start with three conversations already in progress ----------
  [scripts[0], scripts[10], scripts[11]].forEach((script, i) => {
    const convo = createConvo(script, { quiet: true });
    convo.updated = convo.created = now() - (i + 1) * 47000;
    convo.firstAt = convo.updated;
    convo.messages.push({ from: 'customer', text: script.question, t: convo.updated }, { from: 'ai', text: script.answer, options: script.options, t: convo.updated + 2000 });
    convo.replied = true; convo.stage = 1;
    stats.customer++; stats.ai++; stats.firstReplies.push(1.8 + i * .4); stats.perChannel[script.channel]++;
    if (script.handoff) { convo.mode = 'waiting'; convo.stage = 3; convo.tags.push('Needs your team'); convo.messages.push({ from: 'system', text: 'Your team was notified · conversation shared', kind: 'people', t: convo.updated + 2500 }); convo.unread = 1; }
  });
  state.nextScript = 1;
  stats.buckets[stats.buckets.length - 1] = 3;
  convos.sort((a, b) => b.updated - a.updated);
  select(convos[0].id);
  renderStats();
  whenVisible(root, on => {
    const was = visible; visible = on;
    if (on && !was) { clearTimeout(simTimer); simTimer = setTimeout(simulate, 1400); }
  }, .25);
  simTimer = setTimeout(simulate, 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { clearTimeout(simTimer); simTimer = setTimeout(simulate, 2000); } });
}
