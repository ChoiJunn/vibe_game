# Original Office Journey Art Pack

This directory contains original AI-generated illustrations created for Office Rhythm Manager. The pack was generated for this project and normalized into the dimensions consumed by the Phaser game. It contains no third-party art, company marks, logos, or embedded text.

## Asset contract

| Folder | Contents | Canvas |
| --- | --- | --- |
| `background/` | Arrival, keyboard, mail, meeting, copy, and departure scenes | 1280 × 720 RGB PNG |
| `character/` | Protagonist walk A/B and good/perfect/miss reactions | 320 × 320 transparent RGBA PNG |
| `mascot/` | Moka travel tumbler, desk cup, and good/perfect/miss reactions | 128 × 128 transparent RGBA PNG |
| `notes/` | Six section motifs: footsteps, keycap, envelope, speech bubble, paper, and exit | 128 × 128 transparent RGBA PNG |

The protagonist keeps one face, outfit, and commute bag across all poses. Moka is the same cream-colored cup mascot in travel-tumbler and desk-cup form. Character cutouts share a bottom-center foot anchor; icon canvases use consistent transparent padding. Backgrounds use a shared autumn palette and reserve the lower area for gameplay.

All files are registered in `src/game/assets.ts` and preloaded by `BootScene`. Do not rename or move registered paths without updating the manifest and its test.
