# Record confirmation pager accessibility regression

PASS after the shared accessible focus-trap correction. No application files were edited by this audit.

Chromium and WebKit; safe area 20/34; incoming and outgoing transactions; 320×568 with 32px root font, 480×360 with default 16px root font (automatic zoom fallback), and 480×360 with 32px root font. Each transaction used MAX_SAFE_INTEGER as its exact amount and a 50-code-point emoji memo.

- 60 geometry/control checks and 60 screenshots: no clipped text, horizontal overflow, inaccessible button centers, or page errors. Modal vertical scrolling is allowed in this accessibility fallback.
- 36 summary reconstructions: every type, exact formatted amount, category, newline, and memo code point was recovered from the confirmation pages. Portrait 200% text used two pages; landscape 200% text used three.
- Both pager Previous and wizard Back preserve the exact draft.
- Quota save failure retains the draft; explicit retry saves once; the result CTA remains reachable; cancellation restores opener focus.
- 24 forward/reverse focus-wrap checks: Tab from the footer scrolls the focused Back button into view; Shift+Tab from Back exposes the focused Save button.

`read-only-findings.json` contains every case and action. `verify-record-pager.cjs` is the standalone browser harness. Earlier evidence is retained separately at `../accessibility-record-pager-final/before-focus-wrap-fix.json`; the four earlier findings were offscreen Back controls after quota errors at 200% portrait text.
