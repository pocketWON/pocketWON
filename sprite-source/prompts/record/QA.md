# Record frame review

All ten distinct poses were generated with built-in image_gen, individually, with transparent alpha and canonical identity reference. Idle: neutral → glance → half → blink → glance → neutral. Action: neutral → prepare → anticipate → peak → follow → settle → return → neutral.

- Receipt is blank throughout; the compact fold opens to a long U-shaped ribbon with secondary paper movement after hands stop.
- Anticipation intentionally squashes the body (head top 156 px versus neutral 138 px); peak intentionally extends the silhouette (head top 132 px). Both retain grounded soles near y=421.
- Initial peak/follow soles were y=413/414, visibly above the anchor. They were regenerated, never translated/cropped in code. Final peak/follow soles: y=422/421; neutral y=421. Other final soles span 418–422 px.
- First peak repair mistakenly copied the short receipt; the second and third repairs still had a raised baseline. Rejected images and original source/raw/provenance remain in sprite-source/rejected/record/.
- Final peak was regenerated from the corrected follow pose while restoring the earlier paper curve and side gaze. Its recorded references preserve that repair history.
- Identity, right-side clasp, opaque body, outline, eye spacing, and empty margins inspected at 512 px. Last action slot reuses the exact neutral source for the idle transition.
