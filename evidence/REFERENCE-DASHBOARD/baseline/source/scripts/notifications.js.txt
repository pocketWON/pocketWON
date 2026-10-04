/* Notification-center and setting previews. No notification or permission APIs. */
(() => {
  const U = PWFeatureUI;
  const memory = { fixtureItems: null, selected: new Set(), settings: null, serial: 0 };
  const settingLabels = [['record', '기록 알림'], ['report', '리포트 알림'], ['goal', '목표 알림'], ['reward', '보상 약속 알림'], ['learning', '금융 학습 알림']];
  const art = () => typeof pwIllustrationPanel === 'function'
    ? pwIllustrationPanel('all', { panelClass: 'pw-habits-visual pw-compact-visual', ambient: false }) : null;
  const staticArt = () => typeof pwIllustration === 'function' ? pwIllustration('all', { className: 'pw-habits-sheet-art' }) : null;
  const refresh = page => { if (!page.disposed) PWUI.refreshMotion?.(page.element); };
  const validTime = value => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) && Number(value.slice(0, 2)) < 24 && Number(value.slice(3)) < 60;

  function sheets(page) {
    let current = null;
    page.onDispose(() => { current?.dispose(); current = null; });
    return (title, render, opener) => {
      if (page.disposed) return null;
      current?.dispose();
      current = U.sheet(title, flow => {
        flow.dialog.classList.add('pw-habits-sheet-scope', 'pw-notification-sheet');
        flow.dialog.dataset.feature = page.element.dataset.feature;
        render(flow);
      }, opener);
      return current;
    };
  }

  PWFeatureViews.notifications = (loaded, navigate, options = {}) => {
    const page = U.page('notifications', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope', 'pw-notification-view');
    const ready = U.ready(page.vm);
    if (ready && memory.fixtureItems === null) {
      const source = Array.isArray(page.vm.data.items) ? page.vm.data.items : [];
      memory.fixtureItems = source.map(item => ({ ...item, uiKey: 'notification-fixture-' + ++memory.serial, read: item.read === true }));
    }
    const items = ready ? memory.fixtureItems || [] : [];
    const openSheet = sheets(page);
    page.body.append(U.card('알림을 모아 보는 화면', art(),
      U.el('p', 'pw-muted', '실제 발송된 알림은 아직 연결되지 않았어요. 개발용 예제의 읽음·안 읽음과 선택만 메모리에서 바꿀 수 있어요.'),
      U.notice('읽음 표시와 모든 선택은 새로고침하면 초기화돼요. 실제 푸시·OS 권한 요청·알림 발송·예약은 하지 않아요.')));
    if (!ready) U.appendStatus(page, '아직 실제 알림이 없어요. 실제 알림 서비스는 준비 중이며 예제 결과를 운영 알림으로 표시하지 않아요.');
    let category = 'all', readState = 'all';
    const categories = [...new Set(items.map(item => item.category).filter(value => typeof value === 'string' && value.trim()))];
    const filters = U.el('div', 'pw-habits-filters');
    const categoryField = U.select('알림 분류', [['all', '전체'], ...categories.map(value => [value, value])], category, value => { category = value; renderList(); });
    const readField = U.select('읽음 상태', [['all', '전체'], ['unread', '안 읽음'], ['read', '읽음']], readState, value => { readState = value; renderList(); });
    filters.append(categoryField.element, readField.element);
    const summary = U.el('p', 'pw-muted'); summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite');
    const actions = U.el('div', 'pw-habits-actions');
    const allRead = U.action('전체 읽음 · 임시', () => {
      if (page.disposed || !ready) return;
      for (const item of items) item.read = true;
      renderList();
      summary.textContent = '개발용 예제 전체를 메모리에서만 읽음으로 표시했어요. 실제 알림이나 저장 상태는 바뀌지 않았어요.';
    }, true);
    const selectedRead = U.action('선택한 알림 읽음 · 임시', () => markSelection(true), true);
    const selectedUnread = U.action('선택한 알림 안 읽음 · 임시', () => markSelection(false), true);
    allRead.disabled = !ready || !items.length;
    actions.append(allRead, selectedRead, selectedUnread);
    const list = U.el('ul', 'pw-habits-list'); list.setAttribute('aria-label', '개발용 예제 알림 목록');
    page.body.append(filters, summary, actions, list);
    page.footer.append(U.link('알림 설정 · 미리보기', 'notification-settings', navigate, { screen: 'feature', featureId: 'notifications', returnTo: options.returnTo }));

    function selectedItems() { return items.filter(item => memory.selected.has(item.uiKey)); }
    function updateSummary(visibleCount) {
      const selected = selectedItems();
      selectedRead.disabled = !ready || !selected.length; selectedUnread.disabled = !ready || !selected.length;
      summary.textContent = !ready ? '실제 알림 정보가 없어요. 예제 결과가 있을 때 읽음·선택 화면을 확인할 수 있어요.'
        : `개발용 예제 · 표시 ${visibleCount}개 · 안 읽음 ${items.filter(item => !item.read).length}개 · 선택 ${selected.length}개. 실제 발송 아님.`;
    }
    function markSelection(read) {
      if (page.disposed || !ready) return;
      const selected = selectedItems();
      if (!selected.length) return;
      for (const item of selected) item.read = read;
      renderList();
      summary.textContent = `선택한 예제를 메모리에서만 ${read ? '읽음' : '안 읽음'}으로 표시했어요. 새로고침하면 초기화돼요.`;
    }
    function renderList() {
      list.replaceChildren();
      const visible = items.filter(item => (category === 'all' || item.category === category) && (readState === 'all' || (readState === 'read' ? item.read : !item.read)));
      updateSummary(visible.length);
      if (ready && !visible.length) {
        const empty = U.el('li'); empty.append(U.card('선택한 조건의 예제 알림이 없어요', U.el('p', 'pw-muted', '분류나 읽음 상태를 바꿔 볼 수 있어요. 실제 발송된 알림은 아니에요.'))); list.append(empty);
      }
      for (const item of visible) {
        const title = typeof item.title === 'string' ? item.title : '알림 제목 준비 중';
        const entry = U.el('li');
        const chip = U.chip('preview', (item.read ? '읽음' : '안 읽음') + ' · 예시');
        const selectLabel = U.el('label', 'pw-notification-select');
        const checkbox = U.el('input'); checkbox.type = 'checkbox'; checkbox.checked = memory.selected.has(item.uiKey);
        checkbox.setAttribute('aria-label', title + ' 예제 알림 선택 (임시)');
        selectLabel.append(checkbox, U.el('span', '', '이 예제 알림 선택 · 임시'));
        checkbox.addEventListener('change', () => {
          if (page.disposed) return;
          if (checkbox.checked) memory.selected.add(item.uiKey); else memory.selected.delete(item.uiKey);
          updateSummary(visible.length);
        });
        const readToggle = U.toggle('이 예제 알림의 읽음 표시 · 임시', item.read, value => {
          if (page.disposed) return;
          item.read = value;
          chip.textContent = (value ? '읽음' : '안 읽음') + ' · 예시';
          if (readState !== 'all') { renderList(); readField.input.focus({ preventScroll: false }); }
          else updateSummary(visible.length);
        });
        readToggle.setAttribute('aria-label', title + ' 읽음 표시 (메모리만)');
        const detail = U.action('알림 내용 보기', event => openSheet('알림 내용 · 예제', flow => {
          const image = staticArt(); if (image) flow.body.append(image);
          flow.body.append(U.notice('개발용 예제 알림이에요. 실제 푸시나 발송 기록이 아니에요.'), U.card(title,
            U.row('분류', typeof item.category === 'string' ? item.category : '분류 준비 중'),
            U.row('읽음 상태', (item.read ? '읽음' : '안 읽음') + ' · 임시'),
            U.row('시각', typeof item.time === 'string' && item.time ? item.time : '시각 정보 없음'),
            U.el('p', 'pw-muted', typeof item.description === 'string' ? item.description : '내용 준비 중')));
          flow.footer.append(U.action('닫기', () => flow.close.click(), true));
        }, event.currentTarget), true);
        detail.setAttribute('aria-label', title + ' 예제 내용 보기');
        entry.append(U.card(title, chip,
          U.row('분류', typeof item.category === 'string' ? item.category : '분류 준비 중'),
          U.row('시각', typeof item.time === 'string' && item.time ? item.time : '시각 정보 없음'),
          U.el('p', 'pw-muted', typeof item.description === 'string' ? item.description : '내용 준비 중'), selectLabel, readToggle, detail));
        list.append(entry);
      }
      refresh(page);
    }
    renderList();
    return page;
  };

  PWFeatureViews['notification-settings'] = (loaded, navigate, options = {}) => {
    const page = U.page('notification-settings', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope', 'pw-notification-view');
    if (memory.settings === null) {
      const source = U.ready(page.vm) ? page.vm.data : PWFeatureModels.empty('notification-settings');
      memory.settings = Object.fromEntries(settingLabels.map(([key]) => [key, source[key] === true]));
      memory.settings.time = validTime(source.time) ? source.time : null;
    }
    const draft = memory.settings;
    const openSheet = sheets(page);
    page.body.append(U.card('알림 설정 미리보기', art(),
      U.notice('다섯 가지 토글과 시각은 모두 임시 미리보기예요. 새로고침하면 선택이 사라져요. 실제 푸시 설정·OS 권한·알림 발송·예약에는 적용되지 않아요.')));
    if (!U.ready(page.vm)) U.appendStatus(page, '실제 알림 설정은 준비 중이에요. 아래 스위치와 시각은 오류·로딩 상태에서도 화면 확인용으로만 선택할 수 있어요.');
    const controls = U.el('div', 'pw-notification-controls');
    const status = U.el('p', 'pw-muted'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.textContent = '현재 표시된 값은 실제 저장 설정이 아닌 메모리 초안이에요.';
    page.body.append(controls, status);
    const confirm = U.action('임시 선택 확인 · 미리보기', event => openSheet('알림 설정 확인 · 미리보기', flow => {
      const image = staticArt(); if (image) flow.body.append(image);
      const summary = U.card('선택한 임시 설정');
      for (const [key, label] of settingLabels) summary.append(U.row(label, draft[key] ? '켜짐 · 임시' : '꺼짐 · 임시'));
      summary.append(U.row('알림 시각', validTime(draft.time) ? draft.time + ' · 직접 입력 · 브라우저 로컬 시각' : '입력 안 됨'));
      flow.body.append(U.notice('확인 버튼은 화면 확인만 해요. 실제 푸시·OS 권한·알림 예약은 바꾸지 않아요.'), summary);
      flow.footer.append(U.action('미리보기 확인', () => {
        if (page.disposed) return;
        flow.body.replaceChildren(); flow.footer.replaceChildren();
        const image = staticArt(); if (image) flow.body.append(image);
        flow.body.append(U.card('임시 선택을 확인했어요', U.el('p', 'pw-muted', '실제 알림 설정에는 적용하지 않았어요. 토글과 입력한 시각은 이 브라우저의 메모리에만 있으며 새로고침하면 사라져요.')));
        flow.footer.append(U.action('닫기', () => flow.close.click(), true));
        flow.footer.querySelector('button')?.focus({ preventScroll: false });
      }), U.action('취소', () => flow.close.click(), true));
    }, event.currentTarget));
    const reset = U.action('임시 선택 초기화', () => {
      if (page.disposed) return;
      const empty = PWFeatureModels.empty('notification-settings');
      for (const [key] of settingLabels) draft[key] = empty[key] === true;
      draft.time = null;
      renderControls(); status.textContent = '이 화면의 임시 선택만 초기화했어요. 실제 알림 설정은 바뀌지 않았어요.';
    }, true);
    page.footer.append(confirm, reset);

    function renderControls() {
      controls.replaceChildren();
      for (const [key, label] of settingLabels) {
        const toggle = U.toggle(label + ' (미리보기)', draft[key], value => {
          if (page.disposed) return;
          draft[key] = value; status.textContent = label + ' 임시 선택만 바꿨어요. 실제 알림에는 적용되지 않아요.';
        });
        controls.append(toggle);
      }
      const time = U.field('알림 시각 (미리보기 · 브라우저 로컬 시각)', draft.time || '', 'time', value => {
        if (page.disposed) return;
        draft.time = validTime(value) ? value : null;
        const invalid = !!value && !validTime(value);
        time.input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
        status.textContent = invalid ? '시각 입력을 확인해주세요. 실제 알림을 예약하지 않아요.' : value ? '입력한 시각을 표시만 해요. 실제 알림을 예약하지 않아요.' : '시각을 입력하지 않았어요. 알림 예약은 하지 않아요.';
      });
      const help = U.el('p', 'pw-muted', '시각은 선택 사항이에요. 입력한 브라우저 로컬 시각을 표시할 뿐, 알림을 발송하거나 예약하지 않아요.');
      help.id = time.input.id + '-help'; time.input.setAttribute('aria-describedby', help.id);
      time.input.step = '60';
      time.element.append(help); controls.append(time.element);
      refresh(page);
    }
    renderControls();
    return page;
  };
})();
