import { createResponder } from './util.js';
import { initHeader } from './header.js';
import { initFlood } from './flood.js';
import { initInbox } from './inbox.js';
import { initWorkflow } from './workflow.js';
import { initFinale } from './finale.js';
import { initFooter } from './footer.js';
import { initVideo } from './video.js';
export { createDemoPlayer, createAutoplay } from './explorer.js';

// Everything that makes the page feel live. Each part fails on its own without
// taking the rest of the page down.
export function initLive({ reduced, DEMOS, CHANNELS, CONTENT }) {
  const respond = createResponder({ DEMOS, CHANNELS, CONTENT });
  const parts = [
    () => initVideo({ reduced, CHANNELS, DEMOS }),
    () => initHeader({ reduced }),
    () => initFlood(),
    () => initInbox({ DEMOS, CHANNELS, respond, reduced }),
    () => initWorkflow({ DEMOS, CHANNELS, reduced }),
    () => initFinale({ reduced }),
    () => initFooter({ reduced })
  ];
  parts.forEach(start => { try { start(); } catch (error) { console.error(error); } });
  return { respond };
}
