import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/catalog.json'), 'utf8'));
const { entries, summary } = catalog;
assert.doesNotMatch(JSON.stringify(catalog), /(?:^|["\s])[A-Za-z]:[\\/]/, 'Public catalog must not expose drive paths');
assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length, 'Catalog IDs must be unique');
assert.equal(summary.entries, entries.length, 'Catalog count must match summary');
for (const [source, count] of Object.entries(summary.sources)) {
  assert.equal(entries.filter(entry => entry.source === source).length, count, source);
}
for (const [preview, count] of Object.entries(summary.previews)) {
  assert.equal(entries.filter(entry => entry.preview === preview).length, count, preview);
}
const files = new Set();
function checkMedia(url) {
  if (!url) return;
  assert.match(url, /^\/(media|assets)\//, 'Preview media must be local');
  const filename = path.resolve(root, 'public', '.' + url);
  assert.ok(filename.startsWith(path.join(root, 'public') + path.sep), 'Media path must remain inside public/');
  assert.ok(fs.statSync(filename).isFile(), `Missing media: ${url}`);
  files.add(filename);
}
for (const entry of entries) {
  assert.ok(entry.name && entry.source && entry.origins?.length, `Incomplete entry: ${entry.id}`);
  assert.ok(entry.origins.every(origin => origin.startsWith('donor://')), `Use donor-relative origins: ${entry.id}`);
  checkMedia(entry.thumbnail);
  checkMedia(entry.animation);
  for (const texture of entry.textures || []) checkMedia(texture.url);
  for (const system of entry.systems || []) checkMedia(system.texture);
  if (entry.preview === 'recording') assert.ok(entry.animation, `Recording missing: ${entry.id}`);
  if (entry.preview === 'unity-adapted') assert.ok(entry.systems.length > 0, `Particle data missing: ${entry.id}`);
}
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/source-inventory.json'), 'utf8'));
assert.ok(inventory.files.every(file => file.path.startsWith('donor://')), 'Inventory must use donor-relative paths');
assert.equal(new Set(inventory.files.map(file => file.sha256)).size, summary.uniqueFiles);
assert.equal(inventory.files.length, summary.sourceFiles);
console.log(`Catalog verified: ${entries.length} entries, ${files.size} preview media, ${summary.uniqueFiles} original SHA-256 records.`);
