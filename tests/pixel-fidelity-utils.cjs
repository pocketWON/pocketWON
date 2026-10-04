/* Golden-master fixture injection for isolated test pages only. Never loaded by the app. */
const { fixture, ready } = require('./product-test-utils.cjs');
const REFERENCE_TIME = '2026-10-04T12:00:00+09:00';
const REFERENCE_BOXES = {
  hero: { x: 9.41, y: 58.03, width: 372.75, height: 236.82 },
  status: { x: 14.12, y: 224.28, width: 361.77, height: 62.21 },
  saving: { x: 9.93, y: 304.79, width: 183.50, height: 172.52 },
  habit: { x: 198.66, y: 304.79, width: 183.50, height: 172.52 },
  weekly: { x: 9.93, y: 484.10, width: 372.23, height: 118.67 },
  insights: { x: 9.93, y: 612.18, width: 372.23, height: 129.13 },
  nav: { x: 0, y: 749.68, width: 390, height: 74.76 },
};
function referenceData() {
  const data = JSON.parse(JSON.stringify(fixture));
  data.balance = 32000;
  data.monthly = { ...data.monthly, saving: 50000, spending: 18000 };
  data.habitScore = 82;
  data.goal = { title: '새 자전거', current: 180000, target: 300000 };
  data.transactions = [6000, 12000, 8000, 5000, 7000, 9000, 6000].map((amount, index) => ({
    type: 'out', amount, category: ['간식', '쇼핑', '교통', '문화', '생활', '기타', '간식'][index],
    memo: '분리된 시각 검증 데이터', ts: new Date(Date.UTC(2026, 8, 28 + index, 3)).toISOString(), receipt: false,
  }));
  return data;
}
async function freezeDate(page) {
  // setFixedTime freezes Date while letting animation frames, layout and UI timers run.
  await page.clock.setFixedTime(new Date(REFERENCE_TIME));
}
async function applyReferenceFixture(page) {
  await freezeDate(page);
  await page.evaluate(() => {
    window.__pwReferenceOriginalModel ||= createHomeDashboardModel;
    window.createHomeDashboardModel = function (...args) {
      const model = window.__pwReferenceOriginalModel(...args);
      const shares = [34, 24, 12, 11, 10, 9];
      return {
        ...model,
        balance: 32000,
        statusPill: '오늘도 잘 관리하고 있어요!💙',
        statuses: [
          { id: 'spending', label: '지출 관리', value: '우수', detail: '지출 관리 우수' },
          { id: 'saving', label: '저축 습관', value: '좋아요', detail: '저축 습관 좋아요' },
          { id: 'goal', label: '목표 달성', value: '순항 중', detail: '목표 달성 순항 중' },
        ],
        challenge: { completed: 1, target: 3, note: '' },
        donut: {
          ...model.donut, status: 'available', total: 18000, period: '이번 달',
          categories: model.donut.categories.map((category, index) => ({ ...category, amount: 180 * shares[index], percent: shares[index] })),
        },
        week: {
          ...model.week, status: 'available', omitted: 0,
          days: model.week.days.map((day, index) => ({ ...day, amount: [6000, 12000, 8000, 5000, 7000, 9000, 6000][index], future: false })),
          highlightKey: model.week.days[5].key,
          message: '이번 주도\n알차게 보냈어요!',
        },
        insights: {
          status: 'available',
          positive: { title: '이번 점이 좋아요!', body: '이번 달은 불필요한 지출이\n지난 달보다 28% 줄었어요.\n정말 잘하고 있어요!' },
          advice: { title: '이렇게 해보세요!', body: '주말에 지출이 늘어나는\n경향이 있어요. 주말 예산을\n미리 정해보는 건 어떨까요?' },
        },
      };
    };
    PWNavigation.go('home');
  });
  await ready(page);
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => {
      // Offscreen lazy posters have geometry but decode never starts until they load.
      // Force loading only in the isolated capture page, not in production.
      image.loading = 'eager';
      return image.decode().catch(() => {});
    }));
  });
}
async function restoreLiveModel(page) {
  await page.evaluate(() => {
    if (window.__pwReferenceOriginalModel) {
      window.createHomeDashboardModel = window.__pwReferenceOriginalModel;
      delete window.__pwReferenceOriginalModel;
    }
    PWNavigation.go('home');
  });
  await ready(page);
}
module.exports = { REFERENCE_TIME, REFERENCE_BOXES, referenceData, freezeDate, applyReferenceFixture, restoreLiveModel };
