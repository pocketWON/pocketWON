/* Habit score rules: pure Node.js checks against the live scripts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.resolve(__dirname, '../ks6s3juocjzc2.kimi.page');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const api = vm.runInNewContext(`${read('scripts/state.js')}\n${read('scripts/habit.js')}\n({ createHabitScoreModel })`);
const copy = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const pass = name => { checks++; console.log(`PASS ${name}`); };

const now = new Date(2026, 9, 3, 15, 0, 0);
const ts = (daysAgo, hour = 12) => {
  const d = new Date(2026, 9, 3 - daysAgo, hour, 0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00:00`;
};
const tx = (type, amount, daysAgo, hour) => ({ type, amount, category: type === 'in' ? '용돈' : '간식', ts: ts(daysAgo, hour), receipt: false });
const state = (transactions, goal) => ({ balance: 0, monthly: { saving: 0, spending: 0 }, transactions, ...(goal === undefined ? {} : { goal }) });
const model = (s, at = now) => copy(api.createHabitScoreModel(s, at));
const points = m => Object.fromEntries(m.items.map(item => [item.id, item.points]));

// Status: no array, nothing recent, only future/invalid rows.
for (const s of [null, {}, { transactions: 'x' }, []]) assert.equal(model(s).status, 'unavailable');
assert.equal(model(state([])).status, 'insufficient');
assert.equal(model(state([tx('in', 1000, 28)])).status, 'insufficient');
assert.equal(model(state([{ ...tx('in', 1000, 0), ts: '2026-10-03T23:59:00' }])).status, 'insufficient');
const onlyBad = model(state([null, { ...tx('in', 1000, 0), ts: '2026-02-30T10:00:00' }]));
assert.equal(onlyBad.status, 'insufficient');
assert.equal(onlyBad.partial, true);
pass('Unavailable / insufficient statuses; 28-day boundary; future and invalid rows ignored');

// Full marks: 12+ days, spent ≤ 50%, completed goal, every week net ≥ 0.
const full = [];
for (let day = 0; day < 28; day += 2) full.push(tx('in', 1000, day), tx('out', 400, day, 13));
const best = model(state(full, { title: '자전거', target: 10000, current: 10000 }));
assert.equal(best.status, 'available');
assert.deepEqual(points(best), { record: 30, spending: 25, goal: 25, saving: 20 });
assert.equal(best.score, 100);
assert.equal(best.coaching.next, '지금처럼 계속 기록해요!');
assert.equal(best.coaching.strength, '기록을 자주 남기고 있어요.');
pass('All-full window scores 100 with the "keep going" message');

// Partial values: 3 days, spending 75%, goal 40%, one positive week.
const mid = model(state([
  tx('in', 4000, 1), tx('out', 1000, 2), tx('out', 2000, 9),
], { title: '책', target: 10000, current: 4000 }));
assert.deepEqual(points(mid), { record: 8, spending: 13, goal: 16, saving: 5 });
assert.equal(mid.score, 42);
assert.equal(mid.items.find(i => i.id === 'spending').detail, '받은 돈의 75% 사용');
assert.equal(mid.items.find(i => i.id === 'record').detail, '기록한 날 3일');
assert.equal(mid.items.find(i => i.id === 'saving').detail, '4주 중 1주');
assert.equal(mid.coaching.next, '받은 돈보다 적게 쓰는 주를 늘려볼까요?');
assert.equal(mid.coaching.strength, '목표를 정하고 꾸준히 가고 있어요.');
pass('Linear spending scale, goal progress and weekly saving are rounded per item; total = item sum');

// Edges: spending without income, 100% spending, no goal, invalid goal.
assert.equal(points(model(state([tx('out', 500, 0)]))).spending, 0);
assert.equal(model(state([tx('out', 500, 0)])).items.find(i => i.id === 'spending').detail, '받은 돈 기록 없음');
assert.equal(points(model(state([tx('in', 500, 0), tx('out', 500, 0)]))).spending, 0);
const noGoal = model(state([tx('in', 500, 0)]));
assert.equal(points(noGoal).goal, 0);
assert.equal(noGoal.coaching.next, '갖고 싶은 것을 목표로 정해볼까요?');
const badGoal = model(state([tx('in', 500, 0)], { title: '', target: 0, current: 0 }));
assert.equal(points(badGoal).goal, null);
assert.equal(badGoal.score, null);
assert.equal(badGoal.change, null);
pass('No income, 100% spending, missing goal and invalid goal (total stays unknown)');

// Change against the previous 28 days (days 28–55).
const trend = model(state([tx('in', 1000, 0), tx('in', 1000, 30), tx('out', 900, 31)]));
assert.equal(trend.score, 3 + 25 + 0 + 5);
assert.equal(trend.previous, 5 + 5 + 0 + 5);
assert.equal(trend.change, 18);
assert.equal(model(state([tx('in', 1000, 0)])).change, null);
pass('Score change compares with the previous 28-day window, null when there is nothing to compare');

// Read-only and independent from the legacy stored habitScore.
const source = { ...state([tx('in', 1000, 0)]), habitScore: 99 };
const raw = JSON.stringify(source);
assert.equal(model(source).score, model({ ...source, habitScore: 1 }).score);
assert.equal(JSON.stringify(source), raw);
assert(!/localStorage|setItem|Math\.random|fetch\s*\(/.test(read('scripts/habit.js')));
pass('Input is never mutated, stored habitScore is ignored, no storage/network/randomness');

console.log(`\n${checks} habit score checks passed`);
