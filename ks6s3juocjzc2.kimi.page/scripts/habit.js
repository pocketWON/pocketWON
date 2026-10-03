/* Habit score: a fixed rule set over saved records. Pure, read-only, never persisted.
 * The legacy habitScore field is neither read nor written here.
 *
 * Window: the latest 28 local days ending today (4 weeks of 7 days).
 *   record    30  distinct days with a record, full at 12 days
 *   spending  25  spent ÷ received: ≤ 50% full, ≥ 100% zero, linear between
 *   goal      25  a goal exists 10 + progress percent × 15
 *   saving    20  5 per week whose received ≥ spent (weeks without records score 0)
 * An item that cannot be checked is null, and then the total is null too.
 */
const PW_HABIT_WINDOW_DAYS = 28;
const PW_HABIT_ITEMS = Object.freeze([
  Object.freeze({ id: 'record', label: '기록 빈도', max: 30 }),
  Object.freeze({ id: 'spending', label: '소비 패턴', max: 25 }),
  Object.freeze({ id: 'goal', label: '목표 행동', max: 25 }),
  Object.freeze({ id: 'saving', label: '저축 습관', max: 20 }),
]);
const PW_HABIT_COACHING = Object.freeze({
  strength: Object.freeze({
    record: '기록을 자주 남기고 있어요.',
    spending: '받은 돈에 비해 아껴 쓰고 있어요.',
    goal: '목표를 정하고 꾸준히 가고 있어요.',
    saving: '받은 돈보다 적게 쓴 주가 많아요.',
  }),
  next: Object.freeze({
    record: '돈을 받거나 쓴 날에 바로 기록해 볼까요?',
    spending: '쓴 돈이 받은 돈의 절반을 넘지 않게 해볼까요?',
    goalEmpty: '갖고 싶은 것을 목표로 정해볼까요?',
    goal: '목표까지 남은 금액을 함께 확인해 볼까요?',
    saving: '받은 돈보다 적게 쓰는 주를 늘려볼까요?',
    done: '지금처럼 계속 기록해요!',
  }),
});

function pwHabitDayIndex(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function pwHabitWindowItems(records, offset, goal) {
  const inWindow = records.filter(row => row.age >= offset && row.age < offset + PW_HABIT_WINDOW_DAYS);
  if (!inWindow.length) return null;
  const days = new Set(inWindow.map(row => row.age)).size;
  const sum = type => inWindow.reduce((total, row) => total + (row.tx.type === type ? row.tx.amount : 0), 0);
  const received = sum('in'), spent = sum('out');
  const ratio = received > 0 ? spent / received : null;
  const weeks = Array.from({ length: PW_HABIT_WINDOW_DAYS / 7 }, (_, week) => {
    const rows = inWindow.filter(row => Math.floor((row.age - offset) / 7) === week);
    const net = rows.reduce((total, row) => total + (row.tx.type === 'in' ? row.tx.amount : -row.tx.amount), 0);
    return rows.length > 0 && net >= 0;
  }).filter(Boolean).length;
  return {
    record: { points: Math.round(Math.min(days, 12) / 12 * 30), detail: `기록한 날 ${days}일`, days },
    spending: {
      points: ratio === null ? 0 : ratio <= 0.5 ? 25 : ratio >= 1 ? 0 : Math.round((1 - ratio) / 0.5 * 25),
      detail: ratio === null ? '받은 돈 기록 없음' : `받은 돈의 ${Math.round(ratio * 100)}% 사용`,
      received, spent,
    },
    goal: goal.status === 'invalid' ? { points: null, detail: '확인 안 됨' }
      : goal.status === 'empty' ? { points: 0, detail: '목표 없음' }
      : { points: Math.round(10 + goal.percent / 100 * 15), detail: `목표 ${goal.percent}% 진행` },
    saving: { points: weeks * 5, detail: `4주 중 ${weeks}주`, weeks },
  };
}

function createHabitScoreModel(state, now = new Date()) {
  const transactions = pwObject(state) && Array.isArray(state.transactions) ? state.transactions : null;
  if (transactions === null) return { status: 'unavailable', windowDays: PW_HABIT_WINDOW_DAYS };
  const today = pwHabitDayIndex(now);
  const records = [];
  let skipped = 0;
  for (const tx of transactions) {
    const date = validPocketWONTransaction(tx) ? parsePocketWONDate(tx.ts) : null;
    if (!date) { skipped++; continue; }
    if (date.getTime() > now.getTime()) continue;
    records.push({ tx, age: today - pwHabitDayIndex(date) });
  }
  const goal = createGoalViewModel(state);
  const current = pwHabitWindowItems(records, 0, goal);
  if (!current) return { status: 'insufficient', windowDays: PW_HABIT_WINDOW_DAYS, partial: skipped > 0 };
  const total = items => PW_HABIT_ITEMS.some(({ id }) => items[id].points === null) ? null
    : PW_HABIT_ITEMS.reduce((sum, { id }) => sum + items[id].points, 0);
  const previousItems = pwHabitWindowItems(records, PW_HABIT_WINDOW_DAYS, goal);
  const score = total(current);
  const previous = previousItems ? total(previousItems) : null;
  const items = PW_HABIT_ITEMS.map(({ id, label, max }) => ({ id, label, max, points: current[id].points, detail: current[id].detail }));
  const known = items.filter(item => item.points !== null);
  const rank = item => item.points / item.max;
  const best = known.reduce((a, b) => (rank(b) > rank(a) ? b : a), known[0]);
  const weakest = known.reduce((a, b) => (rank(b) < rank(a) ? b : a), known[0]);
  const nextKey = rank(weakest) === 1 ? 'done' : weakest.id === 'goal' && goal.status === 'empty' ? 'goalEmpty' : weakest.id;
  return {
    status: 'available',
    windowDays: PW_HABIT_WINDOW_DAYS,
    score,
    previous,
    change: score !== null && previous !== null ? score - previous : null,
    items,
    partial: skipped > 0,
    coaching: {
      strength: best.points > 0 && (best !== weakest || nextKey === 'done') ? PW_HABIT_COACHING.strength[best.id] : null,
      next: PW_HABIT_COACHING.next[nextKey],
    },
  };
}
