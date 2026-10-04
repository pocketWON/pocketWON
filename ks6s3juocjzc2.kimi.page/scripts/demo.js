/* Public visual demo. Never reads from or writes to business storage. */
window.PWDemo = (() => {
  const query = new URLSearchParams(location.search);
  let enabled = query.get('demo') !== '0' && query.get('live') !== '1' && !PWPreview.enabled;
  const now = new Date();
  now.setDate(now.getDate() - now.getDay());
  now.setHours(23, 59, 59, 999);
  const categories = ['간식', '문구', '교통', '게임', '생활비', '기타'];
  const shares = [34, 24, 12, 11, 10, 9];
  const transactions = [];
  [6000, 12000, 8000, 5000, 7000, 9000, 6000].forEach((amount, index) => {
    const date = new Date(now); date.setDate(date.getDate() - 6 + index); date.setHours(12, 0, 0, 0);
    categories.forEach((category, i) => transactions.push({ type: 'out', amount: amount * shares[i] / 100, category, ts: date.toISOString(), memo: ['맛있는 간식', '새 노트', '버스 타기', '즐거운 놀이', '생활용품', '작은 선물'][i] }));
  });
  const income = new Date(now); income.setDate(income.getDate() - 6); income.setHours(9, 0, 0, 0);
  transactions.push({ type: 'in', amount: 85000, category: '용돈', ts: income.toISOString(), memo: '이번 달 용돈 · 예시' });
  const state = { user: { name: '우리' }, balance: 32000, monthly: { saving: 85000, spending: 53000 }, habitScore: 86,
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
        insights: { status: 'demo', positive: { title: '이번 점이 좋아요!', body: '작은 소비까지 꼼꼼하게\n기록했어요. 나의 돈 습관이\n조금씩 자라고 있어요!' },
          advice: { title: '이렇게 해보세요!', body: '주말에 쓸 용돈을 미리 정해볼까요? 목표를 향해 조금씩 모아보세요.' } } };
    }
  });
})();
