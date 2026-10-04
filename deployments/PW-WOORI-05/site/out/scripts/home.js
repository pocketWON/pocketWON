/* Read-only dashboard projections. Financial state and writes remain in state.js. */
/* One purchase per saved expense; period bounds are inclusive local calendar dates. */
function createPurchaseDonutModel(loaded, now = new Date(), period) {
  const keyOf = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const monday = new Date(now); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  const start = period ? period.start : keyOf(monday), end = period ? period.end : keyOf(sunday);
  const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parsePocketWONDate(value + 'T12:00:00');
  const calendar = PWFeatureModels.calendar(loaded, now);
  const validPeriod = !!(validDay(start) && validDay(end) && start <= end);
  const known = loaded?.status === 'loaded' && calendar.status !== 'unavailable' && validPeriod;
  let received = known ? 0 : null, spent = known ? 0 : null;
  const purchases = [];
  const add = (total, amount) => total !== null && Number.isSafeInteger(total + amount) ? total + amount : null;
  if (known) for (const [key, rows] of calendar.days) {
    if (key < start || key > end) continue;
    for (const row of rows) {
      const time = parsePocketWONDate(row.timestamp).getTime();
      if (time > now.getTime()) continue;
      if (row.type === 'in') received = add(received, row.amount);
      else {
        spent = add(spent, row.amount);
        purchases.push({ id: 'purchase-' + row.sourceIndex, sourceIndex: row.sourceIndex, label: row.memo.trim() || '이름 없는 구매', amount: row.amount, timestamp: row.timestamp, time });
      }
    }
  }
  purchases.sort((a, b) => b.amount - a.amount || b.time - a.time || a.sourceIndex - b.sourceIndex);
  // Alternate light and dark solid blues so adjacent purchases stay distinguishable.
  const colors = ['#168FF5', '#A0DFFE', '#4AAFEA', '#C1E8FF', '#55CBE8', '#79A4E8'];
  const segments = purchases.slice(0, 5).map((item, index) => ({ ...item, color: colors[index], count: 1 }));
  if (purchases.length > 5) segments.push({ id: 'other-purchases', sourceIndex: null, label: '외 ' + (purchases.length - 5) + '건', count: purchases.length - 5,
    amount: purchases.slice(5).reduce((sum, item) => add(sum, item.amount), 0), color: colors[5] });
  const safe = received !== null && spent !== null;
  for (const item of segments) item.fraction = safe && received > 0 ? item.amount / received : null;
  const remaining = safe ? Math.max(0, received - spent) : null, overBudget = safe ? Math.max(0, spent - received) : null;
  const status = !safe ? 'unavailable' : received === 0 ? 'no-allowance' : overBudget > 0 ? 'overspent' : spent === 0 ? 'empty' : 'available';
  return { status, received, spent, remaining, overBudget, items: purchases, segments, omitted: calendar.omitted,
    periodStart: validPeriod ? start : null, periodEnd: validPeriod ? end : null,
    period: validPeriod ? start + ' ~ ' + end : '기간 확인 필요', periodLabel: period ? '기간 내 용돈' : '이번 주 용돈' };
}

