// Copy the in-game sprites from the iOS app into public/art/ so the web game
// can render the same art the iOS app ships (frogs, stumps, snakes, and
// saddle snakes). Unlike scripts/sync-reference-art.js (which builds the
// artist reference gallery), these are the actual assets GamePieces.jsx loads.
//
//   npm run art:game            (expects ../FrogsiOS checked out next to this repo)
//   IOS_DIR=/path/to/FrogsiOS/FrogsiOS npm run art:game
//
// The frog/stump sprites ship large (~900px); we downscale them since the
// board renders pieces small. Snake sprites are already tiny and kept as-is.
import { mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import sharp from 'sharp';

const IOS_DIR = resolve(process.env.IOS_DIR || '../FrogsiOS/FrogsiOS');
const OUT_DIR = resolve('public/art');

// Largest PNG inside an .xcassets imageset (the @3x scale when present).
function imagesetPng(name) {
  const dir = join(IOS_DIR, 'Assets.xcassets', `${name}.imageset`);
  const pngs = readdirSync(dir).filter((f) => f.endsWith('.png'));
  if (!pngs.length) throw new Error(`no PNGs in ${dir}`);
  pngs.sort((a, b) => statSync(join(dir, b)).size - statSync(join(dir, a)).size);
  return join(dir, pngs[0]);
}

// [imageset name, max dimension in px | null to keep native size]
const JOBS = [
  ['frog', 320],
  ['frog_blue', 320],
  ['frog_purple', 320],
  ['frog_red', 320],
  ['frog_yellow', 320],
  ['lilypad', 256],
  ['stump', 320],
  ['saddle', 256],
  ['snake2', null],
  ['snake3', null],
  ['snake4', null],
  ['snake5', null],
  ['snake3_saddle', null],
  ['snake4_saddle', null],
  ['snake5_saddle', null],
  // Wizard: portal mouths (id 0=violet, 1=cyan, 2=amber, 3=pink).
  ['portal_violet', 256],
  ['portal_cyan', 256],
  ['portal_amber', 256],
  ['portal_pink', 256],
  // Treasure Hunter: colored stones (raised + _flat) and their switches
  // (id 0=amber, 1=ruby, 2=sapphire, 3=emerald).
  ['stone_amber', 256], ['stone_amber_flat', 256],
  ['stone_ruby', 256], ['stone_ruby_flat', 256],
  ['stone_sapphire', 256], ['stone_sapphire_flat', 256],
  ['stone_emerald', 256], ['stone_emerald_flat', 256],
  ['switch_amber', 256], ['switch_ruby', 256],
  ['switch_sapphire', 256], ['switch_emerald', 256],
];

mkdirSync(OUT_DIR, { recursive: true });
let failures = 0;
for (const [name, maxDim] of JOBS) {
  try {
    let img = sharp(imagesetPng(name));
    if (maxDim) {
      img = img.resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true });
    }
    const outPath = join(OUT_DIR, `${name}.png`);
    await img.png({ compressionLevel: 9 }).toFile(outPath);
    const meta = await sharp(outPath).metadata();
    const kb = Math.round(statSync(outPath).size / 1024);
    console.log(`✓ ${name}.png  ${meta.width}×${meta.height}  ${kb}KB`);
  } catch (e) {
    failures++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}
console.log(failures ? `Done with ${failures} failure(s).` : `Done — game art in public/art/.`);
process.exit(failures ? 1 : 0);
