/* Public visual demo. Never reads from or writes to business storage. */
window.PWDemo = (() => {
  const query = new URLSearchParams(location.search);
  let enabled = query.get('demo') !== '0' && query.get('live') !== '1' && !PWPreview.enabled;
  const now = new Date();
  now.setDate(now.getDate() - now.getDay());
  now.setHours(23, 59, 59, 999);
  const purchases = [
    ['문구 세트', 5000, '문구'], ['크레파스', 3000, '문구'], ['동화책', 2800, '기타'],
    ['버스 카드 충전', 1000, '교통'], ['색종이', 2000, '문구'], ['필통', 2400, '문구'], ['스티커', 1800, '문구'],
  ];
  const transactions = purchases.map(([memo, amount, category], index) => {
    const date = new Date(now); date.setDate(date.getDate() - 6 + index); date.setHours(12, 0, 0, 0);
    return { type: 'out', amount, category, ts: date.toISOString(), memo };
  });
  const income = new Date(now); income.setDate(income.getDate() - 6); income.setHours(9, 0, 0, 0);
  transactions.push({ type: 'in', amount: 50000, category: '용돈', ts: income.toISOString(), memo: '이번 주 용돈 · 예시' });
  const state = { user: { name: '우리' }, balance: 32000, monthly: { saving: 50000, spending: 18000 },
    goal: { title: '갖고 싶은 자전거', current: 45000, target: 100000 }, transactions };
  const clone = value => JSON.parse(JSON.stringify(value));
  return Object.freeze({
    get enabled() { return enabled; }, get now() { return new Date(now); },
    load() { return { status: 'loaded', state: clone(state), source: 'demo' }; },
    toggle() {
      enabled = !enabled;
      const url = new URL(location.href); url.searchParams.delete('live'); url.searchParams.set('demo', enabled ? '1' : '0');
      history.replaceState(history.state, '', url); PWNavigation.go('home');
    },
    dashboard(model) {
      return { ...model, statusPill: '오늘도 잘 관리하고 있어요! 💙',
        statuses: model.statuses.map((item, i) => ({ ...item, value: ['우수', '좋아요', '45%'][i], detail: '가상 데이터로 보여주는 예시 상태' })),
        challenge: { status: 'available', target: 3, completed: 1, note: '가상 저축 기록 · 이번 주 1회' },
        week: { ...model.week, message: '이번 주도\n알차게 보냈어요!' },
        insights: { ...model.insights, status: 'demo', ranking: { status: 'demo', entries: [
          { rank: 1, name: '저축대장', avatar: '🐥' },
          { rank: 2, name: '알뜰곰', avatar: '🐻‍❄️' },
          { rank: 3, name: '차곡펭귄', avatar: '🐧' },
        ] } } };
    }
  });
})();
