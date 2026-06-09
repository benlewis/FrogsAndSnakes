// Copy the art currently shipped in the iOS app into public/art-reference so
// the asset portal can show artists what each slot looks like today.
//
//   npm run art:reference            (expects ../FrogsiOS checked out next to this repo)
//   IOS_DIR=/path/to/FrogsiOS/FrogsiOS npm run art:reference
//
// Opaque backgrounds are recompressed to JPEG (the bundled PNGs are 6+ MB);
// transparent sprites are kept as PNG. Output filenames must match the
// `reference.url` values in lib/artRegistry.js.
import { mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import sharp from 'sharp';

const IOS_DIR = resolve(process.env.IOS_DIR || '../FrogsiOS/FrogsiOS');
const OUT_DIR = resolve('public/art-reference');

// Largest PNG inside an .xcassets imageset (the @3x scale when present).
function imagesetPng(name) {
  const dir = join(IOS_DIR, 'Assets.xcassets', `${name}.imageset`);
  const pngs = readdirSync(dir).filter((f) => f.endsWith('.png'));
  if (!pngs.length) throw new Error(`no PNGs in ${dir}`);
  pngs.sort((a, b) => statSync(join(dir, b)).size - statSync(join(dir, a)).size);
  return join(dir, pngs[0]);
}

const JOBS = [
  // [source, output, format] — backgrounds live loose in the app bundle.
  ...['pond', 'starter', 'intermediate', 'advanced', 'cowboy'].map((n) => [
    join(IOS_DIR, `${n}_background.png`), `${n}_background.jpg`, 'jpeg',
  ]),
  ...['frog', 'frog_blink', 'lilypad', 'stump', 'celebration_ring', 'star', 'star_empty',
      'snake2', 'snake2_blink', 'snake3', 'snake3_blink',
      'snake4', 'snake4_blink', 'snake5', 'snake5_blink',
  ].map((n) => [imagesetPng(n), `${n}.png`, 'png']),
];

mkdirSync(OUT_DIR, { recursive: true });
let failures = 0;
for (const [src, out, format] of JOBS) {
  try {
    if (!existsSync(src)) throw new Error('source not found');
    const img = sharp(src);
    const pipeline = format === 'jpeg'
      ? img.jpeg({ quality: 82, mozjpeg: true })
      : img.png({ compressionLevel: 9 });
    const { width, height } = await img.metadata();
    await pipeline.toFile(join(OUT_DIR, out));
    const kb = Math.round(statSync(join(OUT_DIR, out)).size / 1024);
    console.log(`✓ ${out}  ${width}×${height}  ${kb} KB`);
  } catch (e) {
    failures++;
    console.error(`✗ ${out}: ${e.message} (${src})`);
  }
}
console.log(failures ? `Done with ${failures} failure(s).` : `Done — ${JOBS.length} reference images in public/art-reference.`);
process.exit(failures ? 1 : 0);
