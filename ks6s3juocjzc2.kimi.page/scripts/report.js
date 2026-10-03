/* PW-WOORI-05: a projection of saved values, never a score generator. */
function createReportViewModel(state) {
  const source = pwObject(state) ? state : {};
  const score = typeof source.habitScore === 'number' && Number.isFinite(source.habitScore)
    && source.habitScore >= 0 && source.habitScore <= 100 ? source.habitScore : null;
  const monthly = pwObject(source.monthly) ? source.monthly : {};
  const received = pwMoney(monthly.saving) ? monthly.saving : null;
  const spent = pwMoney(monthly.spending) ? monthly.spending : null;
  const transactions = Array.isArray(source.transactions) ? source.transactions : null;
  const count = transactions === null ? null : transactions.filter(validPocketWONTransaction).length;
  return {
    score: { status: score === null ? 'unavailable' : 'available', value: score },
    moneyFlow: {
      status: received !== null && spent !== null ? 'available' : received !== null || spent !== null ? 'partial' : 'unavailable',
      received, spent, difference: received !== null && spent !== null ? received - spent : null, period: 'unknown',
    },
    goal: createGoalViewModel(source),
    records: { status: transactions === null ? 'unavailable' : 'available', count, partial: transactions !== null && count !== transactions.length },
  };
}

