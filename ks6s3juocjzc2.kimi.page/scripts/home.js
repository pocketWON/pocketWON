/* Read-only dashboard composition. Stored financial values and motion stay intact. */
function createHomeDashboardModel(loaded, now = new Date()) {
  const calendar = PWFeatureModels.calendar(loaded, now);
  const keyOf = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const localDay = date => {
    const result = new Date(date);
    result.setHours(12, 0, 0, 0);
    return result;
  };
  const today = localDay(now);
  const monday = localDay(today);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const known = loaded?.status === 'loaded' && calendar.status !== 'unavailable';
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = localDay(monday);
    date.setDate(date.getDate() + index);
    const key = keyOf(date), future = date.getTime() > today.getTime();
    let amount = known && !future ? 0 : null;
    if (amount !== null) {
      for (const row of calendar.days.get(key) || []) {
        if (row.type !== 'out') continue;
        if (!Number.isSafeInteger(amount + row.amount)) { amount = null; break; }
        amount += row.amount;
      }
    }
    return { date, key, label: `${date.getMonth() + 1}/${date.getDate()}`, amount, future };
  });
  return { calendar, today: keyOf(today), week: { status: known ? 'available' : 'unavailable', days, omitted: calendar.omitted } };
}

function createHomeView(model, navigate, status, loaded = { status, state: null }) {
  const { el, button, heading, money } = PWUI;
  const format = new Intl.NumberFormat('ko-KR');
  const compact = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  const dashboard = createHomeDashboardModel(loaded);
  const root = el('div', 'pw-screen pw-home');
  root.append(heading('홈'));
  let disposed = false;
  const number = value => Number.isSafeInteger(value) ? format.format(value) : '확인 안 됨';
  const compactAmount = value => {
    if (!Number.isSafeInteger(value)) return '확인 안 됨';
    if (value >= 1e12) return `${compact.format(value / 1e12)}조`;
    if (value >= 1e8) return `${compact.format(value / 1e8)}억`;
    if (value >= 1e4) return `${compact.format(value / 1e4)}만`;
    if (value >= 1e3) return `${compact.format(value / 1e3)}천`;
    return format.format(value);
  };
  const svg = (tag, attributes = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const go = (target, trigger) => {
    if (!disposed) navigate(target, pwSpriteEntryMotion(root, trigger, target.screen));
  };
  function cardHeading(label) {
    const title = el('span', 'pw-home-card-heading');
    const arrow = el('span', 'pw-home-card-chevron', '›');
    arrow.setAttribute('aria-hidden', 'true');
    title.append(el('span', 'pw-home-card-title', label), arrow);
    return title;
  }
  function actionCard(label, className, target, action) {
    const card = button('', () => go(target, card), `pw-home-card ${className}`);
    card.setAttribute('aria-label', label);
    card.dataset.pwMotionCard = '';
    card.dataset.action = action;
    card.append(cardHeading(label));
    return card;
  }

  function allowanceHero() {
    const hero = el('section', 'pw-home-hero');
    hero.setAttribute('aria-labelledby', 'pw-home-balance-title');
    hero.dataset.pwMotionCard = '';
    const body = el('div', 'pw-home-hero-body');
    const title = el('h2'); title.id = 'pw-home-balance-title';
    const titleAction = button('', () => go({ screen: 'record', stage: 'list' }, titleAction), 'pw-home-hero-title');
    titleAction.setAttribute('aria-label', '지금 남은 용돈, 용돈 내역 보기');
    titleAction.dataset.action = 'list';
    titleAction.append(el('span', '', '지금 남은 용돈'), el('span', 'pw-home-card-chevron', '›'));
    titleAction.lastElementChild.setAttribute('aria-hidden', 'true');
    title.append(titleAction);
    const balance = money(model.balance, 'pw-home-money'); balance.dataset.money = 'balance';
    if ((balance.querySelector('.pw-money-digits')?.textContent.length || 0) > 7) balance.dataset.wide = 'true';
    const note = status === 'empty' ? '첫 기록을 남겨볼까요?' : status !== 'loaded' ? '저장된 정보를 불러오지 못했어요.'
      : model.balance === null ? '저장된 잔액을 확인할 수 없어요.' : '지금 쓸 수 있는 돈이에요.';
    body.append(title, balance, el('p', 'pw-home-status pw-meta', note));
    const stage = el('div', 'pw-home-character-stage');
    stage.setAttribute('aria-hidden', 'true');
    stage.append(pwIllustrationPanel('balance', { panelClass: 'pw-compact-visual pw-home-hero-art' }));
    const breakdown = el('div', 'pw-home-breakdown');
    breakdown.setAttribute('aria-label', '저장된 용돈 요약');
    for (const [label, symbol, key, value] of [
      ['받은 돈', '+', 'received', model.monthly.received], ['쓴 돈', '−', 'spent', model.monthly.spent], ['남은 돈', '=', 'balance', model.balance],
    ]) {
      const item = el('div', 'pw-home-breakdown-item'); item.dataset.money = key;
      const mark = el('span', 'pw-home-breakdown-symbol', symbol); mark.setAttribute('aria-hidden', 'true');
      const copy = el('div', 'pw-home-breakdown-copy');
      const amount = money(value, 'pw-home-breakdown-value');
      copy.append(el('span', 'pw-home-breakdown-label', label), amount);
      item.append(mark, copy); breakdown.append(item);
    }
    hero.append(body, stage, breakdown);
    return hero;
  }

  function goalCard() {
    const goal = model.goal;
    const card = actionCard('목표 달성하기', 'pw-home-goal', { screen: 'goal' }, 'goal');
    const valid = ['active', 'complete'].includes(goal.status);
    const overview = el('div', 'pw-home-goal-overview');
    overview.append(pwIllustrationPanel('goal', { panelClass: 'pw-compact-visual pw-home-goal-art', ambient: goal.status === 'active', goalKey: pwSpriteGoalKey(goal) }));
    const copy = el('div', 'pw-home-goal-copy');
    const name = el('span', 'pw-home-goal-name', valid ? goal.title : goal.status === 'empty' ? '첫 목표를 정해볼까요?' : '목표 확인 안 됨');
    if (valid) {
      name.title = goal.title;
      const amounts = el('span', 'pw-home-goal-amounts');
      amounts.setAttribute('aria-label', `모은 돈 ${number(goal.current)}원, 목표 ${number(goal.target)}원`);
      amounts.append(el('span', 'pw-home-goal-current', goal.current >= 1e6 ? compactAmount(goal.current) : number(goal.current)), el('span', 'pw-home-goal-target', ` / ${goal.target >= 1e6 ? compactAmount(goal.target) : number(goal.target)}원`));
      copy.append(name, amounts);
      card.setAttribute('aria-label', `목표 달성하기, ${goal.title}, ${number(goal.current)}원 / ${number(goal.target)}원, ${goal.percent}%`);
    } else copy.append(name);
    overview.append(copy);
    const group = el('div', 'pw-home-goal-progress-group');
    const progress = el('span', 'pw-home-goal-progress');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', '목표 진행률');
    progress.setAttribute('aria-valuemin', '0'); progress.setAttribute('aria-valuemax', '100');
    if (valid) {
      progress.setAttribute('aria-valuenow', String(goal.percent));
      progress.setAttribute('aria-valuetext', `${goal.percent}% 달성`);
    } else progress.setAttribute('aria-valuetext', '목표 진행률 확인 안 됨');
    const fill = el('span', 'pw-home-goal-progress-fill'); fill.style.width = valid ? `${goal.percent}%` : '0%';
    progress.append(fill);
    group.append(progress, el('span', 'pw-home-goal-percent', valid ? `${goal.percent}%` : '—'));
    card.append(overview, group);
    return card;
  }

  function habitCard() {
    const card = actionCard('나의 금융 습관', 'pw-home-habit', { screen: 'report', segment: 'habit' }, 'habit');
    const score = model.habit.score;
    const body = el('div', 'pw-home-habit-body');
    const ring = svg('svg', { class: 'pw-home-habit-ring', viewBox: '0 0 120 120', 'aria-hidden': 'true' });
    const circumference = 2 * Math.PI * 49;
    ring.append(svg('circle', { class: 'pw-home-habit-track', cx: 60, cy: 60, r: 49, fill: 'none', 'stroke-width': 10 }));
    if (score !== null) ring.append(svg('circle', { class: 'pw-home-habit-progress', cx: 60, cy: 60, r: 49, fill: 'none', 'stroke-width': 10,
      'stroke-linecap': 'round', 'stroke-dasharray': circumference, 'stroke-dashoffset': circumference * (1 - score / 100), transform: 'rotate(-90 60 60)' }));
    const metric = el('div', 'pw-home-habit-score');
    const value = el('span', 'pw-home-habit-value', score === null ? '—' : String(score));
    if (score !== null && String(score).length > 7) value.dataset.compact = 'true';
    metric.append(el('span', 'pw-home-habit-label', '습관 점수'), value);
    if (score !== null) value.append(el('span', 'pw-home-habit-unit', '점'));
    else metric.append(el('span', 'pw-home-habit-unknown', '확인 안 됨'));
    card.setAttribute('aria-label', score === null ? '나의 금융 습관, 습관 점수 확인 안 됨' : `나의 금융 습관, 습관 점수 ${score}점`);
    body.append(ring, metric); card.append(body);
    return card;
  }

  function calendarCard() {
    const projection = dashboard.calendar;
    const card = el('article', 'pw-home-card pw-home-calendar');
    card.dataset.pwMotionCard = '';
    const title = button('', () => go({ screen: 'record', stage: 'list' }, title), 'pw-home-calendar-title');
    title.setAttribute('aria-label', '용돈 내역'); title.dataset.action = 'list';
    title.append(cardHeading('용돈 내역'));
    const body = el('div', 'pw-home-calendar-body');
    const controls = el('div', 'pw-home-calendar-month');
    const caption = el('span', 'pw-home-calendar-month-label'); caption.setAttribute('aria-live', 'polite');
    const previous = button('‹', () => changeMonth(-1), 'pw-home-calendar-month-button'); previous.setAttribute('aria-label', '이전 달');
    const next = button('›', () => changeMonth(1), 'pw-home-calendar-month-button'); next.setAttribute('aria-label', '다음 달');
    controls.append(previous, caption, next);
    const weekdays = el('div', 'pw-home-calendar-weekdays'); weekdays.setAttribute('aria-hidden', 'true');
    for (const day of ['일', '월', '화', '수', '목', '금', '토']) weekdays.append(el('span', '', day));
    const days = el('div', 'pw-home-calendar-days');
    days.setAttribute('role', 'list'); days.setAttribute('aria-label', '날짜별 실제 용돈 기록');
    const unavailable = projection.status === 'unavailable';
    let year = projection.year, month = projection.month;
    const dateAt = (y, m, d) => {
      const date = new Date(0); date.setFullYear(y, m, d); date.setHours(12, 0, 0, 0); return date;
    };
    function changeMonth(delta) {
      if (disposed) return;
      const date = dateAt(year, month + delta, 1);
      if (date.getFullYear() < 0 || date.getFullYear() > 9999) return;
      year = date.getFullYear(); month = date.getMonth(); renderMonth();
    }
    function renderMonth() {
      caption.textContent = `${year}년 ${month + 1}월`;
      previous.disabled = year === 0 && month === 0; next.disabled = year === 9999 && month === 11;
      const first = dateAt(year, month, 1).getDay(), count = dateAt(year, month + 1, 0).getDate();
      const cells = Math.ceil((first + count) / 7) * 7;
      days.style.setProperty('--pw-calendar-rows', String(cells / 7));
      days.dataset.rows = String(cells / 7);
      days.replaceChildren();
      for (let index = 0; index < cells; index++) {
        const day = index - first + 1;
        const cell = el('div', 'pw-home-calendar-day');
        if (day < 1 || day > count) { cell.setAttribute('aria-hidden', 'true'); days.append(cell); continue; }
        const key = [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
        const rows = projection.days.get(key) || [], row = rows[0];
        cell.dataset.dateKey = key; cell.dataset.recorded = String(!!row); cell.setAttribute('role', 'listitem');
        if (key === dashboard.today) cell.setAttribute('aria-current', 'date');
        const dateText = `${year}년 ${month + 1}월 ${day}일`;
        cell.append(el('span', 'pw-home-calendar-number', String(day)));
        if (row) {
          const label = row.memo.trim() || row.category;
          cell.dataset.type = row.type;
          const name = el('span', 'pw-home-calendar-name', label + (rows.length > 1 ? ` +${rows.length - 1}` : ''));
          const amount = el('span', 'pw-home-calendar-amount', `${row.type === 'in' ? '+' : '−'}${compactAmount(row.amount)}`);
          name.title = label; amount.title = `${row.type === 'in' ? '+' : '−'}${number(row.amount)}원`;
          cell.append(name, amount);
          cell.setAttribute('aria-label', `${dateText}, ${rows.map(item => `${item.memo.trim() || item.category}, ${item.type === 'in' ? '받은 돈' : '쓴 돈'} ${number(item.amount)}원`).join('; ')}`);
        } else cell.setAttribute('aria-label', `${dateText}, ${unavailable ? '기록 확인 안 됨' : '거래 없음'}`);
        days.append(cell);
      }
    }
    renderMonth();
    body.append(controls, weekdays, days);
    if (unavailable) {
      const notice = el('span', 'pw-home-calendar-status', status === 'empty' ? '첫 기록을 기다리고 있어요' : '기록 확인 안 됨');
      notice.setAttribute('role', 'status'); body.append(notice);
    }
    if (projection.omitted) {
      const explanation = el('span', 'pw-sr-only', `유효하지 않은 기록 ${projection.omitted}건은 달력에서 제외했어요.`);
      explanation.id = 'pw-home-calendar-omitted'; card.setAttribute('aria-describedby', explanation.id); card.append(explanation);
    }
    card.append(title, body);
    return card;
  }

  function weeklyCard() {
    const card = actionCard('이번 주 지표', 'pw-home-weekly', { screen: 'report', segment: 'flow' }, 'weekly');
    const body = el('div', 'pw-home-weekly-body');
    body.append(el('span', 'pw-home-weekly-caption', '주간 지출 · 원'));
    const chart = svg('svg', { class: 'pw-home-weekly-plot', viewBox: '0 0 180 142', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const known = dashboard.week.days.filter(day => day.amount !== null);
    const maximum = Math.max(1, ...known.map(day => day.amount));
    const left = 14, right = 166, top = 22, bottom = 116;
    const points = dashboard.week.days.map((day, index) => ({ ...day, x: left + (right - left) * index / 6,
      y: day.amount === null ? null : bottom - day.amount / maximum * (bottom - top) }));
    for (const fraction of [0, 0.5, 1]) chart.append(svg('line', { class: 'pw-home-weekly-gridline', x1: left, x2: right, y1: top + (bottom - top) * fraction, y2: top + (bottom - top) * fraction }));
    // Shade only continuous known observations; missing/future days are not bridged.
    let segment = [];
    const shade = () => {
      if (segment.length > 1) chart.append(svg('polygon', { class: 'pw-home-weekly-area', points: [
        `${segment[0].x},${bottom}`, ...segment.map(point => `${point.x},${point.y}`), `${segment.at(-1).x},${bottom}`,
      ].join(' ') }));
      segment = [];
    };
    for (const point of points) { if (point.y === null) shade(); else segment.push(point); }
    shade();
    for (let index = 0; index < points.length; index++) {
      const point = points[index], previous = points[index - 1];
      if (point.y !== null && previous?.y !== null && previous?.y !== undefined) chart.append(svg('line', {
        class: 'pw-home-weekly-line', x1: previous.x, y1: previous.y, x2: point.x, y2: point.y }));
    }
    for (const point of points) {
      if (point.y !== null) {
        chart.append(svg('circle', { class: 'pw-home-weekly-point', cx: point.x, cy: point.y, r: 3.5 }));
        const label = svg('text', { class: 'pw-home-weekly-value', x: point.x, y: Math.max(12, point.y - 8), 'text-anchor': 'middle' });
        label.textContent = compactAmount(point.amount); chart.append(label);
      }
      const date = svg('text', { class: `pw-home-weekly-date${point.future ? ' pw-home-weekly-date--future' : ''}`, x: point.x, y: 136, 'text-anchor': 'middle' });
      date.textContent = point.label; chart.append(date);
    }
    const detail = dashboard.week.days.map(day => `${day.label} ${day.future ? '미집계' : day.amount === null ? '확인 안 됨' : `${number(day.amount)}원`}`).join(', ');
    card.setAttribute('aria-label', `이번 주 지표, 주간 지출, ${detail}${dashboard.week.omitted ? `, 유효하지 않은 기록 ${dashboard.week.omitted}건 제외` : ''}`);
    body.append(chart);
    if (!known.length) body.append(el('span', 'pw-home-weekly-status', status === 'empty' ? '첫 기록을 기다리고 있어요' : '지출 확인 안 됨'));
    card.append(body);
    return card;
  }

  const grid = el('div', 'pw-home-feature-grid');
  grid.append(goalCard(), habitCard(), calendarCard(), weeklyCard());
  root.append(allowanceHero(), grid);
  return { element: root, mount() {}, dispose() { disposed = true; } };
}
