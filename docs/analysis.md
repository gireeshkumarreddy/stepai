# Steps AI: source inventory and motion map

## Content source
One supplied standalone page with embedded React application. No functioning external routes or submission endpoints: pricing, booking, login, policies, and resource destinations all opened a design-preview dialog. Rebuild retains the supplied labels and explains missing destinations without simulating successful submission.

Sections: hero; five channel demonstrations; customer journey (four stages, sixteen features with examples); shared inbox and four team capabilities; setup (six features including integrations and shareable agent page); seven industries; ten supplied customer quotes; seven FAQs; final CTA; six footer link groups.

Assets: 21 originals — four 1254 × 1254 industry PNGs (ecommerce, education, healthcare, real estate), Steps logo, four channel PNGs, eight integration SVGs, favicon and three utility SVGs. Fonts: embedded Manrope variable and DM Sans variable. No source videos. No new product or customer imagery introduced. All original assets retained. Source palette: navy #0c3474, blue #2c9cfa, yellow #f8b403, pale blue #c4ecfc, paper #fcfcfc.

Original behavior: responsive widths at 1150/1100/1000/900/850/760/700/550/359; mobile nav; stage and feature tabs; illustrative chat playback; channel selection; team takeover; workflow test; expanding industry selection; review navigation; integration movement; FAQs; destination dialog. Original decorative icons use the Lucide language. Main text is exported in content.json; source demonstration and review data in data.js. Supplied testimonials are reused without additional claims.

## Reference video observation
39.96 seconds, 402 × 406 including player surround. Reviewed full sequence as one-second frames and denser key transitions. The player surround and unrelated art-marketplace content are excluded from the design.

| Time | Observed experience | Steps AI mapping |
|---|---|---|
| 0–3 s | Compact central card stack fans into descending diagonal; left headline reveals line by line | Original industry cards unfold beside the Steps AI headline; staggered clipped text |
| 3–8 s | Wide rounded image stage, asymmetric heading, floating labels, persistent header | Five selectable channel scenes with original photos, conversation overlays, playback control |
| 8–9 s | Thin logo band and generous whitespace | Existing channel marks and names, no invented trust claims |
| 9–14 s | Central stacked cards rotate and spread across the sentence, then resolve into a grid | Scroll-pinned customer journey scene: stack → diagonal → structured four-card grid |
| 14–17 s | Split editorial text and image grid; scattered icons | Interactive four-stage product explorer with all sixteen supplied features |
| 17–20 s | Two offset moving rows surrounding a centered heading | Original integration logos in opposing ribbons; pause control |
| 20–24 s | Centered statement into staggered two-column editorial panels | Shared inbox demonstration and setup/workflow demonstration |
| 25–27 s | Horizontal cards with controls | Industry carousel with four source photographs and three content-based visuals |
| 28–31 s | A featured vertical card appears over a wider collage | Original customer story deck with a foreground quote and offset background cards |
| 31–33 s | Compact explanatory section with selectable cards | FAQs and source-only destination handling, no invented prices |
| 34–36 s | Bright full-width panel, running text and floating outline marks | Brand-yellow final CTA with a moving channel strip |
| 37–39 s | Paired visual panels and multi-column footer | Existing agent-page and human-team content followed by complete footer |

## Interaction and responsive plan
Native vertical scroll; requestAnimationFrame transforms on pinned composition only. No wheel interception. Mouse movement adds bounded depth on desktop. Clickable stage, channel and solution controls. Keyboard roving tabs and Escape-to-close menu/dialog. Reduced motion removes pinning, parallax and autonomous motion, revealing all content. Tablet uses smaller card groups; mobile uses a designed vertical story and swipeable industry rail, avoids scroll-pinning and keeps controls reachable.

## Verification scope
Browser QA is unavailable in this runtime because the required control-browser capability is not provided. Use syntax, asset, content, link-target and motion-state checks. Do not claim screenshot comparison or device browser testing. Production booking, account, pricing, resource and policy URLs were not supplied and remain clearly marked for connection.

## Motion revision after user review

The first pass flattened the opening to a simple unfold, used four cards in the pinned section, and omitted several transitions. Re-reviewed the 0–4 s opening at 3 frames/second and the 9–14 s central transition at 4 frames/second.

Revision restores the initial six-card fan; collapse into a compact stack; lateral travel; staggered diagonal unfolding; scroll-driven card entry from depth; grouped tilt; six-card diagonal separation; staggered resolution into a 3 × 2 grid. The sequence now also runs on mobile, with a smaller centered grid and native touch scrolling. Added word masks and staggered reveals, growing wide-image stage, image/chat parallax, staggered industry cards, layered story-card entry, and scroll-linked final icons. Opening replay is available in the hero.

Scroll is never intercepted. Visual layers use cached layout measurements and exponential damping (72 ms time constant) so interpolation is independent of screen refresh rate. The loop sleeps after movement settles. User/device reduced-motion settings preserve a static, complete layout.

Verification: syntax and source-content checks pass; sampled 1,001 positions of the six-card scroll timeline at seven viewport sizes and 301 opening times per card; all transforms are finite, phase boundaries continuous, and final grids fit without overlap. Browser visual comparison remains unavailable; no exact-match claim is made.
