/* Read-only habit projections. Fixture results never become financial state. */
(() => {
  const U = PWFeatureUI;
  const number = new Intl.NumberFormat('ko-KR');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const categories = ['첫 기록', '기록', '계획', '목표', '꾸준함', '금융 학습'];
  const dateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const localDate = (year, month, day) => {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(12, 0, 0, 0);
    return date;
  };
  const dateLabel = date => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;
  const art = profile => typeof pwIllustrationPanel === 'function'
    ? pwIllustrationPanel(profile, { panelClass: 'pw-habits-visual pw-compact-visual', ambient: false }) : null;
  const staticArt = profile => typeof pwIllustration === 'function' ? pwIllustration(profile, { className: 'pw-habits-sheet-art' }) : null;
  const refresh = page => { if (!page.disposed) PWUI.refreshMotion?.(page.element); };

  function readLabel(loaded, projection) {
    if (loaded?.status === 'empty') return '저장된 기록이 없어요';
    if (loaded?.status === 'invalid') return '저장된 정보를 확인할 수 없어요';
    if (loaded?.status === 'unavailable') return '이 기기의 기록을 읽을 수 없어요';
    if (projection.status === 'unavailable') return '거래 목록을 확인할 수 없어요';
    return projection.status === 'active' ? '유효한 날짜의 실제 기록 · 읽기 전용' : '유효한 날짜의 실제 기록이 없어요';
  }

  function sheets(page) {
    let current = null;
    page.onDispose(() => { current?.dispose(); current = null; });
    return (title, render, opener) => {
      if (page.disposed) return null;
      current?.dispose();
      current = U.sheet(title, flow => {
        flow.dialog.classList.add('pw-habits-sheet-scope');
        flow.dialog.dataset.feature = page.element.dataset.feature;
        render(flow);
      }, opener);
      return current;
    };
  }

  function safeTotal(rows, type) {
    let total = 0;
    for (const row of rows) {
      if (row.type !== type) continue;
      if (!Number.isSafeInteger(total + row.amount)) return null;
      total += row.amount;
    }
    return total;
  }

  PWFeatureViews.calendar = (loaded, navigate, options = {}) => {
    const page = U.page('calendar', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope', 'pw-calendar-view');
    const projection = PWFeatureModels.calendar(loaded);
    const now = new Date();
    const today = dateKey(now);
    let year = projection.year, month = projection.month;
    let observer = null, classObserver = null;
    const openSheet = sheets(page);
    const status = U.card('실제 기록 읽기 상태',
      U.row('읽기 결과', readLabel(loaded, projection)),
      U.row('날짜 표시', projection.timezone),
      U.el('p', 'pw-muted', '유효한 거래와 유효한 시각이 함께 있는 기록만 표시해요. 날짜를 추정하거나 원래 기록을 고치지 않아요.'));
    if (projection.omitted > 0) status.append(U.el('p', 'pw-muted', `날짜 또는 거래 정보를 확인할 수 없는 ${number.format(projection.omitted)}개 기록은 날짜표에서 제외했어요.`));
    page.body.append(status);
    // Fixture UI status is separate from the actual local read result above.
    if (PWPreview.enabled && !U.ready(page.vm)) U.appendStatus(page, '위의 실제 읽기 상태와 별개인 화면 미리보기 상태예요. 아래 날짜표는 실제 기록만 읽기 전용으로 표시해요.');

    const toolbar = U.el('div', 'pw-calendar-toolbar');
    const caption = U.el('h3', 'pw-calendar-month');
    caption.setAttribute('aria-live', 'polite');
    const previous = U.action('이전 달', () => changeMonth(-1), true);
    const next = U.action('다음 달', () => changeMonth(1), true);
    toolbar.append(previous, caption, next);
    const layout = U.el('div', 'pw-calendar-layout');
    layout.dataset.listFallback = 'true';
    const explanation = U.el('p', 'pw-muted pw-calendar-explanation', '날짜를 누르면 그날의 실제 기록을 볼 수 있어요. ‘기록’ 표시는 금액이나 목표 달성이 아닌 날짜별 거래 존재를 뜻해요.');
    const calendar = U.card('', toolbar, explanation, layout);
    calendar.classList.add('pw-calendar-card');
    const monthStatus = U.el('p', 'pw-muted pw-calendar-explanation');
    monthStatus.setAttribute('role', 'status');
    calendar.append(monthStatus);
    page.body.append(calendar);
    const goalNotice = U.el('p', 'pw-muted', '목표 활동의 날짜 표시와 동작은 준비 중이에요. 거래에서 목표 활동을 추정하지 않아요.');
    goalNotice.id = 'pw-calendar-goal-notice';
    const goalAction = U.action('목표 활동 · 준비 중', null, true);
    goalAction.disabled = true;
    goalAction.setAttribute('aria-describedby', goalNotice.id);
    page.body.append(U.card('목표 활동', goalNotice, goalAction));

    function changeMonth(delta) {
      const target = localDate(year, month + delta, 1);
      if (!Number.isFinite(target.getTime()) || target.getFullYear() < 0 || target.getFullYear() > 9999) return;
      year = target.getFullYear(); month = target.getMonth();
      renderMonth();
    }

    function openDay(date, opener) {
      const rows = projection.days.get(dateKey(date)) || [];
      openSheet(dateLabel(date) + ' 실제 기록', flow => {
        flow.dialog.addEventListener('close', () => {
          if (page.disposed) return;
          const fallback = layout.dataset.listFallback === 'true' || document.documentElement.classList.contains('pw-accessible');
          const target = [...layout.querySelectorAll(fallback ? '.pw-calendar-list-day' : '.pw-calendar-day')].find(control => control.dataset.dateKey === dateKey(date));
          target?.focus({ preventScroll: false });
        }, { once: true });
        const image = staticArt('record');
        if (image) flow.body.append(image);
        flow.body.append(U.notice('이 기기에서 읽은 그날의 실제 기록이에요. 브라우저 로컬 날짜 기준이며 삭제·수정·목표 반영은 하지 않아요.'));
        if (!rows.length) {
          flow.body.append(U.card('이 날짜의 실제 기록', U.el('p', 'pw-muted', projection.status === 'unavailable' && loaded?.status !== 'empty' ? '기록을 읽을 수 없어 이 날짜의 거래 존재를 확인할 수 없어요.' : '이 날짜에 표시할 유효한 거래 기록이 없어요.')));
        } else {
          flow.body.append(U.card('그날의 요약',
            U.row('기록 수', `${number.format(rows.length)}건 · 실제`),
            U.row('받은 돈 합계', U.money(safeTotal(rows, 'in'))),
            U.row('쓴 돈 합계', U.money(safeTotal(rows, 'out')))));
          for (const row of rows) {
            const parsed = typeof parsePocketWONDate === 'function' ? parsePocketWONDate(row.timestamp) : null;
            // sourceIndex is only a position in this snapshot, never a persisted ID.
            flow.body.append(U.card(row.memo.trim() || row.category,
              U.row('종류', row.type === 'in' ? '받은 돈 · 실제' : '쓴 돈 · 실제'),
              U.row('금액', U.money(row.amount)),
              U.row('분류', row.category),
              U.row('브라우저 로컬 시각', parsed ? parsed.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '시각 확인 안 됨'),
              U.row('메모', row.memo || '메모 없음')));
          }
        }
        flow.footer.append(U.action('닫기', () => flow.close.click(), true));
      }, opener);
    }

    function dayButton(date, asList = false) {
      const key = dateKey(date), rows = projection.days.get(key) || [];
      const unknown = projection.status === 'unavailable' && loaded?.status !== 'empty';
      const state = rows.length ? `실제 기록 ${number.format(rows.length)}건` : unknown ? '기록 확인 안 됨' : '유효한 날짜 기록 없음';
      const control = U.button('', event => openDay(date, event.currentTarget), asList ? 'pw-calendar-list-day' : 'pw-calendar-day');
      control.dataset.dateKey = key;
      control.dataset.recorded = String(rows.length > 0);
      control.setAttribute('aria-label', `${dateLabel(date)}${key === today ? ', 오늘' : ''}, ${state}, 실제 기록 보기`);
      if (key === today) control.setAttribute('aria-current', 'date');
      if (asList) {
        control.append(U.el('span', '', `${date.getDate()}일 (${weekdays[date.getDay()]})${key === today ? ' · 오늘' : ''}`), U.el('span', 'pw-calendar-list-status', state));
      } else {
        control.append(U.el('span', 'pw-calendar-day-number', String(date.getDate())), U.el('span', 'pw-calendar-day-mark', rows.length ? '기록' : key === today ? '오늘' : unknown ? '?' : '—'));
      }
      return control;
    }

    function renderMonth() {
      caption.textContent = `${year}년 ${month + 1}월`;
      previous.disabled = year === 0 && month === 0;
      next.disabled = year === 9999 && month === 11;
      const first = localDate(year, month, 1).getDay();
      const length = localDate(year, month + 1, 0).getDate();
      const table = U.el('table', 'pw-calendar-table');
      table.setAttribute('aria-label', `${year}년 ${month + 1}월 실제 기록 날짜표`);
      const tableCaption = U.el('caption', 'pw-sr-only', `${year}년 ${month + 1}월 · 브라우저 로컬 날짜 기준`);
      const head = U.el('thead'), headings = U.el('tr');
      for (const name of weekdays) {
        const cell = U.el('th', '', name);
        cell.scope = 'col'; cell.setAttribute('aria-label', name + '요일'); headings.append(cell);
      }
      head.append(headings);
      const body = U.el('tbody');
      const weeks = U.el('div', 'pw-calendar-week-lists');
      weeks.append(U.el('p', 'pw-muted', '날짜 목록 · 주별로 보기'));
      const cells = Math.ceil((first + length) / 7) * 7;
      let monthCount = 0;
      for (let start = 0; start < cells; start += 7) {
        const tr = U.el('tr'), week = U.el('section', 'pw-calendar-week');
        const list = U.el('ul', 'pw-calendar-date-list');
        const dates = [];
        for (let index = start; index < start + 7; index++) {
          const day = index - first + 1;
          const td = U.el('td');
          if (day < 1 || day > length) {
            const blank = U.el('span', 'pw-calendar-blank'); blank.setAttribute('aria-hidden', 'true'); td.append(blank);
          } else {
            const date = localDate(year, month, day);
            dates.push(day);
            monthCount += (projection.days.get(dateKey(date)) || []).length;
            td.append(dayButton(date));
            const item = U.el('li'); item.append(dayButton(date, true)); list.append(item);
          }
          tr.append(td);
        }
        if (dates.length) {
          week.append(U.el('h4', 'pw-calendar-week-title', `${month + 1}월 ${dates[0]}일~${dates.at(-1)}일`), list);
          weeks.append(week);
        }
        body.append(tr);
      }
      table.append(tableCaption, head, body);
      layout.replaceChildren(table, weeks);
      monthStatus.textContent = projection.status === 'unavailable' && loaded?.status !== 'empty'
        ? '실제 기록을 읽을 수 없어 이번 달의 기록 여부를 확인할 수 없어요.'
        : monthCount ? `이번 달에 날짜가 유효한 실제 기록 ${number.format(monthCount)}건을 표시해요.` : '이번 달에 표시할 날짜가 유효한 실제 기록이 없어요.';
      measureLayout();
      refresh(page);
    }

    function measureLayout() {
      if (page.disposed || !layout.isConnected) return;
      const focused = document.activeElement;
      const focusedKey = layout.contains(focused) ? focused?.dataset.dateKey : null;
      const fallback = document.documentElement.classList.contains('pw-accessible') || layout.getBoundingClientRect().width < 308;
      const changed = layout.dataset.listFallback !== String(fallback);
      layout.dataset.listFallback = String(fallback);
      if (changed && focusedKey) {
        const target = [...layout.querySelectorAll(fallback ? '.pw-calendar-list-day' : '.pw-calendar-day')].find(control => control.dataset.dateKey === focusedKey);
        target?.focus({ preventScroll: false });
      }
    }

    const mount = page.mount;
    page.mount = () => {
      mount(); measureLayout();
      if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(measureLayout); observer.observe(layout); }
      if (typeof MutationObserver === 'function') { classObserver = new MutationObserver(measureLayout); classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); }
      window.addEventListener('resize', measureLayout);
    };
    page.onDispose(() => { observer?.disconnect(); classObserver?.disconnect(); window.removeEventListener('resize', measureLayout); });
    renderMonth();
    return page;
  };

  PWFeatureViews.streak = (loaded, navigate, options = {}) => {
    const page = U.page('streak', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope');
    const projection = PWFeatureModels.calendar(loaded);
    const example = U.ready(page.vm), data = example ? page.vm.data : PWFeatureModels.empty('streak');
    const image = art('all');
    const policy = U.card('연속 기록 일수',
      image,
      example ? U.chip('preview', '연속 일수는 개발용 예시') : null,
      U.row('현재 연속 일수', example && Number.isSafeInteger(data.current) ? `${number.format(data.current)}일 · 예시` : '정책 준비 중'),
      U.row('최고 연속 일수', example && Number.isSafeInteger(data.best) ? `${number.format(data.best)}일 · 예시` : '정책 준비 중'),
      U.el('p', 'pw-muted', '연속 일수의 계산·유지 정책은 아직 정해지지 않았어요. 실제 기록으로 현재·최고 일수를 추정하지 않아요.'));
    page.body.append(policy);
    if (!example) U.appendStatus(page, '연속 일수 결과는 준비 중이에요. 실제 날짜가 유효한 이번 주 기록 표시만 아래에서 확인할 수 있어요.');

    const now = new Date(), monday = localDate(now.getFullYear(), now.getMonth(), now.getDate());
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    const week = U.el('ul', 'pw-streak-week');
    week.setAttribute('aria-label', '이번 주 월요일부터 일요일까지의 실제 기록 날짜');
    const unknown = projection.status === 'unavailable' && loaded?.status !== 'empty';
    for (let index = 0; index < 7; index++) {
      const date = localDate(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
      const recorded = projection.days.has(dateKey(date));
      const state = recorded ? '실제 기록 있음' : unknown ? '확인 안 됨' : '실제 기록 없음';
      const item = U.el('li', 'pw-streak-day'); item.dataset.recorded = String(recorded);
      item.setAttribute('aria-label', `${dateLabel(date)}, ${state}`);
      if (dateKey(date) === dateKey(now)) item.setAttribute('aria-current', 'date');
      item.append(U.el('span', 'pw-streak-day-label', `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`), U.el('span', 'pw-streak-day-state', recorded ? '기록 있음' : unknown ? '확인 안 됨' : '기록 없음'));
      week.append(item);
    }
    page.body.append(U.card('이번 주 실제 기록 날짜',
      U.row('읽기 상태', readLabel(loaded, projection)),
      U.el('p', 'pw-muted', '월요일~일요일 · 브라우저 로컬 날짜 기준이에요. 예제 연속 일수와 이 실제 날짜 표시는 서로 다른 정보예요.'), week));
    if (projection.omitted > 0) page.body.append(U.notice(`날짜 또는 거래 정보를 확인할 수 없는 ${number.format(projection.omitted)}개 기록은 이번 주 표시에서도 제외해요.`));
    page.footer.append(U.link('캘린더에서 실제 날짜 보기', 'calendar', navigate, { screen: 'feature', featureId: 'streak', returnTo: options.returnTo }));
    return page;
  };

  PWFeatureViews.badges = (loaded, navigate, options = {}) => {
    const page = U.page('badges', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope');
    const example = U.ready(page.vm), data = example ? page.vm.data : PWFeatureModels.empty('badges');
    const badges = Array.isArray(data.badges) ? data.badges : [];
    const openSheet = sheets(page);
    page.body.append(U.card('배지와 활동 포인트', art('all'),
      U.row('활동 포인트', example && Number.isSafeInteger(data.points) ? `${number.format(data.points)}점 · 예시` : '정책 준비 중'),
      U.el('p', 'pw-muted', '활동 포인트와 배지 정책은 준비 중이에요. 포인트는 현금·잔액·결제 수단이 아니며 여기서는 수량이나 포인트를 적립하지 않아요.')));
    if (!example) U.appendStatus(page, '아직 획득한 배지 정보가 없어요. 배지·활동 포인트 정책은 준비 중이며 실제 활동 결과를 추정하지 않아요.');
    let category = 'all', state = 'all';
    const filters = U.el('div', 'pw-habits-filters');
    const categoryField = U.select('배지 분류', [['all', '전체'], ...categories.map(value => [value, value])], category, value => { category = value; render(); });
    const stateField = U.select('배지 상태', [['all', '전체'], ['획득', '획득'], ['진행 중', '진행 중'], ['잠김', '잠김']], state, value => { state = value; render(); });
    filters.append(categoryField.element, stateField.element);
    const list = U.el('ul', 'pw-habits-list'); list.setAttribute('aria-label', '개발용 예제 배지 목록');
    const result = U.el('p', 'pw-muted'); result.setAttribute('role', 'status');
    page.body.append(filters, result, list);

    function render() {
      list.replaceChildren();
      if (!example) { result.textContent = '실제 배지 정보는 아직 없어요. 분류와 상태는 화면 확인용이에요.'; return; }
      const visible = badges.filter(badge => (category === 'all' || badge.category === category) && (state === 'all' || badge.status === state));
      result.textContent = visible.length ? '개발용 예제 배지예요. 실제 획득·적립이 아니에요.' : '선택한 분류와 상태의 예제 배지가 없어요.';
      for (const badge of visible) {
        const title = typeof badge.title === 'string' ? badge.title : '배지 이름 준비 중';
        const label = typeof badge.status === 'string' ? badge.status : '상태 준비 중';
        const item = U.el('li');
        const card = U.card(title, U.chip('preview', label + ' · 예시'), U.row('분류', categories.includes(badge.category) ? badge.category : '분류 준비 중'), U.el('p', 'pw-muted', typeof badge.description === 'string' ? badge.description : '배지 설명은 준비 중이에요.'));
        if (typeof badge.progress === 'number' && Number.isFinite(badge.progress)) {
          card.append(U.meter(badge.progress, title + ' 개발용 예제 진행률'), U.el('p', 'pw-muted', `예제 진행률 ${Math.max(0, Math.min(100, badge.progress))}% · 실제 활동 결과 아님`));
        }
        card.append(U.action('배지 살펴보기', event => openSheet('배지 미리보기', flow => {
          const image = staticArt('all'); if (image) flow.body.append(image);
          flow.body.append(U.notice('개발용 예제 배지예요. 배지 획득이나 포인트 적립은 하지 않아요.'), U.card(title,
            U.row('상태', label + ' · 예시'), U.row('분류', categories.includes(badge.category) ? badge.category : '분류 준비 중'),
            U.el('p', 'pw-muted', typeof badge.description === 'string' ? badge.description : '설명 준비 중')));
          flow.footer.append(U.action('닫기', () => flow.close.click(), true));
        }, event.currentTarget), true));
        item.append(card); list.append(item);
      }
      refresh(page);
    }
    render();
    return page;
  };
})();