function createHomeDashboardModel(loaded, now = new Date(), period) {
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
    const recorded = known && !future && (calendar.days.get(key) || []).some(row => parsePocketWONDate(row.timestamp).getTime() <= now.getTime());
    if (amount !== null) for (const row of calendar.days.get(key) || []) {
      if (row.type !== 'out' || parsePocketWONDate(row.timestamp)?.getTime() > now.getTime()) continue;
      if (!Number.isSafeInteger(amount + row.amount)) { amount = null; break; }
      amount += row.amount;
    }
    return { date, key, label: `${date.getMonth() + 1}/${date.getDate()}`, weekday: weekdays[index], amount, future, recorded };
  });
  const dayIndex = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const todayIndex = dayIndex(now), recentAmounts = { in: 0, out: 0 };
  let habitAmountsSafe = true;
  if (known) for (const rows of calendar.days.values()) for (const row of rows) {
    const date = parsePocketWONDate(row.timestamp);
    if (!date || date.getTime() > now.getTime()) continue;
    const age = todayIndex - dayIndex(date);
    if (habitAmountsSafe && age >= 0 && age < 28) {
      const amount = recentAmounts[row.type] + row.amount;
      if (!Number.isSafeInteger(amount)) habitAmountsSafe = false;
      else recentAmounts[row.type] = amount;
    }
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
    calendar, habit, today: keyOf(today), balance: home.balance,
    statusPill: loaded?.status === 'empty' ? '첫 기록을 남겨볼까요? 💙'
      : loaded?.status !== 'loaded' || home.balance === null ? '용돈 정보를 확인하고 있어요'
      : '지금 쓸 수 있는 용돈이에요! 💙',
    statuses: [
      habitStatus('spending', '지출 관리'),
      habitStatus('saving', '저축 습관'),
      { id: 'goal', label: '목표 달성', value: goalKnown ? `${home.goal.percent}%` : home.goal.status === 'empty' ? '시작' : '확인 중', detail: goalKnown ? `${home.goal.title}, ${home.goal.percent}% 달성` : '저장된 목표 확인하기' },
    ],
    challenge: { status: 'unavailable', completed: null, target: 3, note: '저축 기록 연동 준비 중' },
    donut: createPurchaseDonutModel(loaded, now, period),
    week: { status: known ? 'available' : 'unavailable', days, omitted: calendar.omitted, highlightKey: keyOf(today),
      crownKey: days.filter(day => day.recorded && day.amount !== null).sort((a, b) => a.amount - b.amount || b.key.localeCompare(a.key))[0]?.key || null,
      message: known ? '이번 주 용돈도\n차근차근 살펴봐요!' : '첫 기록부터\n함께 시작해요!' },
    insights: { status: 'preparing',
      ranking: { status: 'unavailable', entries: [] },
      positive: { title: '이런 점이 좋아요!', score: habit?.status === 'available' && Number.isInteger(habit.score) ? habit.score : null,
        body: habit?.status === 'available' && Number.isInteger(habit.score) ? habit.coaching.strength || habit.coaching.next : '기록을 남기면 습관 점수를 확인할 수 있어요.' },
      advice: { title: '이렇게 해보세요!', body: '주말에 쓸 용돈을 미리 정해보세요. 물건을 사기 전에는 꼭 필요한지, 비슷한 물건이 이미 있는지 살펴보세요. 작은 지출도 바로 기록하면 남은 용돈을 알기 쉬워요. 쓰고 남은 돈은 저축 목표에 조금씩 보태보세요.' } },
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
    control.append(el('span', 'pw-home-card-title', label)); return control;
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
    hero.setAttribute('aria-labelledby', 'pw-home-balance-title');
    const body = el('div', 'pw-home-hero-body'), title = el('h2', 'pw-home-hero-title', '정후의 용돈'); title.id = 'pw-home-balance-title';
    const balance = money(dashboard.balance === undefined ? model.balance : dashboard.balance, 'pw-home-money'); balance.dataset.money = 'balance';
    if ((balance.querySelector('.pw-money-digits')?.textContent.length || 0) > 7) balance.dataset.wide = 'true';
    const balanceAction = button('', () => go({ screen: 'record', stage: 'list' }, balanceAction), 'pw-home-balance-link');
    balanceAction.dataset.action = 'list';
    balanceAction.setAttribute('aria-label', `${balance.getAttribute('aria-label') || '잔액 확인 안 됨'}, 용돈 내역 보기`);
    balanceAction.append(balance); body.append(title, balanceAction);
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
      control.append(symbol, copy); breakdown.append(control);
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
    pig.src = './assets/pocketwon/graphics/savings-pig-generated.png'; pig.alt = ''; pig.width = 1254; pig.height = 1254; pig.setAttribute('aria-hidden', 'true');
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
    const data = dashboard.donut, node = card('pw-home-habit', '정후의 소비 습관');
    node.append(cardHeader('정후의 소비 습관', { screen: 'record', stage: 'list' }, 'habit', menu('정후의 소비 습관',
      `${data.period}에 받은 용돈 대비 구매한 품목의 가격을 표시해요. 회청색 빈 부분은 아직 쓰지 않은 용돈이에요.${data.omitted ? ` 날짜나 금액을 확인할 수 없는 기록 ${data.omitted}건은 제외했어요.` : ''}`,
      [['지출 리포트 보기', { screen: 'report', segment: 'flow' }], ['용돈 내역 보기', { screen: 'record', stage: 'list' }]])));
    const body = el('div', 'pw-home-habit-body'), donut = el('div', 'pw-home-donut');
    donut.dataset.status = data.status;
    const chart = svg('svg', { class: 'pw-home-donut-chart', viewBox: '0 0 120 120', role:'group', 'aria-label':'구매 구간별 용돈 사용 내역' });
    const radius = 46, circumference = 2 * Math.PI * radius;
    chart.append(svg('circle', { class: 'pw-home-donut-track', cx: 60, cy: 60, r: radius, fill: 'none', stroke: data.status === 'overspent' ? '#ED8494' : '#E7EDF4', 'stroke-width': 22, 'aria-hidden':'true' }));
    const label = data.status === 'overspent' ? '용돈 초과' : data.status === 'no-allowance' ? '용돈 기록 필요' : data.status === 'unavailable' ? '기록 확인 필요' : data.periodLabel;
    const value = data.status === 'overspent' ? data.overBudget : data.received;
    const defaultValue = value === null ? '—' : `${value >= 1e6 ? compactAmount(value) : number(value)}원`;
    const center = button('', () => {
      const item = preview || selected;
      go(item?.sourceIndex !== undefined ? { screen:'record', stage:'detail', sourceIndex:item.sourceIndex, returnTo:{screen:'home'} } : { screen:'record', stage:'list' }, center);
    }, 'pw-home-donut-center');
    const centerLabel = el('span','pw-home-donut-label',label), total = el('strong','pw-home-donut-value',defaultValue);
    total.dataset.money = data.status === 'overspent' ? 'allowance-overflow' : 'allowance-received';
    center.append(centerLabel,total);
    const announcement = el('span','pw-sr-only'); announcement.setAttribute('role','status');
    let selected = null, preview = null;
    const controls = [];
    function paint() {
      const item = preview || selected;
      // Keep the pressed center's text nodes stable when arc focus changes.
      const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
      setText(centerLabel, item ? item.label : label);
      setText(total, item ? `${item.sourceIndex !== undefined ? '−' : ''}${item.amount >= 1e6 ? compactAmount(item.amount) : number(item.amount)}원` : defaultValue);
      center.dataset.purchase = item?.id || '';
      center.title = item ? `${item.label} · ${number(item.amount)}원` : `${label} · ${number(value)}원`;
      center.setAttribute('aria-label', item ? `${item.label}, ${number(item.amount)}원, ${item.sourceIndex !== undefined ? '구매 상세' : '전체 내역'} 보기` : `${label}, ${number(value)}원, 전체 내역 보기`);
      setText(announcement, item ? `${item.label}, ${number(item.amount)}원` : '');
      for (const control of controls) {
        control.element.dataset.active = String(control.item === item);
        control.element.setAttribute('aria-pressed',String(control.item === selected));
      }
    }
    function addArc(item, offset, className) {
      // Exact arc length: a 5,000 / 50,000 purchase fills 10% of the circle.
      const arc = svg('circle', { class:className, cx:60, cy:60, r:radius, fill:'none', stroke:item.color, 'stroke-width':22,
        'stroke-dasharray':`${item.fraction * circumference} ${circumference}`, 'stroke-dashoffset':-offset * circumference, transform:'rotate(-90 60 60)',
        'data-purchase':item.id, 'data-fraction':item.fraction, 'data-offset':offset, role:'button', tabindex:controls.length ? -1 : 0,
        'aria-label':`${item.label}, ${number(item.amount)}원`, 'aria-pressed':'false' });
      const select = () => { selected = selected === item ? null : item; preview = null; paint(); };
      arc.addEventListener('pointerenter', event => { if(event.pointerType !== 'touch') { preview = item; paint(); } });
      arc.addEventListener('pointerleave', () => { preview = null; paint(); });
      arc.addEventListener('focus', () => { preview = item; for(const control of controls) control.element.tabIndex = control.element === arc ? 0 : -1; paint(); });
      arc.addEventListener('blur', () => { preview = null; paint(); });
      arc.addEventListener('click', select);
      arc.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
        else if (event.key === 'Escape') { event.preventDefault(); selected = preview = null; paint(); }
        else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
          event.preventDefault(); const index = controls.findIndex(control => control.element === arc);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1) + controls.length) % controls.length;
          controls[next].element.focus();
        }
      });
      controls.push({item,element:arc}); chart.append(arc);
    }
    if (data.status === 'available') {
      const colors = data.segments.map(item => item.color);
      let offset = 0;
      for (const [index,purchase] of data.items.entries()) {
        const item = {...purchase, color:colors[index % colors.length], fraction:purchase.amount / data.received};
        addArc(item,offset,'pw-home-donut-segment'); offset += item.fraction;
      }
      if (data.remaining > 0) addArc({id:'remaining',label:'남은 용돈',amount:data.remaining,fraction:data.remaining/data.received,color:'#E7EDF4'},offset,'pw-home-donut-remaining');
    }
    paint();
    const explanation = data.status === 'unavailable' ? '용돈 확인 필요' : data.status === 'no-allowance' ? '받은 용돈을 기록해요' : data.status === 'overspent' ? `${number(data.overBudget)}원 초과` : `남은 용돈 ${number(data.remaining)}원`;
    donut.setAttribute('role','group'); donut.setAttribute('aria-label',`${data.period}, 받은 용돈 ${number(data.received)}원, 구매 ${number(data.spent)}원, ${explanation}. 구간을 누르면 구매명과 가격을 확인할 수 있어요. 키보드는 화살표로 이동하고 Escape로 해제해요.`);
    donut.append(chart,center,announcement); body.append(donut); node.append(body); return node;
  }

  function weeklyCard() {
    const data = dashboard.week, node = card('pw-home-weekly', '용돈 인사이트');
    node.append(cardHeader('용돈 인사이트', { screen: 'report', segment: 'flow' }, 'weekly', menu('용돈 인사이트',
      '월요일부터 일요일까지 기록한 지출이에요. 많이 쓴 날일수록 막대가 높고 파랑이 진해져요. 아직 오지 않은 날은 미집계로 표시하고, 확인할 수 없는 기록을 0원으로 바꾸지 않아요.',
      [['돈 흐름 리포트 보기', { screen: 'report', segment: 'flow' }], ['용돈 내역 보기', { screen: 'record', stage: 'list' }]])));
    const body = el('div', 'pw-home-weekly-body');
    const chart = el('div', 'pw-home-weekly-plot');
    chart.setAttribute('aria-hidden', 'true'); chart.dataset.chartKind = 'spending';
    const maximum = Math.max(1, ...data.days.filter(day => day.amount !== null).map(day => day.amount));
    data.days.forEach((day, index) => {
      const column = el('div', 'pw-home-weekly-day');
      const ratio = day.amount === null ? 0 : day.amount / maximum;
      column.style.setProperty('--pw-bar-ratio', String(ratio));
      const highlighted = day.key === data.highlightKey;
      const bar = el('span', `pw-home-weekly-bar${day.amount === null ? ' pw-home-weekly-bar--unknown' : ''}`);
      bar.dataset.dateKey = day.key;
      if (day.amount !== null) {
        bar.dataset.value = String(day.amount);
        // Solid pale-to-bright blues encode spend; today's date never overrides the amount color.
        const color = [199, 234, 255].map((channel, i) => Math.round(channel + ([24, 158, 247][i] - channel) * ratio));
        bar.style.setProperty('--pw-bar-color', `rgb(${color.join(', ')})`);
      }
      const value = el('span', 'pw-home-weekly-value');
      value.textContent = day.amount === null ? '—' : `${day.amount > 0 ? '-' : ''}${number(day.amount)}원`;
      if (value.textContent.length > 8) value.classList.add('pw-home-weekly-value--long');
      const label = el('span', `pw-home-weekly-date${highlighted ? ' pw-home-weekly-date--highlight' : ''}`);
      label.textContent = day.weekday || ['월', '화', '수', '목', '금', '토', '일'][index]; column.append(bar, value, label); chart.append(column);
    });
    const detail = el('p', 'pw-sr-only', `주간 지출, 많이 쓴 날일수록 높은 막대와 진한 파랑으로 표시, ${data.days.map(day => `${day.label} ${day.future ? '미집계' : day.amount === null ? '확인 안 됨' : `${number(day.amount)}원 지출`}`).join(', ')}${data.omitted ? `, 유효하지 않은 기록 ${data.omitted}건 제외` : ''}`);
    body.append(chart, detail); node.append(body); return node;
  }
  function rankingMedal(rank) {
    const medal = svg('svg', { class: 'pw-home-ranking-medal', viewBox: '0 0 36 32', 'aria-hidden': 'true' });
    medal.append(svg('path', { d: 'm18 0 1.7 3.5 3.8.6-2.8 2.7.7 3.8L18 8.8l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6Z', fill: 'currentColor' }),
      svg('path', { d: 'M8 13H3v8l5 4m20-12h5v8l-5 4', fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'm18 10 10 3v10c0 4-6 7-10 9-4-2-10-5-10-9V13Z', fill: 'currentColor' }));
    const value = svg('text', { x: 18, y: 25, fill: '#fff', 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800 });
    value.textContent = rank; medal.append(value); return medal;
  }
  function rankingCard() {
    const data = dashboard.insights.ranking;
    const isDemo = data?.status === 'demo' && data.entries.length === 3;
    const description = isDemo
      ? '화면을 체험할 수 있도록 만든 예시 랭킹이에요. 닉네임과 순위는 가상이며, 실제 사용자 순위는 아직 연결되지 않았어요. 나의 습관 점수는 리포트에서 확인할 수 있어요.'
      : '사용자 간 랭킹은 아직 연결되지 않았어요. 지금은 리포트에서 내 기록으로 계산한 습관 점수를 확인할 수 있어요.';
    const panel = button('', () => openMenu('용돈 랭킹', description, [['내 습관 리포트 보기', featureRoute('habit-analysis')]], panel), 'pw-home-insight pw-home-ranking');
    panel.dataset.action = 'insight-ranking'; panel.dataset.status = isDemo ? 'demo' : 'unavailable';
    if (isDemo) {
      panel.setAttribute('aria-label', '용돈 랭킹 예시, ' + data.entries.map(item => `${item.rank}위 ${item.name}`).join(', ') + ', 안내 열기');
      const podium = el('span', 'pw-home-ranking-podium'); podium.setAttribute('aria-hidden', 'true');
      for (const rank of [2, 1, 3]) {
        const item = data.entries.find(entry => entry.rank === rank);
        const person = el('span', 'pw-home-ranking-person'); person.dataset.rank = rank;
        const avatar = el('span', 'pw-home-ranking-avatar');
        avatar.append(el('span', 'pw-home-ranking-animal', item.avatar));
        person.append(rankingMedal(rank), avatar, el('span', 'pw-home-ranking-name', item.name));
        podium.append(person);
      }
      panel.append(podium);
    } else {
      panel.setAttribute('aria-label', '용돈 랭킹 연동 준비 중, 안내 열기');
      const empty = el('span', 'pw-home-ranking-empty');
      const trophy = el('span', 'pw-home-ranking-empty-icon', '🏆'); trophy.setAttribute('aria-hidden', 'true');
      empty.append(trophy, el('strong', '', '랭킹 연동 준비 중'), el('span', '', '내 습관은 리포트에서 확인해요'));
      panel.append(empty);
    }
    return panel;
  }
  function insightsSection() {
    const data = dashboard.insights, section = el('section', 'pw-home-card pw-home-insights');
    section.setAttribute('aria-label', 'AI 인사이트'); section.dataset.pwMotionCard = ''; section.dataset.status = data.status;
    const grid = el('div', 'pw-home-insight-grid');
    const panel = button('', () => go(featureRoute('coaching'), panel), 'pw-home-insight pw-home-insight--advice'); panel.dataset.action = 'insight-advice';
    const caption = el('span', 'pw-home-insight-title');
    caption.append(el('span', '', data.advice.title));
    panel.append(caption, el('span', 'pw-home-insight-body', data.advice.body));
    grid.append(rankingCard(), panel);
    section.append(grid); return section;
  }
  const primary = el('div', 'pw-home-primary-row'); primary.append(savingCard(), habitCard());
  const overview = el('section', 'pw-home-card pw-home-overview');
  overview.setAttribute('aria-label', '용돈 인사이트');
  overview.append(weeklyCard(), insightsSection());
  root.append(allowanceHero(), primary, overview);
  return { element: root, mount() {}, dispose() { disposed = true; for (const flow of [...sheets]) flow.dispose(); } };
}
