// Art pipeline — canonical registry of replaceable game assets ("slots").
//
// This file is the SOURCE OF TRUTH for which assets exist and what shape the
// artist's replacement must be. The `art_slots` DB table is just a synced
// mirror of this list (see seedArtSlots) so the portal can JOIN it against
// per-slot upload/review state in `art_uploads`.
//
// To add/curate a slot: edit ART_SLOTS, then re-run `npm run db:setup`
// (production) — the dev server re-seeds on every startup.
//
// `spec.state`:
//   'baked'       — real art already ships in the app; replacing is optional.
//   'placeholder' — currently procedural/synthesized; needs real art.
// `spec.transparent` — whether the PNG must preserve alpha (validated on upload).
// `spec.width`/`spec.height` — required pixel dimensions, validated on upload
//   (±2px). Set for every slot whose renderer depends on exact size/registration.
// `spec.assetName` — the in-app resource name this slot overrides. The iOS
//   AssetStore keys its download cache by this, so it must match the name the
//   app passes to UIImage(named:)/Bundle lookups.
// `spec.instructions` — the artist brief shown in the portal: what the piece
//   is, how it's used in-game, and any registration/style constraints.
// `spec.group` / `spec.frame` — slots that are frames or variants of ONE
//   artwork (idle + blink, the four jewel colors, ...) share a `group` label
//   and carry a short `frame` name; the portal renders them as one block.
// `spec.reference` — { url, width, height } of the CURRENT in-app art, served
//   from /public/art-reference (regenerate with `npm run art:reference`).
//   Absent when the current look is procedural/synthesized (nothing to show).

/** @typedef {{slotId:string, category:string, displayName:string, sort:number, spec:object}} ArtSlot */

const ref = (file, width, height) => ({ url: `/art-reference/${file}`, width, height });

const STYLE = 'Match the painted, storybook look of the existing art (see reference).';

const bg = (slotId, displayName, sort, state, assetName, instructions, reference) => ({
  slotId, category: 'background', displayName, sort,
  spec: { kind: 'image', width: 1536, height: 2752, transparent: false,
          formats: ['png', 'jpg'], aspect: '9:16 portrait, full-bleed',
          state, assetName, instructions, ...(reference ? { reference } : {}) },
});

const BG_COMMON = `Full-screen backdrop, 1536×2752px (9:16 portrait), PNG or JPG, no transparency.
Drawn full-bleed: edges may be cropped slightly on different devices, so keep nothing critical within ~80px of any edge.
The puzzle board floats over the middle of the image and the HUD sits across the top ~12%, so keep the center and top relatively calm — big shapes and texture, no fine details that would fight with game pieces.
${STYLE}`;

const snakeInstructions = (n, blink) => `Snake piece, ${n} board cells long, drawn vertically with the head at the TOP pointing up.
Required size: exactly 62×${[0, 0, 197, 295, 394, 492][n]}px — width is uniform across all snake lengths and height is ~98.4px per cell, which the renderer relies on to scale snakes to the board.
Transparent PNG (alpha channel required); the snake should fill the width edge-to-edge so adjacent cells line up.
${blink
  ? 'This is the BLINK frame: identical pose and outline to the idle frame with the eyes closed. It must register pixel-perfect with the idle frame — only the eyes change. Easiest workflow: duplicate the idle file and repaint just the eyes.'
  : 'This is the idle (default) frame. A matching blink frame slot exists — design the eyes so a closed-eye variant reads well at game size.'}
${STYLE}`;

const snake = (n, blink) => ({
  slotId: blink ? `snake${n}_blink` : `snake${n}`,
  category: 'snake',
  displayName: `Snake length ${n}${blink ? ' (blink frame)' : ' (idle)'}`,
  sort: 100 + n * 10 + (blink ? 1 : 0),
  spec: { kind: 'image', transparent: true, formats: ['png'],
          width: 62, height: [0, 0, 197, 295, 394, 492][n],
          state: 'baked',
          group: `Snake length ${n}`, frame: blink ? 'Blink frame' : 'Idle frame',
          assetName: blink ? `snake${n}_blink` : `snake${n}`,
          instructions: snakeInstructions(n, blink),
          reference: ref(`snake${n}${blink ? '_blink' : ''}.png`, 62, [0, 0, 197, 295, 394, 492][n]) },
});

