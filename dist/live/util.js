export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = list => list[Math.floor(Math.random() * list.length)];
export const escapeHTML = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A tiny event bus lets the inbox simulation feed the header, logo and menus.
const listeners = {};
export const bus = {
  on(type, fn) { (listeners[type] ||= []).push(fn); },
  emit(type, detail) { (listeners[type] || []).forEach(fn => fn(detail)); }
};

const paths = {
  arrow: '<path d="M4 12h15M13 5l7 7-7 7"/>',
  diagonal: '<path d="M5 19 19 5M5 5h14v14"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  phone: '<path d="M5 3h4l2 5-3 2c2 3 3 4 6 6l2-3 5 2v4c-8 4-22-10-16-16Z"/>',
  replay: '<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  send: '<path d="M4 12 20 4l-5 16-3-7Z"/><path d="m12 13 8-9"/>',
  spark: '<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 2 4v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3Z"/><path d="M14 4v12"/>',
  save: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
  missed: '<path d="M5 3h4l2 5-3 2c2 3 3 4 6 6l2-3 5 2v4c-8 4-22-10-16-16Z"/><path d="m15 3 6 6m0-6-6 6"/>'
};
export function icon(name, size = 16, width = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
}
export function channelMark(name, size = 16) {
  if (/whatsapp/i.test(name)) return `<img src="assets/brands/whatsapp.png" alt="" width="${size}" height="${size}">`;
  if (/instagram/i.test(name)) return `<img src="assets/brands/instagram-icon.png" alt="" width="${size}" height="${size}">`;
  if (/messenger/i.test(name)) return `<img src="assets/brands/messenger.png" alt="" width="${size}" height="${size}">`;
  if (/phone/i.test(name)) return icon('phone', size);
  if (/workflow/i.test(name)) return icon('bolt', size);
  return icon('globe', size);
}

export function whenVisible(el, callback, threshold = .2) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { callback(true); return; }
  new IntersectionObserver(entries => entries.forEach(entry => callback(entry.isIntersecting)), { threshold }).observe(el);
}

// Scripted replies, matched by keyword. Every answer comes from the supplied product content.
export function createResponder({ DEMOS, CHANNELS, CONTENT }) {
  const rules = [
    [/\b(human|person|someone|real agent|your team|staff|speak|talk to)\b/i, { text: DEMOS[1][3].answer, handoff: true }],
    [/(wrong|broken|damaged|problem|issue|isn.t right|not right|refund|complain)/i, { text: DEMOS[2][2].answer, ticket: true }],
    [/(reschedul|change my appointment|move my appointment)/i, { text: DEMOS[2][0].answer }],
    [/(where|track|status|dispatch|shipped|my order)/i, { text: DEMOS[2][1].answer }],
    [/(deliver|shipping)/i, { text: DEMOS[3][0].answer }],
    [/(demo|book|appointment|meeting|visit|available|slot|schedule)/i, { text: DEMOS[1][2].answer, options: DEMOS[1][2].options }],
    [/(size|smaller|bigger|larger|fit)/i, { text: DEMOS[0][3].answer }],
    [/(gift|recommend|suggest|buy|looking for|shop)/i, { text: DEMOS[1][0].answer, options: DEMOS[1][0].options }],
    [/(price|cost|pricing|plan|how much)/i, { text: CONTENT.faq.items[6].paragraphs[0] }],
    [/(@|\d{6,}|my name is|email|phone number)/i, { text: 'Thanks. I’ve saved your details so our team can follow up.', saved: true }],
    [/(link|detail|info|collection|catalog|post)/i, { text: CHANNELS[1].answer }],
    [/(service|support|help)/i, { text: CHANNELS[2].answer }],
    [/^\s*(hi|hello|hey|hola|good (morning|afternoon|evening))\b/i, { text: DEMOS[0][2].answer, saved: true }],
    [/(thank|thanks|great|perfect|okay|\bok\b|cool)/i, { text: 'You’re welcome. Is there anything else I can help with?' }]
  ];
  return text => {
    const match = rules.find(([pattern]) => pattern.test(text));
    return { ...(match ? match[1] : { text: CHANNELS[2].answer }) };
  };
}
