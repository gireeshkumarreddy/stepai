import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { cardPose, heroPose, smoothstep } from '../dist/motion.js';
import { CONTENT, DEMOS, CHANNELS, REVIEWS } from '../dist/data.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `Missing anchor ${target}`);
for (const [, asset] of html.matchAll(/(?:src|href)="((?:assets\/|app\.js|styles\.css)[^"]*)"/g)) assert.ok(fs.existsSync(path.join(dist, asset)), `Missing asset: ${asset}`);
for (const [, file] of html.matchAll(/rel="(?:modulepreload|preload|stylesheet)" href="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(dist, file)), `Missing preloaded file: ${file}`);
for (const [, asset] of fs.readFileSync(path.join(dist, 'styles.css'), 'utf8').matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assert.ok(fs.existsSync(path.join(dist, asset)), `Missing CSS asset: ${asset}`);
const liveFiles = fs.readdirSync(path.join(dist, 'live')).map(name => `live/${name}`);
for (const file of ['app.js', 'motion.js', ...liveFiles]) {
  const script = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const [, id] of script.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)) assert.ok(ids.includes(id), `Missing DOM target in ${file}: ${id}`);
}
assert.equal(CONTENT.journey.stages.length, 4);
assert.equal(DEMOS.length, 4);
for (let stage = 0; stage < 4; stage++) {
  assert.equal(CONTENT.journey.stages[stage].items.length, 4);
  assert.equal(DEMOS[stage].length, 4);
  DEMOS[stage].forEach(demo => ['title', 'channel', 'contextLabel', 'context', 'question', 'answer', 'result', 'footnote'].forEach(key => assert.ok(demo[key], `Missing demo ${key}`)));
}
assert.equal(CHANNELS.length, 5);
assert.equal(REVIEWS.length, 10);
assert.equal(CONTENT.business.items.length, 7);
assert.equal(CONTENT.faq.items.length, 7);
assert.equal((html.match(/class="orbit-card oc-/g) || []).length, 6);
for (const [width, height] of [[320, 570], [390, 740], [699, 800], [768, 600], [1024, 680], [1440, 812], [1920, 1000]]) {
  const mobile = width <= 699;
  const cardWidth = mobile ? Math.max(85, Math.min(145, width * .24)) : Math.max(100, Math.min(210, width * .145));
  const cardHeight = cardWidth / .79;
  for (let step = 0; step <= 1000; step++) {
    for (let index = 0; index < 6; index++) {
      const pose = cardPose(index, step / 1000, width, height, cardWidth, cardHeight, mobile);
      for (const value of Object.values(pose)) assert.ok(Number.isFinite(value), 'Motion must remain finite');
      assert.ok(pose.x > 0 && pose.x < width, 'Cards must stay in the composition');
      assert.ok(pose.a >= 0 && pose.a <= 1, 'Opacity stays bounded');
      if (step > 0) {
        const previous = cardPose(index, (step - 1) / 1000, width, height, cardWidth, cardHeight, mobile);
        assert.ok(Math.hypot(pose.x - previous.x, pose.y - previous.y) < width * .012, 'No positional jump between timeline phases');
        assert.ok(Math.abs(pose.r - previous.r) < 1, 'No rotation jump between phases');
      }
    }
  }
  const final = [0,1,2,3,4,5].map(i => cardPose(i, 1, width, height, cardWidth, cardHeight, mobile));
  for (let i = 0; i < 3; i++) {
    assert.equal(final[i].y, final[0].y);
    assert.equal(final[i+3].y, final[3].y);
    assert.equal(final[i].x, final[i+3].x);
    assert.equal(final[i].r, 0);
  }
  assert.ok(final[1].x - final[0].x > cardWidth, 'Resolved columns must not overlap');
  assert.ok(final[3].y - final[0].y > cardHeight, 'Resolved rows must not overlap');
  assert.ok(final[0].x - cardWidth / 2 >= 0 && final[2].x + cardWidth / 2 <= width, 'Full final grid fits screen');
  for (let t = 0; t <= 300; t++) for (let i = 0; i < 6; i++) {
    const pose = heroPose(i, t / 100, width, height, mobile);
    for (const value of Object.values(pose)) assert.ok(Number.isFinite(value), 'Opening poses must remain finite');
    if (t) {
      const previous = heroPose(i, (t-1)/100, width, height, mobile);
      assert.ok(Math.hypot(pose.x-previous.x,pose.y-previous.y) < width * .03, 'Opening phases must connect without a jump');
    }
  }
}
assert.equal(smoothstep(.3, .7, 0), 0);
assert.equal(smoothstep(.3, .7, 1), 1);
// Validate exactly the supplied data, without substituting brand content.
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dist, 'content.json'), 'utf8')), CONTENT);
assert.ok(fs.readFileSync(path.join(root, 'reference/Steps-AI-Standalone.html'), 'utf8').includes('window.__stepsAssets='));
assert.ok(!html.includes('Lorem ipsum'));
console.log('PASS: assets, links, IDs, DOM targets, complete source content, 16 demos, 5 channels, 7 industries, 10 stories, 7 FAQs, and six-card choreography, continuous opening/scroll transitions, and responsive motion states.');
console.log('Browser visual and device QA: unavailable in this environment; not claimed.');
