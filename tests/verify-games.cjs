/* Mini game rules: pure Node.js checks against the live scripts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.resolve(__dirname, '../ks6s3juocjzc2.kimi.page');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const api = vm.runInNewContext(`${read('scripts/state.js')}\n${read('scripts/games.js')}\n({ pwPriceOffer, pwPriceCompare, pwWeeksToGoal, createGoalViewModel, PW_PRICE_QUESTIONS, PW_GOAL_STEPS })`);
const copy = value => JSON.parse(JSON.stringify(value));
let checks = 0;
const pass = name => { checks++; console.log(`PASS ${name}`); };

// Offer math: discount, shipping, bundle unit price.
assert.deepEqual(copy(api.pwPriceOffer({ price: 10000, discount: 20 })), { total: 8000, count: 1, unit: 8000 });
assert.deepEqual(copy(api.pwPriceOffer({ price: 12000, shipping: 3000 })), { total: 15000, count: 1, unit: 15000 });
assert.equal(api.pwPriceOffer({ price: 5900, count: 6 }).unit, 5900 / 6);
for (const bad of [null, {}, { price: -1 }, { price: 1.5 }, { price: 100, discount: 101 }, { price: 100, count: 0 }, { price: 100, shipping: NaN }, { price: '100' }]) {
  assert.equal(api.pwPriceOffer(bad), null);
}
assert.equal(api.pwPriceCompare({ price: 100 }, null), null);
assert.equal(api.pwPriceCompare({ price: 100 }, { price: 100 }).cheaper, 'same');
pass('Price offer math and invalid input rejection');

// Fixed questions: answers come from the rule, and match the padlet examples.
const answers = Object.fromEntries(api.PW_PRICE_QUESTIONS.map(q => [q.id, api.pwPriceCompare(q.a, q.b)]));
assert.equal(answers.discount.cheaper, 'a');
assert.equal(answers.discount.basis, 'total');
assert.equal(answers.bundle.cheaper, 'b');
assert.equal(answers.bundle.basis, 'unit');
assert.equal(answers.shipping.cheaper, 'b');
assert.equal(answers['one-plus-one'].cheaper, 'a');
assert(Object.values(answers).every(r => r && r.cheaper !== 'same'));
assert(Object.isFrozen(api.PW_PRICE_QUESTIONS) && api.PW_PRICE_QUESTIONS.every(q => Object.isFrozen(q) && Object.isFrozen(q.a) && Object.isFrozen(q.b)));
pass('Price questions have one cheaper side each and are frozen');

// Goal weeks: only active goals, ceil of remaining / step, never mutates state.
const state = { balance: 32500, monthly: { saving: 15200, spending: 12300 }, transactions: [], goal: { title: '헤드폰', target: 45000, current: 27000 } };
const before = JSON.stringify(state);
const goal = api.createGoalViewModel(state);
assert.deepEqual(copy(api.PW_GOAL_STEPS.map(step => api.pwWeeksToGoal(goal, step).weeks)), [18, 6, 4]);
assert.deepEqual(copy(api.pwWeeksToGoal(goal, 5000)), { status: 'active', remaining: 18000, perWeek: 5000, weeks: 4 });
assert.equal(api.pwWeeksToGoal(api.createGoalViewModel({ goal: { title: 'x', target: 10, current: 3 } }), 3).weeks, 3);
assert.equal(JSON.stringify(state), before);
pass('Weeks to goal for 1,000 / 3,000 / 5,000 won steps');

assert.equal(api.pwWeeksToGoal(api.createGoalViewModel(null), 1000).status, 'empty');
assert.equal(api.pwWeeksToGoal(api.createGoalViewModel({ goal: { title: 'x', target: 10, current: 10 } }), 1000).status, 'complete');
assert.equal(api.pwWeeksToGoal(api.createGoalViewModel({ goal: { title: 'x', target: 0, current: 0 } }), 1000).status, 'invalid');
assert.equal(api.pwWeeksToGoal(null, 1000).status, 'invalid');
for (const step of [0, -1000, 1.5, NaN]) assert.equal(api.pwWeeksToGoal(goal, step).status, 'invalid');
pass('Empty / complete / invalid goals and invalid steps produce no number');

console.log(`${checks} checks passed`);
