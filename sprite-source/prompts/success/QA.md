# Success frame review

Accepted nine unique, individually AI-generated poses: neutral, crouch, raise, lift, apex, drift, land, recover, settle. The ten-slot sequence reuses neutral at the end. Every accepted frame is a 512×512 RGBA canvas with transparent corners and the same white body, navy outline and viewer-right clasp.

The action crouches before lifting both arms, briefly leaves the ground, lets two coins continue upward after the body peaks, lands, catches/settles and returns to neutral. Intentional airborne foot baselines are approximately y405 (lift), y392 (apex), and y411 (drift); neutral is y421. The first land generation remained too high and was rejected. AI regeneration restores ground contact at approximately y422 and simplifies the arm silhouette. The rejected source is preserved under rejected/success/.

The full contact sheet was visually reviewed at small size. Source normalization uses the entire canvas, without per-frame bounding-box adjustment. Pixel/alpha packing equality is checked by the packer; all ten CSS intervals and successful/failed save boundaries are checked in Chromium and WebKit. The celebration is 1000ms at 10FPS with no loop.
