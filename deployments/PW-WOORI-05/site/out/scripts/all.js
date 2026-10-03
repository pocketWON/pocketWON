/* All is a destination menu for screens that already exist in PocketWON. */
function createAllView(navigate) {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = el('div', 'pw-all');
  const heading = el('h1', 'pw-type-h1', '전체');
  heading.id = 'pw-screen-title';
  heading.setAttribute('aria-live', 'polite');
  heading.setAttribute('aria-atomic', 'true');
  const intro = el('div', 'pw-all-intro');
  intro.append(el('p', 'pw-all-eyebrow', 'POCKETWON'), el('p', 'pw-all-description', '필요한 돈 관리 기능을 골라보세요.'));
  root.append(heading, intro);
  const grid = el('div', 'pw-all-grid');
  const destinations = [
    ['home', '홈', '내 용돈과 오늘의 흐름을 확인해요.', 'balance', '열기'],
    ['record', '기록', '받은 돈과 쓴 돈을 남겨요.', 'record', '기록하기'],
    ['goal', '목표', '모으고 싶은 목표를 관리해요.', 'goal', '관리하기'],
    ['report', '리포트', '돈 습관을 한눈에 살펴봐요.', 'report', '살펴보기'],
  ];
  for (const [screen, title, description, artwork, cta] of destinations) {
    const card = el('article', `pw-all-card pw-all-card--${screen}`);
    const panel = pwIllustrationPanel(artwork, { panelClass: 'pw-all-card-visual' });
    const body = el('div', 'pw-all-card-body');
    const cardTitle = el('h2', 'pw-all-card-title', title);
    const copy = el('p', 'pw-all-card-description', description);
    const button = el('button', 'pw-button pw-all-card-action', cta);
    button.type = 'button';
    button.addEventListener('click', () => navigate(screen));
    body.append(cardTitle, copy, button);
    card.append(panel, body);
    grid.append(card);
  }
  root.append(grid);
  return {
    element: root,
    mount() {},
    dispose() {},
  };
}
