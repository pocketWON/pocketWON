/* Home owns presentation only; navigation is injected by the existing Shell. */
function createHomeView(viewModel, navigate, loadStatus) {
  const moneyNodes = [];
  const numberFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  const integerFormat = new Intl.NumberFormat('ko-KR');
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const action = (label, screen, primary = false) => {
    const button = element('button', primary ? 'pw-button pw-home-primary pw-home-action' : 'pw-home-action', label);
    button.type = 'button';
    button.addEventListener('click', () => navigate(screen));
    if (!primary) {
      button.append(element('span', 'pw-home-chevron', '›'));
      button.lastChild.setAttribute('aria-hidden', 'true');
    }
    return button;
  };
  const section = (title, id, className, illustration) => {
    const node = element('section', className);
    node.setAttribute('aria-labelledby', id);
    if (illustration) node.append(pwIllustrationPanel(illustration, { panelClass: 'pw-home-visual-panel', imageClass: 'pw-home-illustration' }));
    const heading = element('h2', 'pw-type-h3 pw-home-feature-title', title);
    heading.id = id;
    node.append(heading);
    return node;
  };
  const amount = (value, size = 'medium') => {
    if (value === null) return element('p', 'pw-home-unknown', '확인할 수 없어요');
    const wrapper = element('div', `pw-home-money pw-home-money--${size}`);
    const display = element('span', 'pw-home-money-display');
    const digits = element('span', 'pw-home-money-digits', integerFormat.format(value));
    const unit = element('span', 'pw-home-money-unit', '원');
    const exact = element('span', 'pw-home-money-exact', `${integerFormat.format(value)}원`);
    exact.hidden = true;
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', `${integerFormat.format(value)}원`);
    display.setAttribute('aria-hidden', 'true');
    exact.setAttribute('aria-hidden', 'true');
    display.append(digits, unit);
    wrapper.append(display, exact);
    moneyNodes.push({ wrapper, display, digits, unit, exact, value });
    return wrapper;
  };
  const progress = (label, value) => {
    const track = element('div', 'pw-home-progress');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(value));
    track.setAttribute('aria-valuetext', `${numberFormat.format(value)}${label === '습관 점수' ? '점 / 100점' : '%'}`);
    const fill = element('span', 'pw-home-progress-fill');
    fill.style.width = `${value}%`;
    track.append(fill);
    return track;
  };

  const root = element('div', 'pw-home');
  const heading = element('h1', 'pw-home-sr-only', '홈');
  heading.id = 'pw-screen-title';
  const intro = element('div', 'pw-home-intro');
  const name = viewModel.greeting.name;
  if (name) {
    const last = name.charCodeAt(name.length - 1);
    const suffix = last >= 0xAC00 && last <= 0xD7A3 ? ((last - 0xAC00) % 28 ? '아,' : '야,') : ',';
    intro.append(element('p', 'pw-home-greeting', `${name}${suffix}`));
  }
  intro.append(element('p', 'pw-home-muted pw-type-body-small', '오늘도 좋은 돈 습관을 만들어볼까요?'));
  root.append(heading, intro);

  const hero = section('내 용돈', 'pw-home-balance-title', 'pw-surface pw-surface--hero pw-home-hero', 'balance');
  hero.classList.add('pw-home-summary-card');
  hero.append(amount(viewModel.balance, 'large'));
  if (loadStatus !== 'loaded') {
    hero.append(element('p', 'pw-home-muted pw-type-body-small', loadStatus === 'empty' ? '아직 저장된 용돈 정보가 없어요.' : '저장된 용돈 정보를 불러오지 못했어요.'));
  }
  hero.append(element('p', 'pw-home-muted pw-type-body-small', viewModel.balance === null ? '용돈 정보가 있으면 여기에 보여드려요.' : '지금 쓸 수 있는 돈이에요.'));
  const meta = element('dl', 'pw-home-hero-meta');
  for (const [label, value] of [['받은 돈', viewModel.monthly.received], ['쓴 돈', viewModel.monthly.spent]]) {
    const row = element('div');
    const detail = element('dd');
    detail.append(amount(value, 'small'));
    row.append(element('dt', '', label), detail);
    meta.append(row);
  }
  hero.append(meta, element('p', 'pw-home-period pw-type-caption', '저장된 집계 · 기간 확인 안 됨'), action('기록하기', 'record', true));
  root.append(hero);

  // One grid, independent card heights: CSS supplies the designed stagger.
  const featureGrid = element('div', 'pw-home-feature-grid');

  const flow = section('저장된 돈 흐름', 'pw-home-flow-title', 'pw-home-flow pw-home-feature-card', 'record');
  flow.append(element('p', 'pw-home-muted pw-type-caption', '저장된 집계 · 기간 확인 안 됨'));
  const metrics = element('dl', 'pw-home-metrics');
  for (const [label, value] of [['받은 돈', viewModel.monthly.received], ['쓴 돈', viewModel.monthly.spent], ['남은 돈', viewModel.monthly.remaining]]) {
    const item = element('div', 'pw-home-metric');
    const detail = element('dd');
    detail.append(value === null ? element('p', 'pw-home-unknown', '확인 전') : amount(value));
    item.append(element('dt', 'pw-home-muted pw-type-body-small', label), detail);
    metrics.append(item);
  }
  flow.append(metrics, element('p', 'pw-home-muted pw-type-caption', '남은 돈은 받은 돈에서 쓴 돈을 뺀 금액이에요.'), action('기록 보기', 'record'));
  featureGrid.append(flow);

  const habit = section('나의 돈 습관', 'pw-home-habit-title', 'pw-surface pw-home-habit pw-home-feature-card', 'report');
  habit.classList.add('pw-home-feature-card--offset');
  habit.append(element('p', 'pw-home-muted pw-type-body-small', '습관 점수'));
  if (viewModel.habit.score === null) {
    habit.append(element('p', 'pw-home-empty', '아직 확인할 수 있는 점수가 없어요.'));
  } else {
    const score = element('p', 'pw-home-score', numberFormat.format(viewModel.habit.score));
    score.append(element('span', '', '점'));
    habit.append(score, progress('습관 점수', viewModel.habit.score), element('p', 'pw-home-muted pw-type-caption', '저장된 습관 점수예요.'));
  }
  habit.append(action('리포트 보기', 'report'));
  featureGrid.append(habit);

  const goal = section('지금 모으는 목표', 'pw-home-goal-title', 'pw-surface pw-home-goal pw-home-feature-card', 'goal');
  if (viewModel.goal.status === 'active') {
    const data = viewModel.goal;
    goal.append(element('h3', 'pw-home-goal-name', data.title));
    const totals = element('div', 'pw-home-goal-totals');
    for (const [label, value] of [['모은 금액', data.current], ['목표 금액', data.target]]) {
      const part = element('div');
      part.append(element('p', 'pw-home-muted pw-type-caption', label), amount(value, 'small'));
      totals.append(part);
    }
    goal.append(totals, progress('목표 진행률', data.percent), element('p', 'pw-home-percent', `${data.percent}%`));
  } else {
    const copy = { empty: '아직 모으는 목표가 없어요.', complete: '저장된 목표 금액을 모두 모았어요.', invalid: '목표 정보를 확인할 수 없어요.' };
    goal.append(element('p', 'pw-home-empty', copy[viewModel.goal.status]));
    if (viewModel.goal.status === 'empty') goal.append(element('p', 'pw-home-muted pw-type-body-small', '첫 목표를 만들어볼까요?'));
  }
  goal.append(action('목표 보기', 'goal'));
  featureGrid.append(goal);

  const mission = section('오늘의 미션', 'pw-home-mission-title', 'pw-home-mission pw-home-feature-card', 'all');
  mission.classList.add('pw-home-feature-card--offset');
  const icon = element('span', 'pw-home-mission-icon');
  icon.innerHTML = pwIcon('record');
  icon.setAttribute('aria-hidden', 'true');
  const message = element('p', 'pw-home-muted pw-type-body-small', '오늘의 미션을 확인할 수 없어요.');
  const missionBody = element('div', 'pw-home-mission-body');
  missionBody.append(icon, message);
  mission.append(missionBody, action('전체 보기', 'all'));
  featureGrid.append(mission);
  // Keep the transformed right-column card clear of the floating dock even
  // when the viewport is short or the user's text scale is enlarged.
  featureGrid.style.paddingBottom = 'var(--pw-space-8)';
  root.append(featureGrid);

  // Fit the representation, never shrink the user's chosen text size.
  function fitAmounts() {
    if (!root.isConnected) return;
    for (const item of moneyNodes) {
      const { wrapper, display, digits, unit, exact, value } = item;
      display.classList.remove('pw-home-money-display--wrap');
      digits.textContent = integerFormat.format(value);
      unit.textContent = '원';
      exact.hidden = true;
      wrapper.classList.remove('pw-home-money--compact');
      // Measure the glyphs themselves: a full-width flex container can hide
      // left-side overflow from scrollWidth when amounts are right aligned.
      const naturalWidth = () => digits.getBoundingClientRect().width + unit.getBoundingClientRect().width + parseFloat(getComputedStyle(display).columnGap);
      const scales = [[1e4, '만'], [1e8, '억'], [1e12, '조'], [1e16, '경']];
      const start = Math.max(0, scales.findLastIndex(([scale]) => Math.abs(value) >= scale));
      for (const [scale, suffix] of scales.slice(start)) {
        if (naturalWidth() <= wrapper.clientWidth + 0.05 && (Math.abs(value) < 1e8 || !exact.hidden)) break;
        if (Math.round(Math.abs(value) / scale * 10) < 1) continue;
        digits.textContent = numberFormat.format(value / scale); unit.textContent = `${suffix}원`;
        exact.hidden = false; wrapper.classList.add('pw-home-money--compact');
      }
      display.classList.toggle('pw-home-money-display--wrap', naturalWidth() > wrapper.clientWidth + 0.05);
    }
  }
  let frame;
  const widths = new WeakMap();
  function scheduleFit() { cancelAnimationFrame(frame); frame = requestAnimationFrame(fitAmounts); }
  const observer = new ResizeObserver(entries => {
    let changed = false;
    for (const entry of entries) {
      if (widths.get(entry.target) !== entry.contentRect.width) {
        widths.set(entry.target, entry.contentRect.width);
        changed = true;
      }
    }
    if (changed) scheduleFit();
  });
  return {
    element: root,
    mount() {
      moneyNodes.forEach(item => observer.observe(item.wrapper));
      fitAmounts();
      document.fonts.ready.then(scheduleFit);
    },
    dispose() { observer.disconnect(); cancelAnimationFrame(frame); },
  };
}
