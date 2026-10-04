/* Mini game rules. Pure functions: no DOM, no storage, no finance/score/point changes. */

// One offer: price (won) with optional percent discount, shipping fee and item count.
function pwPriceOffer(offer) {
  if (!pwObject(offer)) return null;
  const { price, discount = 0, shipping = 0, count = 1 } = offer;
  if (!pwMoney(price) || !pwMoney(shipping) || !Number.isSafeInteger(discount) || discount < 0 || discount > 100
    || !Number.isSafeInteger(count) || count < 1) return null;
  const total = Math.round(price * (100 - discount) / 100) + shipping;
  return { total, count, unit: total / count };
}

// Compares per item when either side is a bundle, otherwise the final price.
function pwPriceCompare(a, b) {
  const left = pwPriceOffer(a), right = pwPriceOffer(b);
  if (!left || !right) return null;
  const basis = left.count > 1 || right.count > 1 ? 'unit' : 'total';
  const diff = basis === 'unit' ? left.unit - right.unit : left.total - right.total;
  return { a: left, b: right, basis, cheaper: Math.abs(diff) < 1e-9 ? 'same' : diff < 0 ? 'a' : 'b' };
}

const PW_PRICE_QUESTIONS = Object.freeze([
  { id: 'discount', topic: '할인', a: { label: '10,000원 + 20% 할인', price: 10000, discount: 20 }, b: { label: '8,500원', price: 8500 } },
  { id: 'bundle', topic: '묶음', a: { label: '6개 5,900원', price: 5900, count: 6 }, b: { label: '10개 8,900원', price: 8900, count: 10 } },
  { id: 'shipping', topic: '배송비', a: { label: '12,000원 + 배송비 3,000원', price: 12000, shipping: 3000 }, b: { label: '14,000원 무료배송', price: 14000 } },
  { id: 'one-plus-one', topic: '1+1', a: { label: '1+1 과자 3,000원', price: 3000, count: 2 }, b: { label: '과자 1개 1,800원', price: 1800 } },
].map(q => Object.freeze({ ...q, a: Object.freeze(q.a), b: Object.freeze(q.b) })));

const PW_GOAL_STEPS = Object.freeze([1000, 3000, 5000]);

// How many weekly deposits of `perWeek` reach the goal. Never saves or moves money.
function pwWeeksToGoal(goalVm, perWeek) {
  if (!goalVm || goalVm.status !== 'active') return { status: goalVm?.status || 'invalid' };
  if (!pwMoney(perWeek) || perWeek === 0) return { status: 'invalid' };
  return { status: 'active', remaining: goalVm.remaining, perWeek, weeks: Math.ceil(goalVm.remaining / perWeek) };
}
