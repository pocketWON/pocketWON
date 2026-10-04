/* Read-only dashboard projections. Financial state and writes remain in state.js. */
function createHomeDashboardModel(loaded, now = new Date()) {
  const calendar = PWFeatureModels.calendar(loaded, now);
  const home = createHomeViewModel(loaded?.state);
  const keyOf = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const localDay = date => { const result = new Date(date); result.setHours(12, 0, 0, 0); return result; };
  const today = localDay(now), monday = localDay(today);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const known = loaded?.status === 'loaded' && calendar.status !== 'unavailable';
  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = localDay(monday); date.setDate(date.getDate() + index);
    const key = keyOf(date), future = date.getTime() > today.getTime();
    let amount = known && !future ? 0 : null;
    if (amount !== null) for (const row of calendar.days.get(key) || []) {
      if (row.type !== 'out' || parsePocketWONDate(row.timestamp)?.getTime() > now.getTime()) continue;
      if (!Number.isSafeInteger(amount + row.amount)) { amount = null; break; }
      amount += row.amount;
    }
    return { date, key, label: `${date.getMonth() + 1}/${date.getDate()}`, weekday: weekdays[index], amount, future };
  });
  const categories = [
    { id: 'food', label: '식비', color: '#1897FE' },
    { id: 'shopping', label: '쇼핑', color: '#FEAFB4' },
    { id: 'transport', label: '교통', color: '#FEE16E' },
    { id: 'culture', label: '문화·여가', color: '#97E497' },
    { id: 'living', label: '생활비', color: '#B9A0FB' },
    { id: 'other', label: '기타', color: '#CDD2DC' },
  ].map(item => ({ ...item, amount: known ? 0 : null, percent: known ? 0 : null }));
  const categoryIndex = { '간식': 0, '식비': 0, '문구': 1, '쇼핑': 1, '교통': 2, '게임': 3, '문화·여가': 3, '생활비': 4 };
  const dayIndex = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const todayIndex = dayIndex(now), recentAmounts = { in: 0, out: 0 };
  let habitAmountsSafe = true;
  let total = known ? 0 : null;
  if (known) for (const rows of calendar.days.values()) for (const row of rows) {
    const date = parsePocketWONDate(row.timestamp);
    if (!date || date.getTime() > now.getTime()) continue;
    const age = todayIndex - dayIndex(date);
    if (habitAmountsSafe && age >= 0 && age < 28) {
      const amount = recentAmounts[row.type] + row.amount;
      if (!Number.isSafeInteger(amount)) habitAmountsSafe = false;
      else recentAmounts[row.type] = amount;
    }
    if (row.type !== 'out' || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) continue;
    const index = Object.hasOwn(categoryIndex, row.category) ? categoryIndex[row.category] : 5;
    if (total === null || !Number.isSafeInteger(total + row.amount)) { total = null; continue; }
    total += row.amount; categories[index].amount += row.amount;
  }
  if (total === null) for (const category of categories) { category.amount = null; category.percent = null; }
  else if (total > 0) {
    const shares = categories.map((category, index) => {
      const exact = category.amount / total * 100;
      category.percent = Math.floor(exact);
      return { index, fraction: exact - category.percent };
    }).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
    const remaining = 100 - categories.reduce((sum, category) => sum + category.percent, 0);
    for (let index = 0; index < remaining; index++) categories[shares[index].index].percent++;
  }
  const habit = loaded?.status === 'loaded' && habitAmountsSafe && typeof createHabitScoreModel === 'function'
    ? createHabitScoreModel(loaded.state, now) : null;
  const goalKnown = ['active', 'complete'].includes(home.goal.status);
  const habitStatus = (id, label) => {
    if (!habitAmountsSafe) return { id, label, value: '확인 중', detail: '최근 28일 금액 합계가 정확히 계산할 수 있는 범위를 넘어 습관 점수를 표시하지 않아요' };
    const item = habit?.status === 'available' ? habit.items.find(value => value.id === id) : null;
    return { id, label, value: item?.points !== null && item?.points !== undefined ? `${item.points}/${item.max}점` : '기록 필요',
      detail: item ? `최근 ${habit.windowDays}일 기록으로 계산한 점수, ${item.detail}` : '기록을 남기면 습관 점수를 확인할 수 있어요' };
  };
  return {
    calendar, today: keyOf(today), balance: home.balance,
    statusPill: loaded?.status === 'empty' ? '첫 기록을 남겨볼까요? 💙'
      : loaded?.status !== 'loaded' || home.balance === null ? '용돈 정보를 확인하고 있어요'
      : '지금 쓸 수 있는 용돈이에요! 💙',
    statuses: [
      habitStatus('spending', '지출 관리'),
      habitStatus('saving', '저축 습관'),
      { id: 'goal', label: '목표 달성', value: goalKnown ? `${home.goal.percent}%` : home.goal.status === 'empty' ? '시작' : '확인 중', detail: goalKnown ? `${home.goal.title}, ${home.goal.percent}% 달성` : '저장된 목표 확인하기' },
    ],
    challenge: { status: 'unavailable', completed: null, target: 3, note: '저축 기록 연동 준비 중' },
    donut: { status: total === null ? 'unavailable' : total === 0 ? 'empty' : 'available', total,
      period: `${now.getFullYear()}년 ${now.getMonth() + 1}월`, categories, omitted: calendar.omitted },
    week: { status: known ? 'available' : 'unavailable', days, omitted: calendar.omitted, highlightKey: keyOf(today),
      message: known ? '이번 주 용돈도\n차근차근 살펴봐요!' : '첫 기록부터\n함께 시작해요!' },
    insights: { status: 'preparing',
      positive: { title: '이번 점이 좋아요!', body: 'AI 분석을 준비하고 있어요.\n기록을 차곡차곡 남기며\n나의 습관을 알아봐요.' },
      advice: { title: '이렇게 해보세요!', body: '다음 용돈을 받기 전, 남은 돈과 필요한 지출을 함께 확인해보는 건 어떨까요?' } },
  };
}

