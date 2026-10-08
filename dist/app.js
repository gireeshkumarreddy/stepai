import { CONTENT, DEMOS, CHANNELS, REVIEWS } from './data.js';
import { initMotion } from './motion.js';
import { initLive, createDemoPlayer, createAutoplay } from './live/index.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHTML = str => String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const motion = initMotion();
// Header, colour flood, live inbox, workflow canvas and closing panel (see live/).
const live = initLive({ reduced: motion.reduced, DEMOS, CHANNELS, CONTENT });

function tabs(selector, activate) {
  const buttons = $$(selector);
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activate(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      activate(next); buttons[next].focus();
    });
  });
  return index => buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
}

// The channel section is a motion-graphic video now (live/video.js).

// Every original journey feature remains accessible through a compact explorer.
let stageIndex = 0, featureIndex = 0;
const colors = ['#e8f2f9', '#f5eddc', '#e5eee6', '#ece7f4'];
function renderFeature(index) {
  featureIndex = index;
  const feature = CONTENT.journey.stages[stageIndex].items[index];
  const demo = DEMOS[stageIndex][index];
  $$('#feature-list button').forEach((button, i) => { button.classList.toggle('active', i === index); button.setAttribute('aria-pressed', String(i === index)); });
  $('#feature-title').textContent = feature.title;
  $('#feature-description').textContent = feature.paragraphs[0];
  $('#feature-footnote').textContent = demo.footnote;
  const quoteIndex = feature.paragraphs.findIndex(p => p.startsWith('“'));
  $('.feature-quote')?.remove();
  if (quoteIndex >= 0) {
    const quote = document.createElement('blockquote'); quote.className = 'feature-quote';
    quote.innerHTML = `${escapeHTML(feature.paragraphs[quoteIndex])}<footer>${escapeHTML(feature.paragraphs[quoteIndex + 1] || '')}</footer>`;
    $('.feature-info').append(quote);
  }
  player.load(demo, stageIndex, index);
  autoplay?.reset();
}
function setStage(index) {
  stageIndex = index; featureIndex = 0;
  const stage = CONTENT.journey.stages[index];
  updateStageTabs(index);
  $('#stage-panel').setAttribute('aria-labelledby', `stage-tab-${index}`);
  $('#stage-label').textContent = `0${index + 1} / ${stage.label}`;
  $('#stage-title').textContent = stage.title;
  $('#stage-description').textContent = stage.paragraphs[0];
  $('.feature-stage').style.background = colors[index];
  $('#feature-list').innerHTML = stage.items.map((item, i) => `<button class="feature-selector ${i === 0 ? 'active' : ''}" data-feature="${i}" aria-pressed="${i === 0}"><span>0${i + 1}</span><span>${escapeHTML(item.title)}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg></button>`).join('');
  renderFeature(0);
}
// Each feature plays as a small live scene the visitor can jump through and reply to.
const player = createDemoPlayer($('#product-demo'), { reduced: motion.reduced, respond: live.respond });
let autoplay = null;
function replayFeature() { player.replay(); }
const updateStageTabs = tabs('[data-stage]', setStage);
$('#feature-list').addEventListener('click', event => { const button = event.target.closest('[data-feature]'); if (button) renderFeature(Number(button.dataset.feature)); });
$('#feature-replay').addEventListener('click', replayFeature);
renderFeature(0);
// The explorer plays through every feature on its own until the visitor takes over.
autoplay = createAutoplay({
  root: $('#journey-explorer'), hoverArea: $('.feature-stage'), duration: 9500, reduced: motion.reduced,
  advance: () => {
    if (featureIndex + 1 < CONTENT.journey.stages[stageIndex].items.length) renderFeature(featureIndex + 1);
    else setStage((stageIndex + 1) % CONTENT.journey.stages.length);
  }
});

