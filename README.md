# Steps AI — Conversations, connected.

A complete responsive website rebuilt from the supplied Steps AI standalone HTML, using the supplied video for composition and motion.

## Run locally

This is a buildless ES-module project. No package installation is required.

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. ES modules require an HTTP server; opening `index.html` with `file://` is not supported.

## Project structure

- `dist/index.html`: accessible, semantic page structure.
- `dist/styles.css`: layout, responsive design, transitions, reduced-motion behavior.
- `dist/app.js`: channel demos, feature explorer, dialogs, carousel, stories; starts the live layer.
- `dist/motion.js`: frame-rate-independent card choreography and scroll motion.
- `dist/motion.css`: motion-specific composition, text masks and responsive/reduced-motion rules.
- `dist/live/` and `dist/live.css`: the live layer (see below).
- `dist/data.js` and `dist/content.json`: content extracted from the supplied application.
- `dist/assets/`: original logos/fonts and optimized copies of the supplied photographs.
- `scripts/render.py`: optional HTML generator using the preserved content.
- `scripts/check.mjs`: asset, content, navigation and motion checks.
- `reference/Steps-AI-Standalone.html`: unmodified original source, including every original asset.
- `docs/analysis.md`: source inventory, timestamped motion map, and verification limits.

Edit CSS and JavaScript directly. Publishing serves `dist/` without a build step.

> **`dist/index.html` is now edited by hand.** The header, live inbox, workflow canvas and closing panel were added directly to it, so `scripts/render.py` no longer matches. Running it would overwrite those sections with the old markup.

## Live layer

Each module in `dist/live/` runs independently, so one failing doesn't stop the others.

- `video.js`: the channel section is a 19-second motion graphic built from live elements, not a video file. The Steps AI hub connects WhatsApp, Instagram, Messenger, website chat and phone calls. Each channel gets a short scene: its badge lights up, messages travel the wire, the agent replies and the result appears. The ending gathers everything into "One platform. Every conversation." The player shrinks when scrolled away and grows to full size and autoplays when it reaches the middle of the screen. There are no player controls: the channel tabs underneath, or the badges around the hub, jump straight to a channel. With reduced motion it shows a still frame, and the tabs show each channel's finished scene.
- `header.js`: floating header. The Steps mark is an SVG with a light pulse running along it; the pulse speeds up when you scroll, hover, or a message arrives. Also: hover mega menus (Product, Solutions), a scroll-aware nav, the "Live" ticker fed by the inbox, and a full-screen menu on phones.
- `flood.js`: any section with `data-flood="#hex"` washes the page in that colour while it fills the screen, then fades back to white. It is on the customer-journey section and the inbox section, both in the brand blue used for “support.” in the hero (`#2c9cfa`). Move or remove the attribute to change where it happens.
- `explorer.js`: each journey feature plays as a scene. Steps light up along a rail you can click to jump between them. Messages type in, and visitors can pick options or type their own reply. The explorer auto-plays through every feature while on screen and pauses on hover or click. The "Bring customers back" stage adds a timing step you can change.
- `inbox.js`: a self-running demo inbox, in a white panel with per-channel colours. Sample customers write in on WhatsApp, Instagram, Messenger and the website, and the AI agent replies. Visitors can type as the customer or the team, take over, hand back, resolve, filter and search. Results (conversations, AI share, first-reply time, details saved, per-channel counts) are counted from the demo session itself.
- `workflow.js`: the follow-up workflow runs itself with real example messages. A light travels the path, the Yes/No branch is chosen from the message, and each step is written to a run log. Steps can be dragged with a mouse. The four setup steps on the left highlight the matching part of the canvas, and step 04 starts a test run.
- `finale.js`: the yellow call-to-action starts as a small pill and opens to full screen as you scroll.
- `footer.js`: navy footer with a cursor-following glow, a live ticker and gliding link highlights. The giant "steps ai" wordmark climbs in like stairs as the footer arrives. Letters near the cursor lift and fill with blue, clicking one sends a wave through the word and speeds up the logo pulse, and the back-to-top button leans toward the pointer.
- `util.js`: shared helpers and the keyword-based reply engine. Every scripted reply comes from the supplied content.

All conversations are illustrations: nothing is sent and no AI backend is called. Everything respects the site's "Reduce motion" switch and the device's reduced-motion setting.

## Included interactions

- Opening fan → compact stack → travel → six-card diagonal cascade, with replay control.
- Five customer-channel scenes with conversation replay.
- Scroll-driven depth arrival, six-card rotation, diagonal spread, and 3 × 2 grid resolution on desktop and mobile.
- Four journey stages and all sixteen feature demonstrations.
- Masked word reveals, growing image stage, scroll-linked image/chat parallax, staggered cards and layered story entrance.
- Opposing integration ribbons with pause control and detail dialogs.
- Live demo inbox with arriving conversations, typed replies, team takeover and session results.
- Self-running, draggable follow-up workflow with a run log.
- Scroll colour flood, interactive logo header with mega menus, and a pill-to-full-screen closing panel.
- Seven-industry carousel with touch scrolling and detail dialogs.
- Ten supplied customer stories.
- Seven FAQs, responsive navigation, native dialogs, keyboard tabs, and reduced motion.

## Content and destination boundaries

The supplied HTML is the source for brand information, capabilities, testimonials, fonts and assets. The reference video's art-marketplace content is not reused. Original photographs are 1254 × 1254; WebP copies retain those dimensions. No invented performance statistics, prices, customers or new photographs were added.

The original project does not include working booking, account, pricing, blog, support, policy, or other external destination URLs. These navigation actions open an honest connection notice instead of implying that an account or booking exists. Interactive product conversations are illustrations; they do not send messages or call an AI backend. Connect the actual production destinations in `destination()` in `dist/app.js` when available.

## Validation

```sh
node scripts/check.mjs
node --check dist/app.js
node --check dist/motion.js
node --check dist/data.js
```

Static and motion-state checks pass. Browser-based visual comparison and device testing could not be performed in this environment because the required browser preview capability was unavailable. This is a verification limitation, not a claim of pixel-identical reproduction.