const piece = (slotId, displayName, sort, opts) => ({
  slotId, category: 'piece', displayName, sort,
  spec: { kind: 'image', transparent: true, formats: ['png'],
          state: opts.state, assetName: slotId,
          ...(opts.group ? { group: opts.group, frame: opts.frame } : {}),
          ...(opts.width ? { width: opts.width, height: opts.height } : {}),
          instructions: opts.instructions,
          ...(opts.reference ? { reference: opts.reference } : {}) },
});

const sfx = (slotId, displayName, sort, instructions) => ({
  slotId, category: 'sound', displayName, sort,
  spec: { kind: 'audio', role: 'sfx', formats: ['wav', 'm4a', 'mp3'],
          state: 'placeholder', assetName: slotId,
          instructions: `${instructions}
Short one-shot effect, under 2 seconds; mono is fine. WAV, M4A, or MP3 (the app converts to mono 44.1kHz). Keep the start instant — no leading silence. Current in-app sound is synthesized placeholder audio.` },
});

const music = (slotId, displayName, sort, instructions) => ({
  slotId, category: 'sound', displayName, sort,
  spec: { kind: 'audio', role: 'music', formats: ['m4a', 'mp3'],
          state: 'placeholder', assetName: slotId,
          instructions: `${instructions}
Seamless loop, 30–90 seconds, M4A or MP3. The loop point must be inaudible — it plays continuously during gameplay. Keep it mellow enough to sit under sound effects.` },
});

const levelSet = (slotId, displayName, sort) => ({
  slotId, category: 'level', displayName, sort,
  spec: { kind: 'json', formats: ['json'], state: 'baked', assetName: slotId,
          instructions: 'Baked chapter level set (design content, not art). JSON produced by the level editor — only upload here if you know what you are doing.' },
});