// Modal content is grounded in supplied information; no unavailable route is faked.
const dialog = $('#detail-dialog');
let dialogOpener = null;
function openDialog(content) {
  dialogOpener = document.activeElement;
  $('#dialog-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
  $('#dialog-close').focus();
}
function closeDialog() { dialog.close(); if (dialogOpener?.isConnected) dialogOpener.focus(); }
$('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
function destination(label) {
  const demo = label === 'Book a demo';
  const pricing = ['Pricing', 'View pricing'].includes(label);
  const introduction = demo ? CONTENT.final.paragraphs[0] : pricing ? CONTENT.faq.items[6].paragraphs[0] : 'This destination is part of the supplied Steps AI navigation.';
  const notice = demo ? 'A booking link has not been connected to this website yet. You can explore the interactive product examples below.' : pricing ? 'The supplied project does not include plan prices or a connected pricing page.' : 'This page has not been connected yet.';
  openDialog(`<p class="eyebrow">Steps AI</p><h2>${escapeHTML(label)}</h2><p>${escapeHTML(introduction)}</p><p class="dialog-notice">${notice}</p><a class="button" data-dialog-anchor href="${demo ? '#channels' : '#product'}">Explore the platform ${arrow}</a>`);
}
document.addEventListener('click', event => {
  const destinationButton = event.target.closest('[data-destination]');
  if (destinationButton) destination(destinationButton.dataset.destination);
  if (event.target.closest('[data-dialog-anchor]')) closeDialog();
});
const integrations = [
  ['Shopify', 'shopify', 'Your store', CONTENT.journey.stages[3].items[0].paragraphs[0]],
  ['WooCommerce', 'woocommerce', 'Your store', CONTENT.setup.items[4].paragraphs[0]],
  ['Google Calendar', 'google-calendar', 'Your calendar', CONTENT.journey.stages[1].items[2].paragraphs[0]],
  ['Calendly', 'calendly', 'Your calendar', CONTENT.journey.stages[1].items[2].paragraphs[0]],
  ['HubSpot', 'hubspot', 'Your CRM', CONTENT.setup.items[4].paragraphs[0]],
  ['Zendesk', 'zendesk', 'Your customer support', CONTENT.setup.items[4].paragraphs[0]],
  ['Google Drive', 'google-drive', 'Your knowledge sources', CONTENT.setup.items[0].paragraphs[0]],
  ['Notion', 'notion', 'Your knowledge sources', CONTENT.setup.items[0].paragraphs[0]]
];
function showIntegration(name) {
  const integration = integrations.find(item => item[0] === name);
  if (!integration) return;
  openDialog(`<p class="eyebrow">${escapeHTML(integration[2])}</p><img src="assets/brands/integrations/${integration[1]}.svg" alt="${escapeHTML(name)}" style="width:58px;height:58px;object-fit:contain"><h2>${escapeHTML(name)}</h2><p>${escapeHTML(integration[3])}</p><button class="button" data-destination="Book a demo">Book a demo ${arrow}</button>`);
}
document.addEventListener('click', event => { const button = event.target.closest('[data-integration]'); if (button) showIntegration(button.dataset.integration); });
$('#all-integrations').addEventListener('click', () => openDialog(`<p class="eyebrow">Connect your tools</p><h2>${escapeHTML(CONTENT.setup.items[4].title)}</h2><p>${escapeHTML(CONTENT.setup.items[4].paragraphs[0])}</p><div class="dialog-integrations">${integrations.map(([name, path]) => `<button data-integration="${escapeHTML(name)}"><img src="assets/brands/integrations/${path}.svg" alt="">${escapeHTML(name)}</button>`).join('')}</div>`));
$('#motion-toggle').addEventListener('click', () => {
  const paused = $('.integrations').classList.toggle('paused');
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  $('#motion-toggle').setAttribute('aria-label', paused ? 'Resume moving logos' : 'Pause moving logos');
  $('#motion-toggle').innerHTML = paused ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
});

// Native scrolling supports swipe, trackpads, keyboard controls, and rail arrows.
const rail = $('#industry-rail');
const stepWidth = () => $('.industry-card').getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap);
$('#industry-next').addEventListener('click', () => rail.scrollBy({ left: stepWidth(), behavior: motion.reduced() ? 'auto' : 'smooth' }));
$('#industry-prev').addEventListener('click', () => rail.scrollBy({ left: -stepWidth(), behavior: motion.reduced() ? 'auto' : 'smooth' }));
function updateRail() {
  const at = Math.min(6, Math.round(rail.scrollLeft / stepWidth()));
  $('#industry-position').textContent = `${String(at + 1).padStart(2, '0')} — 07`;
  $('#industry-prev').disabled = rail.scrollLeft <= 2;
  $('#industry-next').disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
}
rail.addEventListener('scroll', updateRail, { passive: true });
addEventListener('resize', updateRail, { passive: true });
updateRail();
rail.addEventListener('click', event => {
  const button = event.target.closest('[data-industry]'); if (!button) return;
  const index = Number(button.dataset.industry), industry = CONTENT.business.items[index];
  const photo = { 0: 'ecommerce', 2: 'realestate', 3: 'education', 4: 'healthcare' }[index];
  openDialog(`${photo ? `<img class="dialog-photo" src="assets/industries/${photo}.webp" alt="${escapeHTML(industry.title)}">` : ''}<p class="eyebrow">Steps AI for ${escapeHTML(industry.title)}</p><h2>${escapeHTML(industry.title)}</h2><p class="dialog-question">${escapeHTML(industry.paragraphs[0])}</p><p>${escapeHTML(industry.paragraphs[1])}</p><button class="button" data-destination="Book a demo">Book a demo ${arrow}</button>`);
});

let reviewIndex = 0;
function showReview(index) {
  reviewIndex = (index + REVIEWS.length) % REVIEWS.length;
  const review = REVIEWS[reviewIndex];
  const [name, role, brand] = review.attribution.split(' | ');
  $('#review-brand').textContent = review.brand;
  $('#review-quote').textContent = review.quote;
  $('#review-person').textContent = name;
  $('#review-role').textContent = `${role} · ${brand}`;
  $('#review-initials').textContent = name.split(' ').map(part => part[0]).join('');
  $('#review-counter').textContent = `${String(reviewIndex + 1).padStart(2, '0')} / ${String(REVIEWS.length).padStart(2, '0')}`;
  if (!motion.reduced()) $('.review-card').animate([{ opacity: .2, transform: 'translateY(12px) rotate(1deg)' }, { opacity: 1, transform: 'translateY(0) rotate(0)' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
}
$('#review-prev').addEventListener('click', () => showReview(reviewIndex - 1));
$('#review-next').addEventListener('click', () => showReview(reviewIndex + 1));

// Keep each FAQ or setup area easy to scan without forcing any global scroll.
$$('.faq-list details, .setup-steps details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) [...detail.parentElement.children].filter(other => other !== detail && other.tagName === 'DETAILS').forEach(other => { other.open = false; });
}));
