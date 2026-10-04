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
  data.transactions = [5000, 3000, 2800, 1000, 2000, 2400, 1800].map((amount, index) => ({
    type: 'out', amount, category: '문구', memo: ['문구 세트','크레파스','동화책','버스 카드 충전','색종이','필통','스티커'][index],
    ts: new Date(Date.UTC(2026, 8, 28 + index, 2)).toISOString(), receipt: false,
  }));
  data.transactions.push({ type:'in', amount:50000, category:'용돈', memo:'이번 주 용돈', ts:'2026-09-28T09:00:00+09:00' });
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
        week: { ...model.week, message: '이번 주도\n알차게 보냈어요!' },
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
