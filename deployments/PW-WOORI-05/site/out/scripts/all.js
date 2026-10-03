/* All is a destination menu for screens that already exist in PocketWON. */
function createAllView(navigate, options = {}) {
  const { el, button, heading } = PWUI;
  let disposed = false;
  const players = [];
  const root = el('div', 'pw-all pw-screen');
  root.append(heading('전체 메뉴'));
  const list = el('div', 'pw-all-list');
  const destinations = [
    ['home', '홈', '내 용돈과 주요 행동', 'balance'],
    ['record', '기록', '받은 돈과 쓴 돈', 'record'],
    ['goal', '목표', '모으고 싶은 목표', 'goal'],
    ['report', '리포트', '저장된 돈 습관', 'report'],
  ];
  for (const [screen, title, description, profile] of destinations) {
    const item = button('', () => {
      if (disposed) return;
      if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.controllerFor(root)?.request(player.element, 'action', 'interaction');
      navigate(screen, { profile: screen === 'home' ? 'balance' : profile, clip: 'action' });
    }, `pw-all-item pw-all-item--${screen}`);
    item.dataset.pwMotionCard = '';
    item.dataset.screen = screen;
    const stage = el('span', 'pw-all-item-visual pw-compact-visual');
    stage.setAttribute('aria-hidden', 'true');
    const player = createPocketWONSprite(profile, { autoplay: false, loading: 'eager' });
    players.push(player);
    stage.append(player.element);
    const body = el('span', 'pw-all-item-body');
    const titleNode = el('span', 'pw-all-item-title', title);
    titleNode.id = `pw-all-${screen}-title`;
    const copy = el('span', 'pw-all-item-description pw-meta pw-muted', description);
    body.append(titleNode, copy);
    const arrow = el('span', 'pw-all-item-chevron', '→');
    arrow.setAttribute('aria-hidden', 'true');
    item.setAttribute('aria-labelledby', titleNode.id);
    item.append(stage, body, arrow);
    list.append(item);
  }
  root.append(list);
  return {
    element: root,
    mount() { if (!disposed) PWUI.refreshMotion(root); },
    dispose() { disposed = true; for (const player of players) player.dispose(); },
  };
}
