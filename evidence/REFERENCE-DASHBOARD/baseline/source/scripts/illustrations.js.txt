/* PocketWON's illustration layer is deliberately separate from interactive UI. */
const PW_ILLUSTRATIONS = Object.freeze({
  master: './assets/pocketwon/characters/pocketwon-mascot-master.png',
  balance: './assets/pocketwon/characters/pocketwon-mascot-balance.png',
  record: './assets/pocketwon/characters/pocketwon-mascot-record.png',
  goal: './assets/pocketwon/characters/pocketwon-mascot-goal.png',
  report: './assets/pocketwon/characters/pocketwon-mascot-report.png',
  all: './assets/pocketwon/characters/pocketwon-mascot-all.png',
  empty: './assets/pocketwon/characters/pocketwon-mascot-empty.png',
  success: './assets/pocketwon/characters/pocketwon-mascot-success.png',
});

/**
 * Create a decorative transparent illustration. Text and controls always stay
 * in the DOM so artwork can never become the source of financial meaning.
 */
function pwIllustration(name, options = {}) {
  const image = document.createElement('img');
  image.className = ['pw-illustration', options.className].filter(Boolean).join(' ');
  image.src = PW_ILLUSTRATIONS[name] || PW_ILLUSTRATIONS.master;
  image.dataset.illustration = name;
  image.alt = options.alt || '';
  image.setAttribute('aria-hidden', options.alt ? 'false' : 'true');
  image.setAttribute('role', options.alt ? 'img' : 'presentation');
  image.loading = options.loading || 'eager';
  image.decoding = 'async';
  if (options.width) image.width = options.width;
  if (options.height) image.height = options.height;
  image.addEventListener('error', () => {
    // A missing optional graphic must not create a broken-image affordance or
    // interfere with the underlying financial information.
    image.hidden = true;
  }, { once: true });
  return image;
}

function pwIllustrationPanel(name, options = {}) {
  const panel = document.createElement('div');
  panel.className = ['pw-illustration-panel', options.panelClass].filter(Boolean).join(' ');
  panel.setAttribute('aria-hidden', 'true');
  if (typeof createPocketWONSprite === 'function' && ['balance', 'record', 'report', 'goal', 'all', 'success'].includes(name)) {
    const sprite = createPocketWONSprite(name, { autoplay: false });
    // Old illustration classes expand cropped PNGs far beyond their panels.
    // Sprite cells already share one square canvas and have their own framing.
    if (options.ambient === false) sprite.element.dataset.spriteAmbient = 'false';
    if (options.idle === false) sprite.element.dataset.spriteIdle = 'false';
    if (options.goalKey) sprite.element.dataset.spriteGoalKey = options.goalKey;
    panel.classList.add('pw-sprite-panel');
    panel.append(sprite.element);
  } else {
    panel.append(pwIllustration(name, { className: options.imageClass || 'pw-illustration', loading: options.loading }));
  }
  return panel;
}

/** A completed snapshot is only eligible after the exact financial comparison. */
function pwSpriteGoalKey(goal) {
  return goal?.status === 'complete' && goal.current >= goal.target
    ? JSON.stringify([goal.title, goal.target, goal.current]) : undefined;
}

/** Request source feedback, then carry a one-shot intent without delaying navigation. */
function pwSpriteEntryMotion(root, trigger, destination) {
  const source = trigger.closest('section, article')?.querySelector('.pw-sprite') || root.querySelector('.pw-sprite');
  if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.controllerFor(root)?.request(source, 'action', 'interaction');
  return { profile: destination === 'home' || destination === 'all' ? 'balance' : destination, clip: 'action' };
}