function createHomeView(model, navigate, status, loaded = { status, state: null }) {
  const { el, button, heading, money } = PWUI;
  const format = new Intl.NumberFormat('ko-KR'), compact = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  const base = createHomeDashboardModel(loaded, window.PWDemo?.enabled ? PWDemo.now : new Date());
  const dashboard = window.PWDemo?.enabled ? PWDemo.dashboard(base) : base, root = el('div', 'pw-screen pw-home'), sheets = new Set();
  root.append(heading('홈'));
  let disposed = false;
  const number = value => Number.isSafeInteger(value) ? format.format(value) : '확인 안 됨';
  const compactAmount = value => {
    if (!Number.isSafeInteger(value)) return '—';
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
  const featureRoute = id => pwFeatureRoute(id, { screen: 'home' });
  const go = (target, trigger) => {
    if (disposed) return;
    const destination = target.screen === 'feature' ? PW_FEATURES[target.featureId]?.profile || 'report' : target.screen;
    const motion = pwSpriteEntryMotion(root, trigger, destination);
    for (const flow of [...sheets]) flow.dispose();
    navigate(target, motion);
  };
  function chevron(className = 'pw-home-card-chevron') {
    const arrow = el('span', className, '›'); arrow.setAttribute('aria-hidden', 'true'); return arrow;
  }
  function card(className, label) {
    const node = el('article', `pw-home-card ${className}`);
    node.dataset.pwMotionCard = ''; node.setAttribute('aria-label', label); return node;
  }
  function link(label, target, className, action) {
    const control = button('', () => go(target, control), className);
    if (action) control.dataset.action = action;
    control.append(el('span', 'pw-home-card-title', label), chevron()); return control;
  }
  function openMenu(label, description, actions, opener) {
    if (disposed) return;
    const flow = PWFeatureUI.sheet(label, active => {
      active.body.append(el('p', 'pw-muted', description));
      for (const [text, target] of actions) {
        const action = PWFeatureUI.action(text, () => go(target, action), true); active.body.append(action);
      }
      active.footer.append(PWFeatureUI.action('닫기', () => active.close.click(), true));
    }, opener);
    sheets.add(flow); flow.onDispose(() => sheets.delete(flow));
  }
  function menu(label, description, actions) {
    const control = button('', () => openMenu(label, description, actions, control), 'pw-home-card-menu');
    control.setAttribute('aria-label', `${label} 더보기`);
    const mark = svg('svg', { viewBox: '0 0 12 24', width: 12, height: 24, 'aria-hidden': 'true' });
    for (const cy of [5, 12, 19]) mark.append(svg('circle', { cx: 6, cy, r: 2.1, fill: 'currentColor' }));
    control.append(mark); return control;
  }
  function cardHeader(label, target, action, menuButton) {
    const header = el('div', 'pw-home-card-heading'), title = el('h2');
    title.append(link(label, target, 'pw-home-card-link', action)); header.append(title);
    if (menuButton) header.append(menuButton);
    return header;
  }
  function statusIcon(id) {
    const icon = svg('svg', { viewBox: '0 0 32 32', 'aria-hidden': 'true' });
    if (id === 'spending') {
      icon.append(svg('path', { d: 'M15 21C4 22 1 10 6 8c6-3 11 5 9 13Z', fill: '#71DF82' }),
        svg('path', { d: 'M15 19C14 8 24 3 28 8c4 5-3 14-13 11Z', fill: '#36C866' }),
        svg('path', { d: 'M14 28c-1-8 1-13 7-18', fill: 'none', stroke: '#22B955', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    } else if (id === 'saving') icon.append(svg('path', { d: 'M16 28 4.2 16C-4 5 11-3 16 7c5-10 20-2 11.8 9L16 28Z', fill: '#FF6392' }));
    else icon.append(svg('path', { d: 'm16 3 4 8 9 1.4-6.5 6.3L24 28l-8-4.2L8 28l1.5-9.3L3 12.4 12 11Z', fill: '#FFC83D', 'stroke-linejoin': 'round', stroke: '#FFC83D', 'stroke-width': 2 }));
    return icon;
  }
  function allowanceHero() {
    const hero = el('section', 'pw-home-hero'); hero.dataset.pwMotionCard = '';
    if(window.PWDemo?.enabled)hero.append(el('span','pw-demo-badge','가상 데이터'));
    hero.setAttribute('aria-labelledby', 'pw-home-balance-title');
    const body = el('div', 'pw-home-hero-body'), title = el('h2'); title.id = 'pw-home-balance-title';
    const titleAction = link('지금 남은 용돈', { screen: 'record', stage: 'list' }, 'pw-home-hero-title', 'list');
    titleAction.setAttribute('aria-label', '용돈 내역'); title.append(titleAction);
    const balance = money(dashboard.balance === undefined ? model.balance : dashboard.balance, 'pw-home-money'); balance.dataset.money = 'balance';
    if ((balance.querySelector('.pw-money-digits')?.textContent.length || 0) > 7) balance.dataset.wide = 'true';
    body.append(title, balance, el('p', 'pw-home-status', dashboard.statusPill));
    const stage = el('div', 'pw-home-character-stage'); stage.setAttribute('aria-hidden', 'true');
    stage.append(pwIllustrationPanel('balance', { panelClass: 'pw-compact-visual pw-home-hero-art' }));
    const breakdown = el('div', 'pw-home-breakdown'); breakdown.setAttribute('aria-label', '나의 금융 습관 요약');
    for (const item of dashboard.statuses) {
      const target = item.id === 'goal' ? { screen: 'goal' } : { screen: 'report', segment: 'habit' };
      const control = button('', () => go(target, control), 'pw-home-breakdown-item');
      control.dataset.status = item.id; control.dataset.action = item.id === 'goal' ? 'goal' : `status-${item.id}`;
      control.setAttribute('aria-label', `${item.label}, ${item.value}, ${item.detail}`);
      const symbol = el('span', 'pw-home-breakdown-symbol'); symbol.append(statusIcon(item.id));
      const copy = el('span', 'pw-home-breakdown-copy');
      copy.append(el('span', 'pw-home-breakdown-label', item.label), el('span', 'pw-home-breakdown-value', item.value));
      control.append(symbol, copy, chevron('pw-home-breakdown-chevron')); breakdown.append(control);
    }
    hero.append(body, stage, breakdown); return hero;
  }
  function savingCard() {
    const data = dashboard.challenge, target = featureRoute('goal-contribution');
    const node = card('pw-home-saving', '일주일 동안 3번 저축하기');
    const options = menu('저축 챌린지', data.completed === null
      ? '저축 날짜와 횟수가 아직 연결되지 않아 이번 주 진행률을 표시할 수 없어요. 받은 돈이나 목표 금액을 저축 횟수로 계산하지 않아요.'
      : `일주일 동안 ${data.target}번 저축하기, 현재 ${data.completed}번 완료했어요.`,
    [['목표에 모으기 안내', target], ['내 목표 보기', { screen: 'goal' }]]);
    const main = el('div', 'pw-home-saving-main'), pig = el('img', 'pw-home-pig');
    pig.src = './assets/pocketwon/graphics/savings-pig-generated.png'; pig.alt = ''; pig.width = 160; pig.height = 170; pig.setAttribute('aria-hidden', 'true');
    const title = el('h2', 'pw-home-saving-title');
    title.append(el('span', '', '일주일 동안'), el('span', '', `${data.target}번 저축하기`)); main.append(pig, title);
    const progress = el('div', 'pw-home-saving-progress'), count = el('span', 'pw-home-saving-count', `${data.completed === null ? '—' : data.completed}/${data.target}`);
    count.setAttribute('aria-label', data.completed === null ? '저축 횟수 확인 안 됨' : `${data.target}번 중 ${data.completed}번 저축`);
    const track = el('span', 'pw-home-saving-track'); track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', '이번 주 저축 챌린지');
    track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(data.target));
    if (Number.isInteger(data.completed)) track.setAttribute('aria-valuenow', String(Math.max(0, Math.min(data.target, data.completed))));
    else track.setAttribute('aria-valuetext', '저축 기록 연동 준비 중');
    const fill = el('span', 'pw-home-saving-fill'); fill.style.width = Number.isInteger(data.completed) ? `${Math.max(0, Math.min(100, data.completed / data.target * 100))}%` : '0%'; track.append(fill);
    const open = button('', () => go(target, open), 'pw-home-saving-open'); open.setAttribute('aria-label', '저축 챌린지 안내 보기'); open.dataset.action = 'saving'; open.append(chevron());
    progress.append(count, track, open);
    node.append(options, main, progress);
    if (data.note) node.append(el('p', 'pw-home-saving-note', data.note));
    return node;
  }
  function habitCard() {
    const data = dashboard.donut, node = card('pw-home-habit', '나의 금융 습관');
    node.append(cardHeader('나의 금융 습관', { screen: 'report', segment: 'flow' }, 'habit', menu('금융 습관',
      `${data.period}에 기록한 지출을 분류한 차트예요. 간식은 식비, 문구는 쇼핑, 게임은 문화·여가로 표시하며 저장된 분류는 그대로 유지해요.${data.omitted ? ` 날짜나 금액을 확인할 수 없는 기록 ${data.omitted}건은 제외했어요.` : ''}`,
      [['지출 리포트 보기', { screen: 'report', segment: 'flow' }], ['용돈 내역 보기', { screen: 'record', stage: 'list' }]])));
    const body = el('div', 'pw-home-habit-body'), donut = el('div', 'pw-home-donut');
    donut.dataset.status = data.status;
    const chart = svg('svg', { class: 'pw-home-donut-chart', viewBox: '0 0 120 120', 'aria-hidden': 'true' });
    const radius = 46, circumference = 2 * Math.PI * radius;
    chart.append(svg('circle', { class: 'pw-home-donut-track', cx: 60, cy: 60, r: radius, fill: 'none', stroke: '#E7EDF4', 'stroke-width': 22 }));
    let offset = 0;
    if (data.total > 0) for (const category of data.categories) {
      const fraction = category.amount / data.total, length = fraction * circumference;
      if (length > 0) chart.append(svg('circle', { class: 'pw-home-donut-segment', cx: 60, cy: 60, r: radius, fill: 'none', stroke: category.color, 'stroke-width': 22,
        'stroke-dasharray': `${Math.max(0, length - 1.1)} ${circumference}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 60 60)', 'data-category': category.id }));
      offset += length;
    }
    const center = el('div', 'pw-home-donut-center');
    const total = el('strong', 'pw-home-donut-value', data.total === null ? '—' : `${data.total >= 1e6 ? compactAmount(data.total) : number(data.total)}원`);
    total.dataset.money = 'category-spent';
    center.append(el('span', 'pw-home-donut-label', '총 지출'), total); donut.append(chart, center);
    donut.setAttribute('role', 'img'); donut.setAttribute('aria-label', `${data.period}, 총 지출 ${data.total === null ? '확인 안 됨' : `${number(data.total)}원`}`);
    const legend = el('ul', 'pw-home-legend'); legend.setAttribute('aria-label', '이번 달 지출 분류');
    for (const category of data.categories) {
      const row = el('li', 'pw-home-legend-row'); row.dataset.category = category.id;
      const dot = el('span', 'pw-home-legend-dot'); dot.style.background = category.color; dot.setAttribute('aria-hidden', 'true');
      row.append(dot, el('span', 'pw-home-legend-label', category.label), el('span', 'pw-home-legend-value', category.percent === null ? '—' : `${category.percent}%`)); legend.append(row);
    }
    body.append(donut, legend); node.append(body); return node;
  }
  function weeklyCard() {
    const data = dashboard.week, node = card('pw-home-weekly', '이번 주 용돈 흐름');
    node.append(cardHeader('이번 주 용돈 흐름', { screen: 'report', segment: 'flow' }, 'weekly', menu('이번 주 용돈 흐름',
      '월요일부터 일요일까지 기록한 지출이에요. 아직 오지 않은 날은 미집계로 표시하고, 확인할 수 없는 기록을 0원으로 바꾸지 않아요.',
      [['돈 흐름 리포트 보기', { screen: 'report', segment: 'flow' }], ['용돈 내역 보기', { screen: 'record', stage: 'list' }]])));
    const body = el('div', 'pw-home-weekly-body');
    const chart = svg('svg', { class: 'pw-home-weekly-plot', viewBox: '0 0 244 78', preserveAspectRatio: 'none', 'aria-hidden': 'true' }); chart.dataset.chartKind = 'spending';
    const maximum = Math.max(1, ...data.days.filter(day => day.amount !== null).map(day => day.amount));
    const baseline = 60, top = 20;
    chart.append(svg('line', { class: 'pw-home-weekly-baseline', x1: 2, x2: 242, y1: baseline, y2: baseline }));
    data.days.forEach((day, index) => {
      const x = 18 + index * 34.4, height = day.amount === null ? 2 : Math.max(1.8, day.amount / maximum * (baseline - top));
      const highlighted = day.key === data.highlightKey;
      const bar = svg('rect', { class: `pw-home-weekly-bar${highlighted ? ' pw-home-weekly-bar--highlight' : ''}${day.amount === null ? ' pw-home-weekly-bar--unknown' : ''}`,
        x: x - 12, y: baseline - height, width: 24, height, rx: Math.min(8, height / 2), 'data-date-key': day.key });
      if (day.amount !== null) bar.dataset.value = String(day.amount);
      const value = svg('text', { class: `pw-home-weekly-value${highlighted ? ' pw-home-weekly-value--highlight' : ''}`, x, y: Math.max(12, baseline - height - 7), 'text-anchor': 'middle' });
      value.textContent = day.amount === null ? '—' : compactAmount(day.amount);
      const label = svg('text', { class: `pw-home-weekly-date${highlighted ? ' pw-home-weekly-date--highlight' : ''}`, x, y: 75, 'text-anchor': 'middle' });
      label.textContent = day.weekday || ['월', '화', '수', '목', '금', '토', '일'][index]; chart.append(bar, value, label);
    });
    const detail = el('p', 'pw-sr-only', `주간 지출, ${data.days.map(day => `${day.label} ${day.future ? '미집계' : day.amount === null ? '확인 안 됨' : `${number(day.amount)}원`}`).join(', ')}${data.omitted ? `, 유효하지 않은 기록 ${data.omitted}건 제외` : ''}`);
    const reaction = el('div', 'pw-home-weekly-reaction');
    reaction.append(el('p', 'pw-home-weekly-bubble', data.message || '이번 주 용돈도\n차근차근 살펴봐요!'),
      pwIllustrationPanel('all', { panelClass: 'pw-compact-visual pw-home-weekly-art' }));
    const music = el('span', 'pw-home-weekly-music', '♪'); music.setAttribute('aria-hidden', 'true'); reaction.append(music);
    body.append(chart, reaction, detail); node.append(body); return node;
  }
  function insightIcon(kind) {
    const icon = svg('svg', { viewBox: '0 0 28 28', 'aria-hidden': 'true' });
    if (kind === 'positive') icon.append(svg('path', { d: 'M8 17a8 8 0 1 1 12 0c-2 2-2 3-2 4h-8c0-1 0-2-2-4Z', fill: '#FFD34E' }),
      svg('path', { d: 'M11 23h6m-5 3h4', stroke: '#148DF4', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      svg('path', { d: 'M10 7c1-2 3-3 5-3', stroke: '#FFF7AF', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    else for (const [x, y, height] of [[4, 17, 8], [12, 11, 14], [20, 4, 21]]) icon.append(svg('rect', { x, y, width: 5, height, rx: 2.5, fill: '#078FFB' }));
    return icon;
  }
  function insightsSection() {
    const data = dashboard.insights, section = el('section', 'pw-home-card pw-home-insights');
    section.setAttribute('aria-label', 'AI 맞춤 인사이트'); section.dataset.pwMotionCard = ''; section.dataset.status = data.status;
    const header = el('div', 'pw-home-insights-heading'), title = el('h2');
    title.append(link('AI 맞춤 인사이트', featureRoute('ai-report'), 'pw-home-card-link', 'insights'));
    const more = link('더보기', featureRoute('ai-report'), 'pw-home-insights-more', 'insights-more'); more.setAttribute('aria-label', 'AI 맞춤 인사이트 더보기');
    header.append(title, more);
    const grid = el('div', 'pw-home-insight-grid');
    for (const kind of ['positive', 'advice']) {
      const item = data[kind], target = featureRoute(kind === 'positive' ? 'habit-analysis' : 'coaching');
      const panel = button('', () => go(target, panel), `pw-home-insight pw-home-insight--${kind}`); panel.dataset.action = `insight-${kind}`;
      const caption = el('span', 'pw-home-insight-title'), icon = el('span', 'pw-home-insight-icon'); icon.append(insightIcon(kind));
      const titleText = el('span');
      if (kind === 'positive' && item.title.endsWith('좋아요!')) titleText.append(document.createTextNode(item.title.slice(0, -4)), el('strong', '', '좋아요!'));
      else titleText.textContent = item.title;
      caption.append(icon, titleText);
      if (kind === 'advice') caption.append(chevron());
      panel.append(caption, el('span', 'pw-home-insight-body', item.body));
      if (kind === 'positive') panel.append(pwIllustrationPanel('report', { panelClass: 'pw-compact-visual pw-home-insight-art' }));
      grid.append(panel);
    }
    section.append(header, grid); return section;
  }
  const primary = el('div', 'pw-home-primary-row'); primary.append(savingCard(), habitCard());
  root.append(allowanceHero(), primary, weeklyCard(), insightsSection());
  return { element: root, mount() {}, dispose() { disposed = true; for (const flow of [...sheets]) flow.dispose(); } };
}
