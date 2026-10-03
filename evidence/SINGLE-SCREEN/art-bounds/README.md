# Sprite opaque artwork boundary audit

PASS. This audit changed no application source files.

- `source-alpha.json`: every frame of the 11 original atlases and all six posters, with SHA-256 hashes, common 384×384 cell / (192,315) anchor, and alpha>0 bounding boxes.
- `*-union-alpha.png` and `alpha-runs.json`: union opacity masks and per-row intervals for precise collision checks.
- `rendered-boundaries.json`: 252 scene checks / 448 rendered Sprite players. Chromium and WebKit; 320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932; safe area 0/0 and 20/34; all five screens, every report segment, and Goal/Record save results. Static/reduced rendering was checked against the all-frame union, including success clips for results.
- `live-success-boundaries.json`: 72 further scene checks / 128 players at 320×568 and 430×932, both engines and safe-area modes, with normal motion. All 16 result players were sampled during actual success playback.
- `verify-rendered-boundaries.cjs`: the read-only browser geometry harness used for the full portrait matrix.

Every all-frame union stays within its allocated card or panel (1 CSS px tolerance). Per-row alpha-mask checks found no intersections with visible neighboring labels or financial text. There were zero page errors in either run. The blue illustration stage may be smaller than the artwork; allocation is the containing functional card/panel, as required. Sprite cell overflow cropping remains part of the original atlas player, with no added card clipping.

Source union bounds (exclusive right/bottom): balance [105,100,297,319]; record [99,96,314,319]; report [104,101,299,319]; goal [51,94,298,319]; all [75,100,299,319]; success [80,81,305,319].