function createReportView(loaded, navigate, options = {}) {
  const { el, button, heading, money } = PWUI;
  const source = loaded || { status: 'unavailable', state: null };
  const model = createReportViewModel(source.state);
  const habit = createHabitScoreModel(source.state);
  const format = new Intl.NumberFormat('ko-KR');
  const segments = [['habit', '습관'], ['flow', '돈 흐름'], ['goal', '목표']];
  let activeSegment = segments.some(([id]) => id === options.segment) ? options.segment : 'habit';
  let disposed = false;
  let mounted = false;
  let titlePager;
  let goalNameOpen = false;
  const root = el('div', 'pw-report pw-screen');
  root.append(heading('용돈 습관 리포트'));
  const tabs = el('div', 'pw-report-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '리포트 항목');
  const content = el('div', 'pw-report-content');
  content.id = 'pw-report-panel';
  content.setAttribute('role', 'tabpanel');
  const actions = el('div', 'pw-report-actions');

  function action(label, target) {
    return button(label, () => {
      if (!disposed) navigate(target, pwSpriteEntryMotion(root, root, typeof target === 'string' ? target : target.screen));
    }, 'pw-report-action');
  }
  function panel(className, title) {
    const area = el('section', `${className} pw-panel`);
    area.dataset.pwMotionCard = '';
    const titleNode = el('h2', 'pw-report-section-title', title);
    titleNode.id = `pw-report-${activeSegment}-title`;
    area.setAttribute('aria-labelledby', titleNode.id);
    return { area, titleNode };
  }
  function amount(value, key, className = '') {
    const node = money(value, `pw-report-money ${className}`.trim());
    node.dataset.money = key;
    return node;
  }
  function visual(profile, className = '') {
    return pwIllustrationPanel(profile, { panelClass: `pw-report-visual pw-compact-visual ${className}`.trim() });
  }
  function habitPanel() {
    const { area, titleNode } = panel('pw-report-habit', '나의 습관 점수');
    const header = el('div', 'pw-report-section-header');
    const copy = el('div', 'pw-report-section-copy');
    const basis = habit.partial ? `최근 ${habit.windowDays}일 기록 · 확인 가능한 기록만 포함했어요.` : `최근 ${habit.windowDays}일 기록으로 계산했어요.`;
    copy.append(titleNode, el('p', 'pw-meta pw-muted', basis));
    header.append(copy, visual('report'));
    area.append(header);
    if (habit.status !== 'available') {
      area.classList.add('pw-report-habit--empty');
      area.append(el('p', 'pw-report-habit-empty pw-muted', habit.status === 'insufficient'
        ? `최근 ${habit.windowDays}일 동안 남긴 기록이 없어요. 기록을 남기면 점수를 계산해요.`
        : '기록 정보를 확인할 수 없어 점수를 계산하지 못했어요.'));
      return area;
    }
    const summary = el('div', 'pw-report-habit-summary');
    const value = el('p', habit.score === null ? 'pw-report-score-unknown' : 'pw-report-habit-score');
    if (habit.score === null) value.textContent = '확인 안 됨';
    else {
      value.setAttribute('aria-label', `100점 중 ${habit.score}점`);
      const unit = el('span', 'pw-report-habit-unit', '/ 100점');
      unit.setAttribute('aria-hidden', 'true');
      value.append(String(habit.score), unit);
    }
    const change = habit.change === null ? '지난 기간과 비교할 수 없어요.'
      : habit.change === 0 ? `지난 ${habit.windowDays}일과 같아요.`
      : `지난 ${habit.windowDays}일보다 ${Math.abs(habit.change)}점 ${habit.change > 0 ? '올랐어요' : '내려갔어요'}.`;
    const trend = el('p', 'pw-report-habit-change pw-meta', change);
    trend.dataset.trend = habit.change === null ? 'none' : habit.change > 0 ? 'up' : habit.change < 0 ? 'down' : 'same';
    summary.append(value, trend);
    const list = el('dl', 'pw-report-habit-items');
    for (const item of habit.items) {
      const row = el('div', 'pw-report-habit-item');
      row.dataset.habitItem = item.id;
      const name = el('dt');
      name.append(el('span', 'pw-report-habit-label', item.label), el('span', 'pw-report-habit-detail pw-muted', item.detail));
      const points = el('dd', 'pw-report-habit-points', item.points === null ? '확인 안 됨' : `${item.points} / ${item.max}`);
      const bar = el('div', 'pw-report-habit-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = el('span');
      fill.style.width = `${item.points === null ? 0 : item.points / item.max * 100}%`;
      bar.append(fill);
      row.append(name, points, bar);
      list.append(row);
    }
    const coaching = el('div', 'pw-report-habit-coaching');
    if (habit.coaching.strength) coaching.append(el('p', 'pw-meta', `잘하고 있어요 · ${habit.coaching.strength}`));
    coaching.append(el('p', 'pw-meta', `다음엔 · ${habit.coaching.next}`));
    area.append(summary, list, coaching);
    return area;
  }
  function flowPanel() {
    const { area, titleNode } = panel('pw-report-flow', '저장된 돈 흐름');
    const header = el('div', 'pw-report-section-header');
    const caption = el('div', 'pw-report-section-copy');
    caption.append(titleNode, el('p', 'pw-meta pw-muted', '저장된 집계 · 기간 확인 안 됨'));
    header.append(caption, visual('record'));
    const values = el('dl', 'pw-report-flow-values');
    for (const [label, key] of [['받은 돈', 'received'], ['쓴 돈', 'spent'], ['차이', 'difference']]) {
      const row = el('div', 'pw-report-flow-row');
      const detail = el('dd');
      detail.append(amount(model.moneyFlow[key], key));
      row.append(el('dt', 'pw-muted', label), detail);
      values.append(row);
    }
    const records = el('div', 'pw-report-records');
    records.append(el('p', 'pw-report-record-count pw-meta', `저장된 기록 ${model.records.count === null ? '확인 안 됨' : `${format.format(model.records.count)}건`}`));
    if (model.records.partial) records.append(el('p', 'pw-meta pw-muted', '확인 가능한 기록만 포함했어요.'));
    area.append(header, values, el('p', 'pw-meta pw-muted', '차이 = 받은 돈 − 쓴 돈'), records);
    return area;
  }
  function goalPanel() {
    if (goalNameOpen) {
      const { area, titleNode } = panel('pw-report-goal-text', '목표 이름');
      titlePager = PWUI.createTextPager(model.goal.title);
      titlePager.element.classList.add('pw-report-goal-name');
      area.append(titleNode, titlePager.element);
      return area;
    }
    const { area, titleNode } = panel('pw-report-goal', '나의 목표');
    const complete = model.goal.status === 'complete';
    const header = el('div', 'pw-report-section-header');
    const copy = el('div', 'pw-report-section-copy');
    copy.append(titleNode);
    header.append(copy, visual('goal'));
    area.append(header);
    if (model.goal.status !== 'active' && !complete) {
      area.classList.add('pw-report-goal--empty');
      area.append(el('p', 'pw-report-goal-empty pw-muted', model.goal.status === 'empty' ? '아직 정한 목표가 없어요.' : '목표 정보를 확인할 수 없어요.'));
      return area;
    }
    if (Array.from(model.goal.title).length > 14) {
      copy.append(button('목표 이름 읽기', () => {
        if (!disposed) { goalNameOpen = true; render(); }
      }, 'pw-report-name-action'));
    } else copy.append(el('p', 'pw-report-goal-short-name', model.goal.title));
    const totals = el('dl', 'pw-report-goal-values');
    for (const [label, key] of [['현재 모은 금액', 'current'], ['목표 금액', 'target']]) {
      const row = el('div');
      const detail = el('dd');
      detail.append(amount(model.goal[key], key));
      row.append(el('dt', 'pw-meta pw-muted', label), detail);
      totals.append(row);
    }
    const progressGroup = el('div', 'pw-report-progress-group');
    const progress = el('div', 'pw-report-progress');
    const valueText = `${model.goal.percent}% · ${complete ? '목표 달성' : `목표까지 ${format.format(model.goal.remaining)}원`}`;
    for (const [key, value] of Object.entries({ role: 'progressbar', 'aria-label': '목표 진행률', 'aria-valuemin': 0,
      'aria-valuemax': 100, 'aria-valuenow': model.goal.percent, 'aria-valuetext': valueText })) progress.setAttribute(key, String(value));
    const fill = el('span');
    fill.style.width = `${model.goal.percent}%`;
    progress.append(fill);
    progressGroup.append(progress, el('p', 'pw-report-percent pw-meta', `${model.goal.percent}%${complete ? ' · 목표 달성' : ''}`));
    const remaining = el('div', 'pw-report-remaining');
    remaining.append(el('p', 'pw-meta pw-muted', '목표까지 남은 금액'), amount(model.goal.remaining, 'remaining'));
    area.append(totals, progressGroup, remaining);
    return area;
  }
  function statusPanel() {
    const { area, titleNode } = panel('pw-report-status', source.status === 'empty' ? '아직 보여줄 기록이 없어요.'
      : source.status === 'invalid' ? '저장된 정보를 확인할 수 없어요.' : '저장된 정보를 불러오지 못했어요.');
    area.append(visual('report'), titleNode, el('p', 'pw-muted', source.status === 'empty'
      ? '용돈을 기록하면 여기에서 확인할 수 있어요.' : '다시 불러와 저장된 상태를 확인해 주세요.'));
    return area;
  }
  function render() {
    if (disposed) return;
    titlePager?.dispose();
    titlePager = null;
    root.dataset.segment = activeSegment;
    for (const tab of tabButtons) {
      const selected = tab.dataset.segment === activeSegment;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    content.setAttribute('aria-labelledby', `pw-report-tab-${activeSegment}`);
    content.replaceChildren(source.status === 'loaded'
      ? activeSegment === 'habit' ? habitPanel() : activeSegment === 'flow' ? flowPanel() : goalPanel()
      : statusPanel());
    actions.replaceChildren(source.status === 'loaded'
      ? goalNameOpen ? button('목표 요약', () => { if (!disposed) { goalNameOpen = false; render(); } }, 'pw-report-action')
      : action(activeSegment === 'goal' ? '목표 보기' : '기록 보기', activeSegment === 'goal' ? 'goal' : 'record')
      : source.status === 'empty' ? action('첫 기록 남기기', 'record')
      : button('다시 불러오기', () => { if (!disposed) navigate({ screen: 'report', segment: activeSegment }); }, 'pw-report-action'));
    if (mounted) {
      titlePager?.mount();
      PWUI.refreshMotion(root);
    }
  }
  const tabButtons = segments.map(([id, label]) => {
    const tab = button(label, () => { activeSegment = id; goalNameOpen = false; render(); }, 'pw-report-tab');
    tab.id = `pw-report-tab-${id}`;
    tab.dataset.segment = id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', content.id);
    tab.addEventListener('keydown', event => {
      const index = segments.findIndex(([segment]) => segment === activeSegment);
      const next = event.key === 'ArrowRight' ? (index + 1) % segments.length
        : event.key === 'ArrowLeft' ? (index + segments.length - 1) % segments.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? segments.length - 1 : null;
      if (next === null || disposed) return;
      event.preventDefault();
      activeSegment = segments[next][0];
      goalNameOpen = false;
      render();
      tabButtons[next].focus({ preventScroll: true });
    });
    return tab;
  });
  tabs.append(...tabButtons);
  root.append(tabs, content, actions);
  render();
  return {
    element: root,
    mount() { if (!disposed) { mounted = true; titlePager?.mount(); PWUI.refreshMotion(root); } },
    dispose() { disposed = true; titlePager?.dispose(); },
  };
}
