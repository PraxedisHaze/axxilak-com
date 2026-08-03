# Maison Editor Drift Audit — 2026-07-30

Purpose: record the real editor-core state across the Maison line before any propagation pass.

## Scope audited

Seller-surface Maisons checked:

- apex
- aura
- canvas
- cipher
- ether
- gaia
- iron-ink
- liquid-gold
- neon-tokyo
- oracle
- scholar
- summit
- velvet

Editor-exception surfaces not included in the propagation set:

- iris
- triage-matrix

## What was checked

For each Maison above, the following editor-core files were compared by content hash:

- `js/magnifying-glass-inspector.js`
- `js/elementDetector.js`
- `js/lens-ui.js`
- `js/handler-dispatcher.js`
- `js/tool-palette.js`

`index.html` was also checked at the hash level to confirm whether a shared page shell exists.

## High-confidence findings

### 1. APEX is already its own editor branch

`apex` is unique on every editor-core file listed above.

That means the current repaired APEX editor is not a trivial drop-in for the rest of the Maison line.

### 2. The other 12 Maisons are not 12 independent snowflakes

Across the 12 non-APEX Maisons:

- `magnifying-glass-inspector.js` is identical across all 12
- `elementDetector.js` is identical across all 12
- `lens-ui.js` is identical across all 12
- `handler-dispatcher.js` is identical across all 12

So the non-APEX line already shares one common inspector/detector/lens/dispatcher branch.

### 3. The only non-APEX editor-core split is `tool-palette.js`

Non-APEX `tool-palette.js` breaks into three cohorts:

#### Cohort A

- aura
- cipher
- ether
- gaia

Hash:

`6110EEF74865891B2D3DB091BA20927018D852DB5C47A8D4DBF646AFC321ED19`

#### Cohort B

- canvas

Hash:

`30F2C0C809CBA6A1BEDC4CAB89651988DF43FE5E7896794F6A274AE2794E5201`

#### Cohort C

- iron-ink
- liquid-gold
- neon-tokyo
- oracle
- scholar
- summit
- velvet

Hash:

`476AFD65B7CD64D42DE94DDDDEAE1B00B101BE03516A2F5629A0FFD2C1E0E1FF`

APEX hash:

`C644A62C82AAFCAC01BDEAFFC804670272C07FBCD6CBC0023AFC2E2FED66100E`

### 4. Cohort drift inside the non-APEX line is tiny

`aura/js/tool-palette.js` versus `velvet/js/tool-palette.js` differs by only:

- 29 insertions
- 6 deletions

The visible difference inspected here is mostly formatting/comment expansion inside `matchElementStyles(...)`, not a fundamentally separate editor architecture.

### 5. The real branch split is old Quill editor vs new APEX textarea editor

Bounded diff inspection shows:

- non-APEX cohorts still contain Quill-era logic and Quill DOM targets such as:
  - `#quill-editor`
  - `.ql-container`
  - `.ql-editor`
  - `new Quill(...)`
  - Quill text-change handlers
- APEX now uses the repaired plain-text safe-mode editor path, including:
  - `#input-content`
  - textarea-first content editing
  - `parseBoxShadowControlState(...)`
  - `syncCaretFromPagePoint(...)`
  - safe-mode messaging and non-Quill wiring

This is the important split. The Maison drift is not "13 separate versions of the same thing." It is:

- one repaired APEX editor branch
- one older 12-Maison editor branch
- with a very small palette-only drift inside that older branch

### 6. There is not yet a live shared JS engine under `engines/apex-editor`

`Maizons/engines/apex-editor/` currently exists, but only with:

- `index.html`
- `potch.md`

It does not currently contain the live shared editor-core JS files.

So `engines/apex-editor` is not yet the active shared engine all Maisons are importing from.

### 7. `index.html` remains Maison-specific

Each audited Maison had a unique `index.html` hash.

That is expected and does not itself imply unhealthy drift. It means the site surfaces differ, not that the editor core must remain forked.

## Canonical implication

Do **not** propagate only `apex/js/tool-palette.js` into the other 12 Maisons.

That would combine:

- APEX textarea editor assumptions

with:

- older non-APEX inspector/detector/lens/dispatcher assumptions

and would be a high-risk partial migration.

If APEX becomes the reference build, propagation should happen as an editor-core bundle, not as isolated single-file copying.

## Safest next moves

1. Treat `axxilak/Maizons/apex` as the repaired reference branch.
2. Keep the current non-APEX line frozen until migration strategy is chosen.
3. Before any multi-Maison copy pass, define the bundle boundary explicitly:
   - `magnifying-glass-inspector.js`
   - `elementDetector.js`
   - `lens-ui.js`
   - `handler-dispatcher.js`
   - `tool-palette.js`
   - any required `index.html` support changes tied to the new editor path
4. Decide between:
   - bundle-propagating the repaired APEX editor core to the other 12 Maisons, or
   - moving all Maisons onto a true shared engine directory and reducing per-Maison local copies
5. Do not call the Maisons "finished" until the propagation decision is made and at least one non-APEX Maison proves the migration path cleanly.

## Current bottom line

The drift is real, but it is narrower than it first looked.

That is good news.

We are not looking at 13 unrelated editor systems. We are looking at one repaired APEX branch and one older shared Maison branch that can likely be migrated deliberately instead of patched blindly.
### 8. All 12 non-APEX seller Maisons still load Quill from `index.html`

Confirmed across:

- aura
- canvas
- cipher
- ether
- gaia
- iron-ink
- liquid-gold
- neon-tokyo
- oracle
- scholar
- summit
- velvet

Each still contains Quill page-shell loading such as:

- `quill.snow.css`
- `quill.min.js`

So the non-APEX branch is not only using older editor JS files. It is also still depending on the older Quill page shell.

That means any future migration from the repaired APEX branch must account for both:

- editor-core JS migration
- page-shell support changes in `index.html`