/** @type {ArtSlot[]} */
export const ART_SLOTS = [
  // ---- Backgrounds (full-screen portrait backdrops) ----
  bg('bg_pond', 'Pond — default background', 10, 'baked', 'pond_background',
    `${BG_COMMON}
This is the default backdrop for all early chapters and menus: a sunny lily pond — water, pads, reeds, soft sky. Note: the currently shipped file is an older 585×1059 image; a new upload should be delivered at the full 1536×2752.`,
    ref('pond_background.jpg', 585, 1059)),
  bg('bg_starter', 'Starter chapters background', 20, 'baked', 'starter_background',
    `${BG_COMMON}
Backdrop for the Starter (tier 1) chapters. Bright, welcoming daytime pond — this is the first thing new players see.`,
    ref('starter_background.jpg', 1536, 2752)),
  bg('bg_intermediate', 'Intermediate chapters background', 30, 'baked', 'intermediate_background',
    `${BG_COMMON}
Backdrop for the Intermediate (tier 2) chapters. Same pond world, but visibly a step up in mood from Starter — e.g. golden-hour light or denser foliage.`,
    ref('intermediate_background.jpg', 1536, 2752)),
  bg('bg_advanced', 'Advanced chapters background', 40, 'baked', 'advanced_background',
    `${BG_COMMON}
Backdrop for the Advanced (tier 3) chapters. The most dramatic of the tier backgrounds — dusk/night or stormier palette to signal difficulty.`,
    ref('advanced_background.jpg', 1536, 2752)),
  bg('bg_cowboy', 'Cowboy chapter background', 50, 'baked', 'cowboy_background',
    `${BG_COMMON}
Backdrop for the Cowboy chapter (frogs ride saddled snakes). Western desert pond: mesas, cacti, warm dusty palette.`,
    ref('cowboy_background.jpg', 1536, 2752)),
  bg('bg_wizard', 'Wizard chapter background', 60, 'placeholder', 'wizard_background',
    `${BG_COMMON}
NEEDED — no art exists yet; the app currently falls back to the pond background. Backdrop for the Wizard chapter (magic orbs teleport the frog). Mystical night pond: moonlit water, glowing runes/fireflies, purples and deep blues.`),
  bg('bg_treasure', 'Treasure Hunter chapter background', 70, 'placeholder', 'treasure_background',
    `${BG_COMMON}
NEEDED — no art exists yet; the app currently falls back to the pond background. Backdrop for the Treasure Hunter chapter (pressure plates and treasure stones). Jungle-temple pond: mossy stone ruins, gold accents, lush greens.`),

  // ---- Frog (the player character) ----
  piece('frog', 'Frog (idle)', 90, {
    state: 'baked', width: 992, height: 900,
    group: 'Frog', frame: 'Idle frame',
    instructions: `The player character, shown resting on a lily pad, facing the camera/up. Required size: exactly 992×900px, transparent PNG.
The frog should sit centered with a little breathing room — it is scaled down to a board cell, so keep shapes bold and readable at ~80px.
A matching blink frame slot exists and must register with this one.
${STYLE}`,
    reference: ref('frog.png', 992, 900),
  }),
  piece('frog_blink', 'Frog (blink frame)', 91, {
    state: 'baked', width: 992, height: 900,
    group: 'Frog', frame: 'Blink frame',
    instructions: `Blink frame for the frog: identical pose and outline to the idle frame with the eyes closed. Required size: exactly 992×900px, transparent PNG.
Must register pixel-perfect with the idle frame — the game swaps the two textures in place to blink, so ONLY the eyes may differ. Easiest workflow: duplicate the idle file and repaint just the eyes.`,
    reference: ref('frog_blink.png', 992, 900),
  }),

  // ---- Colored frog variants (recolors of the base green frog) ----
  ...['red', 'blue', 'yellow', 'purple'].flatMap((color, i) => [
    piece(`frog_${color}`, `Frog — ${color} (idle)`, 92 + i * 2, {
      state: 'placeholder', width: 992, height: 900,
      group: `Frog — ${color}`, frame: 'Idle frame',
      instructions: `NEEDED — a ${color} variant of the frog. Required size: exactly 992×900px, transparent PNG.
Recolor of the base green frog (shown as reference): identical pose, silhouette, and registration — the easiest workflow is duplicating the green frog file and repainting the colors.
Keep the eyes white and the belly light so the face still reads at game size; markings/spots can differ from the green frog as long as the outline doesn't.
A matching blink frame slot exists and must register with this one.
${STYLE}`,
      reference: ref('frog.png', 992, 900),
    }),
    piece(`frog_${color}_blink`, `Frog — ${color} (blink frame)`, 93 + i * 2, {
      state: 'placeholder', width: 992, height: 900,
      group: `Frog — ${color}`, frame: 'Blink frame',
      instructions: `Blink frame for the ${color} frog: identical to its idle frame with the eyes closed. Required size: exactly 992×900px, transparent PNG.
Must register pixel-perfect with the ${color} idle frame — the game swaps the two textures in place to blink, so ONLY the eyes may differ. Easiest workflow: duplicate the ${color} idle file and repaint just the eyes.`,
      reference: ref('frog_blink.png', 992, 900),
    }),
  ]),

  // ---- Snakes (per length, idle + blink) ----
  snake(2, false), snake(2, true),
  snake(3, false), snake(3, true),
  snake(4, false), snake(4, true),
  snake(5, false), snake(5, true),

  // ---- Saddled snakes (Cowboy chapter: composite art, saddle painted in) ----
  // The game prefers these over base snake + saddle overlay when uploaded.
  // Saddle cell counts from the head (top): segments.count / 2.
  ...[[3, '2nd'], [4, '3rd'], [5, '3rd (middle)']].flatMap(([n, cell]) => [
    {
      slotId: `snake${n}_saddle`, category: 'snake',
      displayName: `Saddled snake length ${n} (idle)`, sort: 100 + n * 10 + 2,
      spec: { kind: 'image', transparent: true, formats: ['png'],
        width: 62, height: [0, 0, 197, 295, 394, 492][n],
        state: 'placeholder', assetName: `snake${n}_saddle`,
        group: `Saddled snake length ${n}`, frame: 'Idle frame',
        instructions: `NEEDED — the length-${n} snake with a western saddle painted on (Cowboy chapter; a frog rides the saddle). Currently the game pastes a separate saddle drawing on top of the base snake, which is why integrated art will look much better — straps can wrap the body and the shading can match.
Required size: exactly 62×${[0, 0, 197, 295, 394, 492][n]}px, transparent PNG — identical canvas and registration as the base length-${n} snake (use it as the starting point; reference shown).
The saddle sits on the ${cell} cell from the head (the head is the top cell, ~98.4px per cell). Leather browns with gold trim; it must read as "landable seat" at game size.
A matching blink frame slot exists — without it the saddled snake simply won't blink.
${STYLE}`,
        reference: ref(`snake${n}.png`, 62, [0, 0, 197, 295, 394, 492][n]) },
    },
    {
      slotId: `snake${n}_saddle_blink`, category: 'snake',
      displayName: `Saddled snake length ${n} (blink frame)`, sort: 100 + n * 10 + 3,
      spec: { kind: 'image', transparent: true, formats: ['png'],
        width: 62, height: [0, 0, 197, 295, 394, 492][n],
        state: 'placeholder', assetName: `snake${n}_saddle_blink`,
        group: `Saddled snake length ${n}`, frame: 'Blink frame',
        instructions: `Blink frame for the saddled length-${n} snake: identical to its idle frame with the eyes closed. Required size: exactly 62×${[0, 0, 197, 295, 394, 492][n]}px, transparent PNG.
Must register pixel-perfect with the saddled idle frame — ONLY the eyes may differ. Easiest workflow: duplicate the saddled idle file and repaint just the eyes.`,
        reference: ref(`snake${n}_blink.png`, 62, [0, 0, 197, 295, 394, 492][n]) },
    },
  ]),

  // ---- Static pieces ----
  piece('lilypad', 'Lily pad', 200, {
    state: 'baked', width: 931, height: 838,
    instructions: `Landing pad the frog rests on. Top-down view, sits flat on the water. Required size: exactly 931×838px, transparent PNG.
One lily pad fills one board cell, and the frog sprite is drawn on top of it — keep the center fairly flat/plain so the frog reads clearly, with detail (notch, veins, water ripple) toward the edges.
${STYLE}`,
    reference: ref('lilypad.png', 931, 838),
  }),
  piece('stump', 'Log / stump', 210, {
    state: 'baked', width: 932, height: 932,
    instructions: `Obstacle the frogs leap over — should read as a fallen log / tree stump seen from above. Required size: exactly 932×932px, transparent PNG.
Occupies one board cell; nothing is ever drawn on top of it, so it can be as detailed as you like, but it must read as "blocked, not landable" at a glance.
${STYLE}`,
    reference: ref('stump.png', 932, 932),
  }),
  piece('saddle', 'Cowboy saddle overlay (fallback)', 220, {
    state: 'placeholder',
    instructions: `A standalone western saddle, drawn top-down with the horn pointing up, overlaid on a snake's middle segment to mark it rideable (Cowboy chapter). Currently drawn procedurally in-code.
NOTE: this is the FALLBACK look — the preferred approach is the "Saddled snake" composite slots in the Snakes section, where the saddle is painted into the snake art. This overlay is only shown for snakes without composite art.
Suggested size: ~512×512px, transparent PNG. It is drawn at about two-thirds of a board cell on top of the snake body, so it needs a strong silhouette: leather browns, gold trim, raised cantle at the back, horn at the front.
${STYLE}`,
  }),
  piece('star', 'Star (earned)', 230, {
    state: 'baked', width: 300, height: 300,
    group: 'Stars', frame: 'Earned (filled)',
    instructions: `Filled star shown on level-complete and chapter screens when the player earns it (up to 3 per level). Required size: exactly 300×300px, transparent PNG.
Bright gold, slight outline so it pops on both light and dark panels. Must pair visually with the empty-star slot — same silhouette, different fill.`,
    reference: ref('star.png', 300, 300),
  }),
  piece('star_empty', 'Star (empty)', 231, {
    state: 'baked', width: 300, height: 300,
    group: 'Stars', frame: 'Empty (unearned)',
    instructions: `Unearned star shown next to filled stars on level-complete and chapter screens. Required size: exactly 300×300px, transparent PNG.
Same silhouette as the earned star (they appear side by side), but clearly "off": grey/desaturated outline or hollow fill.`,
    reference: ref('star_empty.png', 300, 300),
  }),
  piece('celebration_ring', 'Celebration ring', 240, {
    state: 'baked', width: 1032, height: 1032,
    instructions: `Burst/ring effect that expands and fades around the frog when a level is completed. Required size: exactly 1032×1032px, transparent PNG.
Centered radial design (ring of sparkles, petals, or light) with a fully transparent center and edges — the game scales it up while fading out, so it should look good stretched.`,
    reference: ref('celebration_ring.png', 1032, 1032),
  }),

  // ---- Treasure Hunter pieces (4 jewel colors each) ----
  // The current art is baked from the old procedural drawings
  // (Tools/generate_piece_assets.swift in the iOS repo) — real art welcome.
  ...['amber', 'ruby', 'sapphire', 'emerald'].flatMap((color, i) => [
    piece(`plate_${color}`, `Pressure plate — ${color}`, 250 + i, {
      state: 'baked', width: 640, height: 640,
      group: 'Pressure plates', frame: color[0].toUpperCase() + color.slice(1),
      instructions: `Floor button for the Treasure Hunter chapter, in the ${color} jewel color. While a frog stands on it, the matching-color stones sink flat; step off and they rise again. Required size: exactly 640×640px, transparent PNG.
Drawn flat / top-down so a frog clearly reads as standing ON it — a recessed housing with a colored button works well (see reference, baked from the old drawn-in-code look). The game pulses its opacity, so no painted-in glow needed.
All four plate colors appear together in levels and must share one design, recolored. The four colors are amber, ruby, sapphire, emerald.
${STYLE}`,
      reference: ref(`plate_${color}.png`, 640, 640),
    }),
    piece(`stone_${color}`, `Treasure gem — ${color} (raised)`, 260 + i * 2, {
      state: 'baked', width: 380, height: 560,
      group: `Treasure stone — ${color}`, frame: 'Raised gem',
      instructions: `Raised treasure stone in the ${color} jewel color: a tall faceted gem frogs must leap over (they can't land on it). Sinks flat when a frog stands on the matching plate. Required size: exactly 380×560px, transparent PNG.
The gem should sit in the upper part of the canvas with its ground shadow near the bottom — the canvas center lines up with the board cell center (see reference for placement). The game bobs it gently, so it should look good floating a few pixels up and down.
Must pair visually with its flat-tile slot — same jewel, two heights. All four colors share one design, recolored.
${STYLE}`,
      reference: ref(`stone_${color}.png`, 380, 560),
    }),
    piece(`stone_${color}_flat`, `Treasure tile — ${color} (flat)`, 261 + i * 2, {
      state: 'baked', width: 420, height: 420,
      group: `Treasure stone — ${color}`, frame: 'Flat tile',
      instructions: `The flat state of the ${color} treasure stone: a low inlaid tile flush with the board that frogs CAN land on. Required size: exactly 420×420px, transparent PNG.
Top-down, clearly "down": it should read as safe ground at a glance, in contrast to the raised gem. Keep the center calm — a frog sprite is drawn on top of it. Must pair visually with the raised-gem slot (same jewel, two heights).
${STYLE}`,
      reference: ref(`stone_${color}_flat.png`, 420, 420),
    }),
  ]),

  // ---- Wizard chapter portals (4 colors) ----
  // Current art is baked from the old procedural vortex
  // (Tools/generate_piece_assets.swift in the iOS repo) — real art welcome.
  ...['violet', 'cyan', 'amber', 'pink'].map((color, i) =>
    piece(`portal_${color}`, `Portal — ${color}`, 290 + i, {
      state: 'baked', width: 640, height: 640,
      group: 'Portals', frame: color[0].toUpperCase() + color.slice(1),
      instructions: `One mouth of a ${color} portal pair (Wizard chapter): two same-colored mouths are linked, and a frog that hops into one pops out of the other. Required size: exactly 640×640px, transparent PNG.
Draw the portal disc seen from above: a dark "hole in the pond" well with a swirl design and a bright center (see reference, baked from the old drawn-in-code vortex). IMPORTANT: the game spins this whole image continuously — keep the outer rim radially symmetric so only the swirl reads as motion, and keep everything inside the circular well (corners fully transparent).
The game adds a pulsing colored glow underneath and orbiting sparkles on top, so don't paint those in. Both mouths of a pair use the same image. All four colors appear in levels and must share one design, recolored: violet, cyan, amber, pink.
${STYLE}`,
      reference: ref(`portal_${color}.png`, 640, 640),
    })),

  // ---- Sounds ----
  sfx('sfx_tap',    'SFX — tap / select',   300, 'Played when the player taps a frog to select it. Light, positive "blip" — this is the most frequent sound in the game, so it must not get annoying.'),
  sfx('sfx_hop',    'SFX — frog hop',       310, 'Played when a frog leaps over another piece. A quick springy "boing"/jump sound.'),
  sfx('sfx_land',   'SFX — frog land',      320, 'Played when a leaping frog lands on a lily pad. Soft wet "plop" — pairs with the hop sound as one motion.'),
  sfx('sfx_win',    'SFX — level complete', 330, 'Played once when the puzzle is solved. Short happy fanfare or chord — celebratory but small enough to hear many times an hour.'),
  sfx('sfx_star',   'SFX — star earned',    340, 'Played per star as they pop in on the level-complete screen (up to 3 in a row). A bright single "ding" that can repeat quickly without mushing.'),
  sfx('sfx_undo',   'SFX — undo move',      350, 'Played when the player takes back a move. A quick neutral "whoosh-back" — should feel like rewinding, not like an error.'),
  sfx('sfx_button', 'SFX — UI button',      360, 'Played for menu/UI buttons (not board taps). Soft click, quieter and duller than the board tap sound.'),
  sfx('sfx_slither', 'SFX — snake slither',  362, 'Played while a snake slides across the board (~0.3s of movement). A soft dry rustle/slide — grassy or sandy texture, no hiss-as-threat; the snakes are friendly.'),
  sfx('sfx_slide',   'SFX — frog slide',     364, 'Played when a frog glides into place (drag-to-move and special moves). A quick descending "swoosh", softer than the hop.'),
  sfx('sfx_star_tick', 'SFX — star counter tick', 366, 'Played rapidly (up to 15 times in a row) as the star counter counts up on the level-complete screen. One very short bright "ping" (<0.15s) that sounds good machine-gunned; the current synth version rises in pitch each tick, but a single uploaded tick plays at one pitch.'),
  music('music_pond',     'Music — pond (default)',  370, 'Default gameplay loop for the pond chapters. Calm, sunny, gentle — think kalimba/marimba/acoustic over light ambience.'),
  music('music_cowboy',   'Music — cowboy chapter',  380, 'Gameplay loop for the Cowboy chapter. Lazy western flavor: twangy guitar, whistling, clip-clop percussion — still mellow puzzle music.'),
  music('music_wizard',   'Music — wizard chapter',  390, 'Gameplay loop for the Wizard chapter. Mysterious and twinkly: celesta/harp, soft pads, a little magic shimmer.'),
  music('music_treasure', 'Music — treasure chapter', 400, 'Gameplay loop for the Treasure Hunter chapter. Adventurous jungle-temple mood: hand percussion, flutes, a hint of mystery.'),

  // ---- Level sets (design content) ----
  levelSet('wizard_levels',   'Wizard chapter levels',          500),
  levelSet('treasure_levels', 'Treasure Hunter chapter levels', 510),
  levelSet('cowboy_levels',   'Cowboy chapter levels',          520),
];

// Upsert the registry into art_slots. Pass a `query(text, params)` fn
// (lib/db.js or api/_db.js both export one). Code is the source of truth, so
// this overwrites category/display_name/spec/sort for existing slot ids and
// leaves art_uploads/art_pairing untouched.
export async function seedArtSlots(query) {
  for (const s of ART_SLOTS) {
    await query(
      `INSERT INTO art_slots (slot_id, category, display_name, spec, sort_order, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (slot_id) DO UPDATE SET
         category = EXCLUDED.category,
         display_name = EXCLUDED.display_name,
         spec = EXCLUDED.spec,
         sort_order = EXCLUDED.sort_order,
         updated_at = CURRENT_TIMESTAMP`,
      [s.slotId, s.category, s.displayName, JSON.stringify(s.spec), s.sort]
    );
  }
  return ART_SLOTS.length;
}
