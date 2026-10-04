/* Reference dashboard adapters are projections, never stored financial policy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.resolve(__dirname, '../ks6s3juocjzc2.kimi.page');
const source = ['state.js', 'habit.js', 'feature-models.js', 'home.js'].map(file => fs.readFileSync(path.join(app, 'scripts', file), 'utf8')).join('\n');
const api = vm.runInNewContext(`${source}\n({createHomeDashboardModel, createHomeViewModel, createPurchaseDonutModel, createHabitScoreModel})`, { Date });
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

const modelOf = transactions => api.createHomeDashboardModel({ status: 'loaded', state: { ...state, transactions } }, now);
const purchases = [
  tx('2026-09-28', 50000, 'in'), tx('2026-09-28', 5000, 'out', '문구 세트'),
  tx('2026-09-29', 3000, 'out', '크레파스'), tx('2026-09-30', 2800, 'out', '동화책'),
  tx('2026-10-01', 2400, 'out', '필통'), tx('2026-09-28', 2000, 'out', '색종이'),
  tx('2026-09-29', 1800, 'out', '스티커'), tx('2026-09-30', 1000, 'out', '버스 카드 충전'),
];
freeze(purchases);
const purchaseBefore = JSON.stringify(purchases), m = modelOf(purchases), d = m.donut;
assert.equal(d.received, 50000); assert.equal(d.spent, 18000); assert.equal(d.remaining, 32000);
assert.equal(d.segments[0].fraction, .1);
assert(Math.abs(d.segments.reduce((sum, item) => sum + item.fraction, 0) - .36) < 1e-12);
assert.equal(d.remaining / d.received, .64);
assert.deepEqual(array(d.segments.map(item => item.amount)), [5000, 3000, 2800, 2400, 2000, 2800]);
assert.equal(d.segments[5].label, '외 2건'); assert.equal(d.segments[5].count, 2); assert.equal(d.segments[5].sourceIndex, null);
assert.equal(d.segments[0].sourceIndex, 1); assert.equal(new Set(d.segments.map(item => item.color)).size, 6);
// Solid blue palette with a significant luminance change across every adjacent segment.
const luminance = hex => hex.slice(1).match(/../g).map(x => parseInt(x,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i) => sum + v*[.2126,.7152,.0722][i],0);
for (const [i,item] of d.segments.entries()) {
  const [r,g,b] = item.color.slice(1).match(/../g).map(x => parseInt(x,16)); assert(b > r && b >= g); assert(luminance(item.color) >= .25, 'All purchase blues must stay bright');
  if (i) assert(Math.abs(luminance(item.color)-luminance(d.segments[i-1].color)) > .12);
}
assert.equal(JSON.stringify(purchases), purchaseBefore);
console.log('PASS exact 10% purchase, neutral 64% remainder, sorted top five + remainder, distinct solid blue palette, original source indices and no mutation');

const tied = modelOf([tx('2026-09-28', 50000, 'in'), tx('2026-09-29', 5000, 'out', '같은 이름'), tx('2026-10-01', 5000, 'out', '같은 이름'), tx('2026-09-30', 3000, 'out', '  ')]).donut;
assert.deepEqual(array(tied.items.map(item => item.sourceIndex)), [2,1,3]);
assert.equal(tied.items[2].label, '이름 없는 구매'); assert.equal(tied.items.length, 3);
const exclusions = modelOf([...purchases, tx('2026-09-27', 3000), tx('2026-10-02', 4000), { ...tx('2026-10-01', 5000), ts:'2026-10-01T23:00:00' }, tx('2026-02-30', 20), tx('2026-10-01', -1), tx('2026-10-01', 1.5), tx('2026-10-01', Number.MAX_SAFE_INTEGER+1), { ...tx('2026-10-01', 50), type:'bad' }]);
assert.equal(exclusions.donut.spent, 18000); assert.equal(exclusions.donut.received, 50000);
assert.equal(exclusions.week.days[3].amount, 2400);
const custom = api.createPurchaseDonutModel({status:'loaded',state:{transactions:purchases}}, now, {start:'2026-09-29',end:'2026-09-30'});
assert.equal(custom.spent, 8600); assert.equal(custom.received, 0); assert.equal(custom.status, 'no-allowance'); assert.equal(custom.periodLabel, '기간 내 용돈');
const single = api.createPurchaseDonutModel({status:'loaded',state:{transactions:purchases}}, now, {start:'2026-09-28',end:'2026-09-28'});
assert.equal(single.received, 50000); assert.equal(single.spent, 7000);
for (const period of [{start:'2026-02-30',end:'2026-03-01'}, {start:'2026-10-02',end:'2026-10-01'}, {}, {start:'bad',end:'2026-10-01'}]) assert.equal(api.createPurchaseDonutModel({status:'loaded',state:{transactions:purchases}},now,period).status,'unavailable');
assert.equal(d.periodStart,'2026-09-28'); assert.equal(d.periodEnd,'2026-10-04');
assert.equal(newYear.donut.periodStart,'2026-12-28'); assert.equal(newYear.donut.periodEnd,'2027-01-03');
console.log('PASS memo fallback, duplicate purchases, newest-first ties, future and invalid exclusions, inclusive custom periods, month/year bounds');

const none = modelOf([]).donut; assert.equal(none.status,'no-allowance'); assert.equal(none.received,0); assert.equal(none.spent,0);
const noIncome = modelOf([tx('2026-10-01',5000)]).donut;
assert.equal(noIncome.status,'no-allowance'); assert.equal(noIncome.segments[0].fraction,null); assert.equal(noIncome.items[0].amount,5000);
const unspent = modelOf([tx('2026-10-01',50000,'in')]).donut;
assert.equal(unspent.status,'empty'); assert.equal(unspent.remaining,50000);
const excess = modelOf([tx('2026-10-01',1000,'in'),tx('2026-10-01',5000)]).donut;
assert.equal(excess.status,'overspent'); assert.equal(excess.overBudget,4000); assert.equal(excess.items[0].amount,5000);
for (const loaded of [{status:'empty',state:null},{status:'invalid',state:null},{status:'unavailable',state:null},{status:'loaded',state:{}}]) {
  const result=api.createHomeDashboardModel(loaded,now); assert.equal(result.donut.status,'unavailable'); assert.equal(result.donut.received,null); assert.equal(result.insights.positive.score,null);
}
for (const transactions of [[tx('2026-10-01',Number.MAX_SAFE_INTEGER,'in'),tx('2026-10-01',1,'in')], [tx('2026-10-01',Number.MAX_SAFE_INTEGER),tx('2026-10-01',1)]]) {
  const unsafe=modelOf(transactions); assert.equal(unsafe.donut.status,'unavailable'); assert(unsafe.donut.segments.every(item=>item.fraction===null)); assert.equal(unsafe.insights.positive.score,null);
  for(const id of ['spending','saving']) assert.equal(unsafe.statuses.find(item=>item.id===id).value,'확인 중');
  assert.equal(unsafe.statuses.find(item=>item.id==='goal').value,'60%');
}
console.log('PASS empty, unavailable, no income, overspending and unsafe aggregates preserve amounts without inventing shares/scores');

assert.equal(m.week.crownKey,'2026-10-01');
assert.equal(modelOf([tx('2026-09-28',100),tx('2026-09-30',100)]).week.crownKey,'2026-09-30');
assert.equal(modelOf([tx('2026-09-28',100),tx('2026-09-30',1000,'in')]).week.crownKey,'2026-09-30');
assert.equal(modelOf([]).week.crownKey,null);
assert.equal(modelOf([tx('2026-10-02',100),tx('2026-02-30',100)]).week.crownKey,null);
assert.equal(modelOf([tx('2026-09-28',Number.MAX_SAFE_INTEGER),tx('2026-09-28',1)]).week.crownKey,null);
assert.equal(projected.week.crownKey,'2026-09-29');
console.log('PASS crown chooses recorded minimum, most recent ties and income-only zero; excludes future/unknown/unrecorded days');

const score = api.createHabitScoreModel({...state,transactions:purchases},now);
assert.equal(m.insights.positive.score,score.score); assert.equal(m.insights.positive.body,score.coaching.strength||score.coaching.next);
assert.equal(m.habit.windowDays,28); assert.equal(m.insights.positive.title,'이런 점이 좋아요!');
assert.equal(m.challenge.completed,null); assert.equal(m.insights.status,'preparing');
assert.equal(m.insights.ranking.status,'unavailable');assert.equal(m.insights.ranking.entries.length,0);
assert.equal(m.balance,state.balance); assert.equal(m.statuses.find(item=>item.id==='goal').value,'60%');
const excludedUnsafe = modelOf([tx('2026-10-01',10000,'in'),tx('2026-10-01',2000),tx('2026-09-03',Number.MAX_SAFE_INTEGER,'in'),tx('2026-09-03',1,'in'),{...tx('2026-10-01',Number.MAX_SAFE_INTEGER,'in'),ts:'2026-10-01T23:00:00'}]);
assert.equal(excludedUnsafe.statuses.find(item=>item.id==='spending').value,'25/25점');
console.log('PASS Home uses the same recent-28-day habit score and strength; out-of-window overflow cannot poison it');
