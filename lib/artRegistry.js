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
// `spec.assetName` — the in-app resource name this slot overrides. The iOS
//   AssetStore keys its download cache by this, so it must match the name the
//   app passes to UIImage(named:)/Bundle lookups.

/** @typedef {{slotId:string, category:string, displayName:string, sort:number, spec:object}} ArtSlot */

const bg = (slotId, displayName, sort, state, assetName) => ({
  slotId, category: 'background', displayName, sort,
  spec: { kind: 'image', width: 1536, height: 2752, transparent: false,
          formats: ['png', 'jpg'], aspect: '9:16 portrait, full-bleed', state, assetName },
});

const snake = (n, blink) => ({
  slotId: blink ? `snake${n}_blink` : `snake${n}`,
  category: 'snake',
  displayName: `Snake length ${n}${blink ? ' (blink frame)' : ' (idle)'}`,
  sort: 100 + n * 10 + (blink ? 1 : 0),
  spec: { kind: 'image', transparent: true, formats: ['png'],
          notes: `Head points up. ${blink ? 'Eyes-closed blink frame, must register with the idle frame.' : 'Default resting frame.'}`,
          state: 'baked', assetName: blink ? `snake${n}_blink` : `snake${n}` },
});

const piece = (slotId, displayName, sort, notes) => ({
  slotId, category: 'piece', displayName, sort,
  spec: { kind: 'image', transparent: true, formats: ['png'], notes,
          state: 'placeholder', assetName: slotId },
});

const sfx = (slotId, displayName, sort) => ({
  slotId, category: 'sound', displayName, sort,
  spec: { kind: 'audio', role: 'sfx', formats: ['wav', 'm4a', 'mp3'],
          notes: 'Short one-shot effect, < 2s, mono ok.', state: 'placeholder',
          assetName: slotId },
});

const music = (slotId, displayName, sort) => ({
  slotId, category: 'sound', displayName, sort,
  spec: { kind: 'audio', role: 'music', formats: ['m4a', 'mp3'],
          notes: 'Seamless loop, 30–90s.', state: 'placeholder', assetName: slotId },
});

const levelSet = (slotId, displayName, sort) => ({
  slotId, category: 'level', displayName, sort,
  spec: { kind: 'json', formats: ['json'],
          notes: 'Baked chapter level set (design content, not art).', state: 'baked',
          assetName: slotId },
});

/** @type {ArtSlot[]} */
export const ART_SLOTS = [
  // ---- Backgrounds (full-screen portrait backdrops) ----
  bg('bg_pond',         'Pond — default background',        10, 'baked',       'pond_background'),
  bg('bg_starter',      'Starter chapters background',      20, 'baked',       'starter_background'),
  bg('bg_intermediate', 'Intermediate chapters background', 30, 'baked',       'intermediate_background'),
  bg('bg_advanced',     'Advanced chapters background',     40, 'baked',       'advanced_background'),
  bg('bg_cowboy',       'Cowboy chapter background',        50, 'baked',       'cowboy_background'),
  bg('bg_wizard',       'Wizard chapter background',        60, 'placeholder', 'wizard_background'),
  bg('bg_treasure',     'Treasure Hunter chapter background',70, 'placeholder','treasure_background'),

  // ---- Snakes (per length, idle + blink) ----
  snake(2, false), snake(2, true),
  snake(3, false), snake(3, true),
  snake(4, false), snake(4, true),
  snake(5, false), snake(5, true),

  // ---- Static pieces ----
  piece('lilypad', 'Lily pad', 200, 'Landing pad the frog rests on. Top-down, sits flat on the water.'),
  piece('stump',   'Log / stump', 210, 'Obstacle frogs leap over. Should read as a fallen log.'),
  piece('saddle',  'Cowboy saddle marker', 220, 'Overlay marking a frog that can ride a snake. Small, sits on the frog.'),

  // ---- Sounds ----
  sfx('sfx_tap',    'SFX — tap / select',     300),
  sfx('sfx_hop',    'SFX — frog hop',          310),
  sfx('sfx_land',   'SFX — frog land',         320),
  sfx('sfx_win',    'SFX — level complete',    330),
  sfx('sfx_star',   'SFX — star earned',       340),
  sfx('sfx_undo',   'SFX — undo move',         350),
  sfx('sfx_button', 'SFX — UI button',         360),
  music('music_pond',     'Music — pond (default)',  370),
  music('music_cowboy',   'Music — cowboy chapter',  380),
  music('music_wizard',   'Music — wizard chapter',  390),
  music('music_treasure', 'Music — treasure chapter',400),

  // ---- Level sets (design content) ----
  levelSet('wizard_levels',   'Wizard chapter levels',         500),
  levelSet('treasure_levels', 'Treasure Hunter chapter levels',510),
  levelSet('cowboy_levels',   'Cowboy chapter levels',         520),
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
