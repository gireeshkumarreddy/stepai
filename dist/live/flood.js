import { $, $$, smooth } from './util.js';

// Sections marked data-flood="#hex" wash the whole page in that colour while
// they own the viewport, then hand back to white as you scroll past.
export function initFlood() {
  const zones = $$('[data-flood]');
  const layer = $('.flood-layer');
  const theme = $('meta[name="theme-color"]');
  if (!zones.length || !layer) return;
  let frame = 0;

  function update() {
    frame = 0;
    const vh = innerHeight;
    let strongest = 0, colour = zones[0].dataset.flood;
    zones.forEach(zone => {
      const rect = zone.getBoundingClientRect();
      const enter = smooth(vh * .85, vh * .32, rect.top);
      const exit = smooth(vh * .92, vh * .42, rect.bottom);
      const amount = enter * (1 - exit);
      zone.style.setProperty('--fl', amount.toFixed(3));
      if (amount > strongest) { strongest = amount; colour = zone.dataset.flood; }
    });
    layer.style.backgroundColor = colour;
    layer.style.opacity = strongest.toFixed(3);
    theme?.setAttribute('content', strongest > .5 ? colour : '#fcfcfc');
  }
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  update();
}
