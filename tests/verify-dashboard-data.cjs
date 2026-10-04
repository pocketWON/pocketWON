/* Reference dashboard adapters are projections, never stored financial policy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.resolve(__dirname, '../ks6s3juocjzc2.kimi.page');
const source = ['state.js', 'feature-models.js', 'home.js'].map(file => fs.readFileSync(path.join(app, 'scripts', file), 'utf8')).join('\n');
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
