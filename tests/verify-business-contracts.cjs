/* Single-screen rebuild: original pure financial assertions against live code.
 * Historical browser suites stay untouched. This suite needs only Node.js.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'ks6s3juocjzc2.kimi.page');
const baseline = path.join(root, 'evidence/SINGLE-SCREEN/baseline');
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const snapshot = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
assert.equal(hash(snapshot), '24405c1c583da11d362f82b067add7fb7c62e152cba55f44d331f161b62314ba', 'Original synthetic fixture snapshot');
const literal = snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1];
const fixture = copy(vm.runInNewContext(`(${literal})`));
const stateSource = fs.readFileSync(path.join(app, 'scripts/state.js'), 'utf8');
const reportSource = fs.readFileSync(path.join(app, 'scripts/report.js'), 'utf8');
const api = vm.runInNewContext(`${stateSource}\n${reportSource}\n({ loadPocketWONState, createHomeViewModel, createRecordViewModel, validateRecordDraft, applyTransaction, persistPocketWONState, parsePocketWONDate, validPocketWONTransaction, writablePocketWONState, createGoalViewModel, validateGoalDraft, applyGoalUpdate, createReportViewModel })`);
let checks = 0;
const pass = (name, detail = true) => { checks++; console.log(`PASS ${name}${detail === true ? '' : ` (${typeof detail === 'object' ? JSON.stringify(detail) : detail})`}`); };
const draft = (type = 'out', amount = '3500', category = '간식', memo = '') => ({ type, amount, category, memo });
const goalDraft = (title = '새 자전거', target = '120000') => ({ title, target });
const stamp = '2026-09-11T04:05:06.000Z';
const max = Number.MAX_SAFE_INTEGER;
const goalFixture = { ...copy(fixture), goal: { title: '새 자전거', current: 42000, target: 100000, daysLeft: 12 }, monthly: { ...fixture.monthly, goal: 100000 } };

// The JS engine parses complete function bodies, including balanced regex/template
// braces. Function.toString excludes adjacent helpers/comments in the baseline.
// Financial definitions are audited independently from the approved record projection.
const normalize = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '').replace(/\s+/g, ' ').trim();
const business = JSON.parse(fs.readFileSync(path.join(baseline, 'business-functions.json'), 'utf8'));
for (const [name, source] of Object.entries(business)) {
  if (name === 'createRecordViewModel') continue;
  assert.equal(typeof api[name], 'function', `Financial function ${name} exists`);
  const previous = vm.runInNewContext(`${source}\n${name}.toString()`);
  assert.equal(normalize(Function.prototype.toString.call(api[name])), normalize(previous), `Unchanged financial body: ${name}`);
}
pass('Financial function bodies match the rebuild baseline', { functions: Object.keys(business).filter(name => name !== 'createRecordViewModel').length });
const helperStart = 'const PW_RECORD_CATEGORIES';
const expectedGuards = business.loadPocketWONState.slice(business.loadPocketWONState.indexOf(helperStart));
const actualGuards = stateSource.slice(stateSource.indexOf(helperStart), stateSource.indexOf('function validPocketWONTransaction'));
assert.equal(normalize(actualGuards), normalize(expectedGuards), 'Category allowlists and primitive money/object guards are unchanged');
pass('Category allowlists and primitive financial guards match the rebuild baseline');

function preservedFunction(file, name, startAt) {
  const source = fs.readFileSync(path.join(baseline, 'tests', file), 'utf8');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = source.match(new RegExp(`^function ${escaped}\\([^\\n]*\\) \\{[\\s\\S]*?^\\}`, 'm'))?.[0];
  assert(declaration, `${file}: original pure function ${name}`);
  const marker = declaration.indexOf(startAt);
  assert(marker > declaration.indexOf('{'), `${file}: obsolete file-hash audit boundary`);
  return `${declaration.slice(0, declaration.indexOf('{') + 1)}\n  ${declaration.slice(marker)}\n${name}();`;
}
function runOriginal(file, name, startAt, model, source = reportSource) {
  const params = { assert, fs, path, vm, crypto, root, app, api, copy, fixture, draft, goalDraft, goalFixture, stamp, hash, snapshot, max, model, source, pass };
  // Only the obsolete historic active-file hash audit is excluded. Every original
  // financial assertion and source read/write guard after the marker is reused.
  Function(...Object.keys(params), preservedFunction(file, name, startAt))(...Object.values(params));
}
runOriginal('verify-home.cjs', 'adapterTests', 'const before = JSON.stringify(fixture);', value => copy(api.createHomeViewModel(value)));
runOriginal('verify-record.cjs', 'unitTests', 'function freeze(value)', value => copy(api.createHomeViewModel(value)));
runOriginal('verify-goal.cjs', 'unitTests', 'function freeze(x)', value => copy(api.createGoalViewModel(value)));
runOriginal('verify-report.cjs', 'unitTests', 'assert(!/localStorage', value => copy(api.createReportViewModel(value)));

// Report's saved-value projection also remains exact, without auditing its new UI.
const originalReportTests = fs.readFileSync(path.join(baseline, 'tests/verify-report.cjs'), 'utf8');
assert(originalReportTests.includes('PW-WOORI-05'), 'Preserved report assertion provenance');
assert.equal(copy(api.createReportViewModel({ habitScore: 0.0000001 })).score.value, 0.0000001);
assert.equal(copy(api.createReportViewModel({ monthly: { saving: 0, spending: max } })).moneyFlow.difference, -max);
pass('Report fractional precision and signed money differences remain exact');

// Approved display-only change: every stored position can now be paginated.
const transactions = Array.from({ length: 47 }, (_, i) => ({
  type: i % 2 ? 'in' : 'out', amount: i + 1, category: i % 2 ? '용돈' : '기타',
  memo: i === 46 ? '긴 기존 메모 '.repeat(100) : `기록 ${i}`, ts: new Date(Date.UTC(2026, 9, 3, 12, 0, i)).toISOString(), receipt: false,
}));
const manyState = { balance: 500, monthly: { saving: 1000, spending: 500 }, transactions };
const rawMany = JSON.stringify(manyState);
const rows = copy(api.createRecordViewModel(manyState, new Date('2026-10-03T12:59:00Z')));
assert.equal(rows.rows.length, 47);
assert.equal(rows.grouped, true);
assert.equal(rows.history, 'ready');
assert.deepEqual(rows.rows.map(row => row.sourceIndex), Array.from({ length: 47 }, (_, i) => 46 - i));
for (const row of rows.rows) {
  assert.equal(row.amount, transactions[row.sourceIndex].amount);
  assert.equal(row.memo, transactions[row.sourceIndex].memo);
  assert.equal(row.timestamp, transactions[row.sourceIndex].ts);
  assert.equal(row.dateValid, true);
}
assert.equal(rows.rows[0].title, transactions[46].memo);
assert.equal(JSON.stringify(manyState), rawMany);
assert.equal(copy(api.createReportViewModel(manyState)).records.count, 47);
const sameDate = api.createRecordViewModel({ ...manyState, transactions: [transactions[2], { ...transactions[2], amount: 999 }] });
assert.deepEqual(copy(sameDate.rows.map(row => row.sourceIndex)), [0, 1]);
pass('Unbounded record projection, stable exact-date sorting, original indices, full memo/timestamp and immutable source');

const badDate = { ...transactions[20], ts: '2026-02-30T12:00:00' };
const invalidRows = copy(api.createRecordViewModel({ ...manyState, transactions: [transactions[1], badDate, null, transactions[0]] }));
assert.equal(invalidRows.grouped, false);
assert.equal(invalidRows.history, 'partial');
assert.deepEqual(invalidRows.rows.map(row => row.sourceIndex), [0, 1, 2, 3]);
assert.equal(invalidRows.rows[1].dateLabel, '날짜 확인 안 됨');
assert.equal(invalidRows.rows[1].dateValid, false);
assert.equal(invalidRows.rows[1].timestamp, badDate.ts);
assert.equal(invalidRows.rows[2].amount, null);
assert.equal(invalidRows.rows[2].valid, false);
assert.equal(invalidRows.rows[2].title, '확인할 수 없는 기록');
assert.equal(copy(api.createRecordViewModel({})).history, 'unavailable');
assert.equal(copy(api.createRecordViewModel({ transactions: [] })).history, 'empty');
const today = new Date(2026, 9, 3, 12);
const groupedDays = copy(api.createRecordViewModel({ transactions: [
  { ...transactions[0], ts: '2026-10-03T10:00:00' },
  { ...transactions[0], ts: '2026-10-02T10:00:00' },
  { ...transactions[0], ts: '2025-10-01T10:00:00' },
]}, today));
assert.deepEqual(groupedDays.rows.map(row => row.dateLabel), ['오늘', '어제', '2025년 10월 1일']);
pass('Invalid dates and partial rows preserve stored order, absence stays unknown, day labels are exact');

// Revalidation uses the latest balance/aggregates/current, preserving concurrent
// data updates. Title/target conflict detection is UI orchestration, tested in UI.
const freshSpent = { ...copy(fixture), balance: 100 };
assert.equal(api.validateRecordDraft(draft('out', '101'), freshSpent).valid, false);
const freshGoal = { ...copy(goalFixture), goal: { ...goalFixture.goal, current: 110000, extra: 'latest' }, external: 'latest field' };
assert.equal(api.validateGoalDraft(goalDraft('새 목표', '100000'), freshGoal).valid, false);
const freshSaved = copy(api.applyGoalUpdate(freshGoal, goalDraft('새 목표', '110000')));
assert.equal(freshSaved.goal.current, 110000);
assert.equal(freshSaved.goal.extra, 'latest');
assert.equal(freshSaved.external, 'latest field');
assert.equal(freshSaved.monthly.goal, 110000);
assert.equal(api.createGoalViewModel(freshSaved).status, 'complete');
assert.equal(api.validateGoalDraft(goalDraft(), { ...copy(goalFixture), monthly: { ...goalFixture.monthly, goal: 'invalid' } }).valid, false);
for (const raw of ['', '{', 'null', '[]', 'true', '12', '"text"']) {
  const loaded = api.loadPocketWONState(() => ({ getItem: () => raw }));
  assert.equal(loaded.status, 'invalid'); assert.equal(loaded.state, null);
}
const empty = api.loadPocketWONState(() => ({ getItem: () => null }));
assert.equal(empty.status, 'empty'); assert.equal(empty.state, null);
const failed = api.loadPocketWONState(() => { throw Error('denied'); });
assert.equal(failed.status, 'unavailable'); assert.equal(failed.state, null);
assert.equal(api.loadPocketWONState(() => ({ getItem: () => '{}' })).status, 'loaded');
pass('Latest-state revalidation, newest current/unknown fields, conditional monthly goal, and empty/failed-read distinction');
console.log(`PASS ${checks} business contract groups; original Home/Record/Goal/Report pure assertions reused.`);
