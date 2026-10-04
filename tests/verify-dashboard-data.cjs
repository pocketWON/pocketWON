/* Reference dashboard adapters are projections, never stored financial policy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.resolve(__dirname, '../ks6s3juocjzc2.kimi.page');
const source = ['state.js', 'habit.js', 'feature-models.js', 'home.js'].map(file => fs.readFileSync(path.join(app, 'scripts', file), 'utf8')).join('\n');
const api = vm.runInNewContext(`${source}\n({createHomeDashboardModel, createHomeViewModel})`, { Date });
const now = new Date(2026, 9, 1, 12);
const tx = (day, amount, type = 'out', memo = '') => ({ type, amount, category: type === 'in' ? '용돈' : '간식', memo, ts: `${day}T10:00:00` });
const state = { balance: 32000, monthly: { saving: 50000, spending: 18000 }, habitScore: 82.75, goal: { title: '새 자전거', current: 180000, target: 300000 }, transactions: [
  tx('2026-09-28', 1000), tx('2026-09-28', 2500, 'out', '편의점'), tx('2026-09-29', 50000, 'in'), tx('2026-09-30', 500),
  tx('2026-10-01', 750), tx('2026-10-02', 1000), tx('2026-09-27', 999), tx('2026-02-30', 111),
  { ...tx('2026-10-01', 250), type: 'unknown' }, tx('2026-10-01', -1), tx('2026-10-01', 1.5), null,
] };
const freeze = item => { if (item && typeof item === 'object') { Object.values(item).forEach(freeze); Object.freeze(item); } return item; };
freeze(state);
const before = JSON.stringify(state);
const projected = api.createHomeDashboardModel({ status: 'loaded', state }, now);
const array = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(array(projected.week.days.map(day => day.key)), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
assert.deepEqual(array(projected.week.days.map(day => day.amount)), [3500, 0, 500, 750, null, null, null]);
assert.deepEqual(array(projected.week.days.map(day => day.future)), [false, false, false, false, true, true, true]);
assert.equal(projected.week.status, 'available');
assert.equal(projected.week.omitted, 5);
assert.equal(projected.calendar.days.get('2026-09-28')[1].sourceIndex, 1);
assert.equal(projected.calendar.days.get('2026-09-28')[1].memo, '편의점');
assert.equal(projected.today, '2026-10-01');
assert.equal(JSON.stringify(state), before);
console.log('PASS current week uses browser-local Monday–Sunday, excludes income/invalid dates and keeps source positions');

const overflow = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [tx('2026-09-28', Number.MAX_SAFE_INTEGER), tx('2026-09-28', 1)] } }, now);
assert.equal(overflow.week.days[0].amount, null);
assert.equal(overflow.week.days[1].amount, 0);
console.log('PASS daily integer overflow remains unknown without affecting other days');

for (const loaded of [{ status: 'empty', state: null }, { status: 'invalid', state: null }, { status: 'unavailable', state: null }, { status: 'loaded', state: {} }]) {
  const result = api.createHomeDashboardModel(loaded, now);
  assert.equal(result.week.status, 'unavailable');
  assert(result.week.days.every(day => day.amount === null));
}
const noTransactions = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [] } }, now);
assert.deepEqual(array(noTransactions.week.days.map(day => day.amount)), [0, 0, 0, 0, null, null, null]);
console.log('PASS valid zero is distinct from empty storage, missing data, failed reads and future dates');

const sunday = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [] } }, new Date(2026, 9, 4, 12));
assert.equal(sunday.week.days[0].key, '2026-09-28');
assert(sunday.week.days.every(day => !day.future && day.amount === 0));
const monday = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [] } }, new Date(2026, 9, 5, 12));
assert.equal(monday.week.days[0].key, '2026-10-05');
assert.equal(monday.week.days[6].key, '2026-10-11');
assert.equal(monday.week.days[0].amount, 0);
assert(monday.week.days.slice(1).every(day => day.future && day.amount === null));
const newYear = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [] } }, new Date(2027, 0, 1, 12));
assert.equal(newYear.week.days[0].key, '2026-12-28');
assert.equal(newYear.week.days[6].key, '2027-01-03');
console.log('PASS Sunday/Monday, month and year boundary geometry keeps local dates');

const home = api.createHomeViewModel(state);
assert.equal(home.balance, state.balance);
assert.equal(home.monthly.received, 50000);
assert.equal(home.monthly.spent, 18000);
assert.equal(home.habit.score, 82.75);
assert.equal(home.goal.percent, 60);
assert(!/localStorage|setItem|persistPocketWONState|applyTransaction/.test(fs.readFileSync(path.join(app, 'scripts/home.js'), 'utf8')));
console.log('PASS saved home values and financial functions stay intact; dashboard never writes storage');

const spend = (category, amount, day = '2026-10-01', time = '10:00:00') => ({ type: 'out', category, amount, ts: `${day}T${time}`, memo: '' });
const mix = { ...state, transactions: [
  spend('간식', 6120), spend('문구', 4320), spend('교통', 2160), spend('게임', 1980), spend('생활비', 1800), spend('옛 분류', 1620),
  spend('간식', 9999, '2026-09-30'), spend('간식', 9999, '2026-10-02'), spend('간식', 9999, '2026-10-01', '23:00:00'),
  tx('2026-10-01', 10000, 'in'), spend('간식', 5, '2026-02-30'), spend('간식', -1), null,
] };
freeze(mix);
const mixBefore = JSON.stringify(mix), categoryModel = api.createHomeDashboardModel({ status: 'loaded', state: mix }, now);
assert.equal(categoryModel.donut.total, 18000);
assert.equal(categoryModel.donut.period, '2026년 10월');
assert.equal(categoryModel.donut.status, 'available');
assert.deepEqual(array(categoryModel.donut.categories.map(category => category.id)), ['food', 'shopping', 'transport', 'culture', 'living', 'other']);
assert.deepEqual(array(categoryModel.donut.categories.map(category => category.amount)), [6120, 4320, 2160, 1980, 1800, 1620]);
assert.deepEqual(array(categoryModel.donut.categories.map(category => category.percent)), [34, 24, 12, 11, 10, 9]);
assert.equal(categoryModel.week.days[3].amount, 18000, 'Same-day future spending is not reported early');
assert.equal(categoryModel.week.highlightKey, categoryModel.today);
assert.deepEqual(array(categoryModel.week.days.map(day => day.weekday)), ['월', '화', '수', '목', '금', '토', '일']);
assert.equal(JSON.stringify(mix), mixBefore);
console.log('PASS donut uses the current local calendar month, excludes future/income/invalid rows, and maps legacy labels without mutation');

const thirds = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [spend('간식', 1), spend('문구', 1), spend('교통', 1)] } }, now);
assert.deepEqual(array(thirds.donut.categories.map(category => category.percent)), [34, 33, 33, 0, 0, 0]);
assert.equal(thirds.donut.categories.reduce((sum, category) => sum + category.percent, 0), 100);
const zero = api.createHomeDashboardModel({ status: 'loaded', state: { balance: 0, transactions: [] } }, now);
assert.equal(zero.balance, 0); assert.equal(zero.donut.status, 'empty'); assert.equal(zero.donut.total, 0);
assert(zero.donut.categories.every(category => category.amount === 0 && category.percent === 0));
for (const loaded of [{ status: 'empty', state: null }, { status: 'invalid', state: null }, { status: 'unavailable', state: null }, { status: 'loaded', state: {} }]) {
  const model = api.createHomeDashboardModel(loaded, now);
  assert.equal(model.donut.status, 'unavailable'); assert.equal(model.donut.total, null);
  assert(model.donut.categories.every(category => category.amount === null && category.percent === null));
}
const unsafeTotal = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [spend('간식', Number.MAX_SAFE_INTEGER), spend('문구', 1)] } }, now);
assert.equal(unsafeTotal.donut.total, null); assert.equal(unsafeTotal.donut.status, 'unavailable');
assert(unsafeTotal.donut.categories.every(category => category.amount === null && category.percent === null));
console.log('PASS rounded shares sum to 100; real zero, unavailable sources and aggregate overflow remain distinct');

assert.equal(categoryModel.balance, state.balance);
assert.equal(categoryModel.challenge.completed, null, 'Income and goal progress do not establish dated saving events');
assert.equal(categoryModel.challenge.target, 3);
assert.equal(categoryModel.insights.status, 'preparing');
assert(!categoryModel.insights.positive.body.includes('28%'), 'Unconnected AI must not fabricate reference findings');
assert.equal(categoryModel.statuses.find(item => item.id === 'goal').value, '60%');
assert(categoryModel.statuses.find(item => item.id === 'goal').detail.includes('60% 달성'));
assert.equal(categoryModel.statuses.find(item => item.id === 'saving').value, '0/20점');
assert.equal(categoryModel.statuses.find(item => item.id === 'spending').value, '0/25점');
const frugal = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [tx('2026-10-01', 10000, 'in'), spend('간식', 2000)] } }, now);
assert.equal(frugal.statuses.find(item => item.id === 'spending').value, '25/25점');
assert.equal(frugal.statuses.find(item => item.id === 'saving').value, '5/20점');
assert(frugal.statuses.find(item => item.id === 'saving').detail.includes('최근 28일'));
assert.equal(frugal.challenge.completed, null, 'A weekly net-positive habit score is not a count of saving events');
assert.equal(api.createHomeDashboardModel({ status: 'loaded', state: { ...mix, balance: 24680 } }, now).balance, 24680);
console.log('PASS live balance and goal state bind exactly; unavailable saving/AI sources never become fictional successes');

const unsafeHabit = api.createHomeDashboardModel({ status: 'loaded', state: { ...mix, transactions: [
  tx('2026-10-01', Number.MAX_SAFE_INTEGER, 'in'), tx('2026-10-01', 1, 'in'), tx('2026-10-01', 1, 'in'),
  spend('간식', Number.MAX_SAFE_INTEGER), spend('간식', 2),
] } }, now);
for (const id of ['spending', 'saving']) {
  assert.equal(unsafeHabit.statuses.find(item => item.id === id).value, '확인 중');
}
assert.equal(unsafeHabit.statuses.find(item => item.id === 'goal').value, '60%', 'Independent goal remains available when financial totals overflow');
const excludedUnsafeHabit = api.createHomeDashboardModel({ status: 'loaded', state: { transactions: [
  tx('2026-10-01', 10000, 'in'), spend('간식', 2000),
  tx('2026-09-03', Number.MAX_SAFE_INTEGER, 'in'), tx('2026-09-03', 1, 'in'),
  { ...tx('2026-10-01', Number.MAX_SAFE_INTEGER, 'in'), ts: '2026-10-01T23:00:00' },
] } }, now);
assert.equal(excludedUnsafeHabit.statuses.find(item => item.id === 'spending').value, '25/25점');
assert.equal(excludedUnsafeHabit.statuses.find(item => item.id === 'saving').value, '5/20점');
console.log('PASS unsafe recent habit aggregates stay unknown; future/out-of-window rows cannot poison independent current scores');
