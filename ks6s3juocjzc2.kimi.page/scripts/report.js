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

function createReportView(loaded, navigate) {
  const model = createReportViewModel(loaded.state);
  const format = new Intl.NumberFormat('ko-KR');
  const compact = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  let disposed = false, frame;
  const amounts = [];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = el('div', 'pw-report');
  const intro = el('div', 'pw-report-intro');
  const heading = el('h1', 'pw-type-h1', '용돈 습관 리포트'); heading.id = 'pw-screen-title';
  intro.append(heading, el('p', 'pw-report-muted pw-type-body-small', '내 기록을 한눈에 살펴봐요'));
  root.append(intro);
  function section(key, title, className = 'pw-report-surface') {
    const area = el('section', className); area.setAttribute('aria-labelledby', `pw-report-${key}-title`);
    const titleNode = el('h2', 'pw-type-h3', title); titleNode.id = `pw-report-${key}-title`;
    area.append(titleNode); root.append(area); return area;
  }
  function action(text, target) {
    const button = el('button', 'pw-report-action', text); button.type = 'button';
    button.addEventListener('click', () => { if (!disposed) navigate(target); }); return button;
  }
  function money(value, key) {
    const wrapper = el('div', 'pw-report-money'); wrapper.dataset.money = key;
    if (value === null) { wrapper.append(el('span', 'pw-report-muted pw-type-body-small', '확인 안 됨')); return wrapper; }
    wrapper.setAttribute('role', 'group'); wrapper.setAttribute('aria-label', `${format.format(value)}원`);
    const display = el('span', 'pw-report-money-display'); display.setAttribute('aria-hidden', 'true');
    const digits = el('span', 'pw-report-money-digits', format.format(value));
    const unit = el('span', 'pw-type-caption', '원'); display.append(digits, unit);
    const exact = el('span', 'pw-report-money-exact pw-type-caption', `${format.format(value)}원`);
    exact.setAttribute('aria-hidden', 'true'); exact.hidden = true;
    wrapper.append(display, exact); amounts.push({ wrapper, display, digits, unit, exact, value }); return wrapper;
  }
  if (loaded.status !== 'loaded') {
    const text = loaded.status === 'empty' ? '아직 보여줄 기록이 없어요.'
      : loaded.status === 'invalid' ? '저장된 정보를 확인할 수 없어요.' : '저장된 정보를 불러오지 못했어요.';
    const empty = section('status', text, 'pw-report-surface pw-report-status');
    empty.append(pwIllustration('empty', { className: 'pw-report-status-illustration' }));
    if (loaded.status === 'empty') {
      empty.append(el('p', 'pw-report-muted pw-type-body', '용돈을 기록하면 여기에서 한눈에 확인할 수 있어요.'), action('첫 기록 남기기', 'record'));
    }
  } else {
    const score = section('score', '습관 Score', 'pw-report-score');
    score.append(pwIllustrationPanel('report', { panelClass: 'pw-report-score-visual', imageClass: 'pw-report-illustration' }));
    score.append(el('p', model.score.status === 'available' ? 'pw-report-score-value' : 'pw-report-score-unknown pw-type-h2',
      model.score.status === 'available' ? String(model.score.value) : '확인 안 됨'));
    score.append(el('p', 'pw-report-muted pw-type-body-small', '저장된 습관 점수'));
    if (model.score.status === 'available') score.setAttribute('aria-label', `습관 Score ${model.score.value}점, 저장된 습관 점수`);

    const flow = section('flow', '저장된 돈 흐름');
    flow.append(el('p', 'pw-report-muted pw-type-caption', '저장된 집계 · 기간 확인 안 됨'));
    const values = el('dl', 'pw-report-flow-values');
    for (const [label, key] of [['받은 돈', 'received'], ['쓴 돈', 'spent'], ['차이', 'difference']]) {
      const item = el('div'), value = el('dd'); value.append(money(model.moneyFlow[key], key));
      item.append(el('dt', 'pw-report-muted pw-type-caption', label), value); values.append(item);
    }
    flow.append(values, el('p', 'pw-report-muted pw-type-caption', '차이는 받은 돈에서 쓴 돈을 뺀 금액이에요.'));

    const goal = section('goal', '나의 목표');
    if (model.goal.status === 'active' || model.goal.status === 'complete') {
      goal.append(el('p', 'pw-report-goal-name pw-type-body', model.goal.title));
      const amountsRow = el('dl', 'pw-report-goal-values');
      for (const [label, key] of [['현재 모은 금액', 'current'], ['목표 금액', 'target']]) {
        const row = el('div'), detail = el('dd'); detail.append(money(model.goal[key], key));
        row.append(el('dt', 'pw-report-muted pw-type-caption', label), detail); amountsRow.append(row);
      }
      goal.append(amountsRow);
      const progress = el('div', 'pw-report-progress');
      for (const [key, value] of Object.entries({ role: 'progressbar', 'aria-label': '목표 진행률',
        'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': model.goal.percent,
        'aria-valuetext': `${model.goal.percent}% · ${model.goal.status === 'complete' ? '목표 달성' : `목표까지 ${format.format(model.goal.remaining)}원`}` })) progress.setAttribute(key, String(value));
      const fill = el('span'); fill.style.width = `${model.goal.percent}%`; progress.append(fill);
      goal.append(progress, el('p', 'pw-report-percent pw-type-body-small', `${model.goal.percent}%${model.goal.status === 'complete' ? ' · 목표 달성' : ''}`));
      const remaining = el('div', 'pw-report-remaining'); remaining.append(el('p', 'pw-report-muted pw-type-caption', '목표까지 남은 금액'), money(model.goal.remaining, 'remaining')); goal.append(remaining);
    } else {
      goal.append(el('p', 'pw-report-muted pw-type-body-small', model.goal.status === 'empty' ? '아직 정한 목표가 없어요' : '목표 정보를 확인할 수 없어요'));
    }
    const records = section('records', '저장된 기록', 'pw-report-records');
    records.append(el('p', 'pw-report-record-count pw-type-h3', model.records.count === null ? '확인 안 됨' : `${format.format(model.records.count)}건`));
    if (model.records.partial) records.append(el('p', 'pw-report-muted pw-type-caption', '확인 가능한 기록만 포함했어요'));
  }
  if (loaded.status !== 'empty') {
    const actions = el('div', 'pw-report-actions'); actions.append(action('기록 보기', 'record'), action('목표 보기', 'goal')); root.append(actions);
  }
  function fitAmounts() {
    if (disposed || !root.isConnected) return;
    for (const { wrapper, display, digits, unit, exact, value } of amounts) {
      display.classList.remove('pw-report-money-display--wrap'); digits.textContent = format.format(value); unit.textContent = '원'; exact.hidden = true;
      const scales = [[1e4, '만'], [1e8, '억'], [1e12, '조'], [1e16, '경']];
      const start = Math.max(0, scales.findLastIndex(([scale]) => Math.abs(value) >= scale));
      for (const [scale, suffix] of scales.slice(start)) {
        if (display.scrollWidth <= display.clientWidth + 0.05) break;
        if (Math.round(Math.abs(value) / scale * 10) < 1) continue;
        digits.textContent = compact.format(value / scale); unit.textContent = `${suffix}원`; exact.hidden = false;
      }
      display.classList.toggle('pw-report-money-display--wrap', display.scrollWidth > display.clientWidth + 0.05);
    }
  }
  function scheduleFit() { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(fitAmounts); }
  const widths = new WeakMap();
  const observer = new ResizeObserver(entries => {
    if (entries.some(entry => { const changed = widths.get(entry.target) !== entry.contentRect.width; widths.set(entry.target, entry.contentRect.width); return changed; })) scheduleFit();
  });
  return {
    element: root,
    mount() { if (disposed) return; for (const item of amounts) observer.observe(item.wrapper); fitAmounts(); document.fonts.ready.then(scheduleFit); },
    dispose() { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); },
  };
}
