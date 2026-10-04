/* Rounded 24 × 24 icons; navigation uses the golden master’s solid/outline mix. */
const PW_ICONS = Object.freeze({
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  home: '<path d="M2.7 10.1 10.5 3a2.2 2.2 0 0 1 3 0l7.8 7.1c.5.5.7 1 .7 1.7v9c0 .8-.6 1.4-1.4 1.4h-5.3v-6.6a3.3 3.3 0 0 0-6.6 0v6.6H3.4c-.8 0-1.4-.6-1.4-1.4v-9c0-.7.2-1.2.7-1.7Z" fill="currentColor" stroke="none"/>',
  record: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  goal: '<g stroke-width="2.6"><path d="M18.1 5.3a9 9 0 1 0 2.5 4"/><path d="M15.3 8.1a5 5 0 1 0 1.6 2.4"/><path d="m12 12 8.5-8.5M18.7 2l3.3 3.3"/></g>',
  report: '<path fill="currentColor" stroke="none" fill-rule="evenodd" clip-rule="evenodd" d="M6 2h12a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm.5 4.5h2v2h-2Zm4.5.25h5.5a.75.75 0 0 1 0 1.5H11a.75.75 0 0 1 0-1.5Zm-4.5 4.25h2v2h-2Zm4.5.25h5.5a.75.75 0 0 1 0 1.5H11a.75.75 0 0 1 0-1.5Zm-4.5 4.25h2v2h-2Zm4.5.25h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z"/>',
  all: '<g fill="currentColor" stroke="none"><rect x="2" y="2" width="9" height="9" rx="1.7"/><rect x="13" y="2" width="9" height="9" rx="1.7"/><rect x="2" y="13" width="9" height="9" rx="1.7"/><rect x="13" y="13" width="9" height="9" rx="1.7"/></g>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bell: '<path d="M18.2 8.1a6.2 6.2 0 0 0-12.4 0c0 5.8-1.1 7.5-2.7 9.1h17.8c-1.6-1.6-2.7-3.3-2.7-9.1Z" stroke-width="1.35"/><path d="M9.5 18.2v.9a2.5 2.5 0 0 0 5 0v-.9" stroke-width="1.35"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
});

function pwIcon(name) {
  return `<svg class="pw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PW_ICONS[name]}</svg>`;
}
