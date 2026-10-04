/* In-memory wish/cooldown sketches only. No payment blocking or goal writes. */
(() => {
  const U = PWFeatureUI;
  const memory = { directItems: [], fixtureItems: null, serial: 0 };
  const art = () => typeof pwIllustrationPanel === 'function'
    ? pwIllustrationPanel('goal', { panelClass: 'pw-habits-visual pw-compact-visual', ambient: false }) : null;
  const staticArt = profile => typeof pwIllustration === 'function' ? pwIllustration(profile, { className: 'pw-habits-sheet-art' }) : null;
  const refresh = page => { if (!page.disposed) PWUI.refreshMotion?.(page.element); };

  function validDateInput(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= lengths[month - 1];
  }

  PWFeatureViews.thoughtbox = (loaded, navigate, options = {}) => {
    const page = U.page('thoughtbox', loaded, navigate, options);
    page.element.classList.add('pw-habits-scope', 'pw-thoughtbox-view');
    const ready = U.ready(page.vm);
    if (ready && memory.fixtureItems === null) {
      const items = Array.isArray(page.vm.data.items) ? page.vm.data.items : [];
      memory.fixtureItems = items.map(item => ({ ...item, uiKey: 'wish-fixture-' + ++memory.serial, origin: 'fixture', reviewed: false }));
    }
    const items = () => [...(ready ? memory.fixtureItems || [] : []), ...memory.directItems];
    let sheet = null;
    page.onDispose(() => { sheet?.dispose(); sheet = null; });
    const explanation = U.card('사기 전에 잠깐 생각해 두기', art(),
      U.el('p', 'pw-muted', '갖고 싶은 물건과 가격, 다시 생각할 날짜를 직접 적어볼 수 있어요. 결제를 막거나 실제 구매를 차단하는 기능은 아니에요.'),
      U.notice('직접 입력한 항목과 모든 초안·선택은 이 브라우저의 메모리에만 있어요. 새로고침하면 사라져요. 날짜를 골라도 알림을 예약하지 않아요. 실제 목표·잔액·거래는 바뀌지 않아요.'));
    page.body.append(explanation);
    if (!ready) U.appendStatus(page, '서비스에 저장된 생각 보관함은 아직 연결되지 않았어요. 아래 직접 입력은 새로고침하면 없어지는 임시 화면이에요.');
    const listStatus = U.el('p', 'pw-muted'); listStatus.setAttribute('role', 'status');
    const list = U.el('ul', 'pw-habits-list'); list.setAttribute('aria-label', '임시 생각 보관함 목록');
    page.body.append(listStatus, list);
    const addButton = U.action('물건 직접 입력 · 임시', event => openCreate(event.currentTarget));
    page.footer.append(addButton);

    function open(title, render, opener) {
      if (page.disposed) return null;
      sheet?.dispose();
      sheet = U.sheet(title, flow => {
        flow.dialog.classList.add('pw-habits-sheet-scope', 'pw-thoughtbox-sheet');
        flow.dialog.dataset.feature = 'thoughtbox';
        render(flow);
      }, opener);
      return sheet;
    }

    function itemPrice(item) {
      return Number.isSafeInteger(item.amount) && item.amount > 0 ? item.amount : null;
    }

    function renderList() {
      list.replaceChildren();
      const current = items();
      listStatus.textContent = current.length ? '예제 항목과 직접 입력한 임시 항목을 구분해서 표시해요. 실제 저장된 구매·목표 목록이 아니에요.' : '아직 표시할 임시 항목이 없어요. 직접 적어볼 수 있어요.';
      for (const item of current) {
        const entry = U.el('li');
        const title = typeof item.title === 'string' && item.title.trim() ? item.title : '이름 확인 필요';
        const detail = U.action('상세 보기', event => openDetail(item, event.currentTarget), true);
        detail.dataset.wishKey = item.uiKey;
        detail.setAttribute('aria-label', title + ' 임시 상세 보기');
        entry.append(U.card(title,
          U.chip('preview', item.origin === 'fixture' ? '개발용 예제 항목' : '직접 입력 · 메모리만'),
          U.row(item.origin === 'fixture' ? '가격 · 예시' : '직접 입력한 가격', U.money(itemPrice(item))),
          U.row('다시 생각할 날짜', typeof item.reviewAt === 'string' && item.reviewAt ? item.reviewAt : '입력 안 됨'),
          U.row('확인 상태', item.reviewed ? '이 화면에서 확인함 · 임시' : (typeof item.status === 'string' ? item.status : '생각 중') + ' · 임시'), detail));
        list.append(entry);
      }
      refresh(page);
    }

    function openCreate(opener) {
      // Fixtures never prefill a new user draft; no registration time is invented.
      const draft = { title: '', amount: '', reviewAt: '' };
      let composing = false, submitted = false, attempted = false;
      open('물건 직접 입력 · 임시', flow => {
        const image = staticArt('goal'); if (image) flow.body.append(image);
        flow.body.append(U.notice('메모리에만 등록해요. 새로고침하면 이 초안과 등록 항목이 없어져요. 구매·결제·목표 생성·알림 예약은 하지 않아요.'));
        const title = U.field('생각해 둘 물건', draft.title, 'text', value => { draft.title = value; update(); });
        const amount = U.field('가격 (원 · 정수)', draft.amount, 'text', value => { draft.amount = value; update(); });
        const review = U.field('다시 생각할 날짜 (브라우저 로컬 날짜)', draft.reviewAt, 'date', value => { draft.reviewAt = value; update(); });
        title.input.maxLength = 50;
        title.input.autocomplete = 'off';
        amount.input.inputMode = 'numeric'; amount.input.pattern = '[0-9]*'; amount.input.maxLength = 16; amount.input.autocomplete = 'off';
        for (const field of [title, amount, review]) field.input.required = true;
        const help = U.el('p', 'pw-muted', '물건 이름은 50자까지, 가격은 1원 이상의 정수로 입력해요. 고른 날짜는 표시만 하며 알림을 예약하지 않아요.');
        help.id = title.input.id + '-help';
        const fields = { title, amount, reviewAt: review };
        const errors = {};
        for (const [key, field] of Object.entries(fields)) {
          const error = U.el('p', 'pw-error'); error.id = field.input.id + '-error'; error.setAttribute('role', 'alert'); error.hidden = true;
          field.input.setAttribute('aria-describedby', help.id + ' ' + error.id);
          field.element.append(error); errors[key] = error;
        }
        const register = U.action('임시 등록 (메모리만)', () => {
          if (page.disposed || submitted || composing) return;
          attempted = true;
          const checked = update();
          const firstError = Object.keys(fields).find(key => checked[key]);
          if (firstError) { fields[firstError].input.focus({ preventScroll: false }); return; }
          submitted = true; register.disabled = true;
          memory.directItems.push({
            uiKey: 'wish-direct-' + ++memory.serial, origin: 'direct', title: draft.title.trim(), amount: Number(draft.amount),
            createdAt: null, reviewAt: draft.reviewAt, reviewedAt: null, reviewed: false, status: '생각 중',
          });
          renderList();
          listStatus.textContent = '직접 입력한 항목을 메모리에만 등록했어요. 새로고침하면 사라지며 실제 구매·목표·알림은 바뀌지 않았어요.';
          flow.close.click();
        });
        function update() {
          const messages = {};
          if (!draft.title.trim()) messages.title = '물건 이름을 직접 적어주세요.';
          else if (Array.from(draft.title.trim()).length > 50) messages.title = '물건 이름은 50자까지 적을 수 있어요.';
          const price = /^[0-9]+$/.test(draft.amount) ? Number(draft.amount) : NaN;
          if (!Number.isSafeInteger(price) || price <= 0) messages.amount = '가격은 1원 이상의 정수로, 숫자만 입력해주세요.';
          if (!validDateInput(draft.reviewAt)) messages.reviewAt = '다시 생각할 날짜를 직접 골라주세요.';
          for (const [key, field] of Object.entries(fields)) {
            const message = attempted ? messages[key] || '' : '';
            errors[key].textContent = message; errors[key].hidden = !message;
            field.input.setAttribute('aria-invalid', message ? 'true' : 'false');
          }
          return messages;
        }
        flow.dialog.addEventListener('compositionstart', () => { composing = true; });
        flow.dialog.addEventListener('compositionend', () => { composing = false; });
        flow.dialog.addEventListener('keydown', event => {
          if (event.key === 'Enter' && (composing || event.isComposing || event.keyCode === 229 || event.target.matches('input, textarea, select'))) event.preventDefault();
        });
        flow.body.append(title.element, amount.element, review.element, help);
        flow.footer.append(register, U.action('취소', () => flow.close.click(), true));
      }, opener);
    }

    function openDetail(item, opener) {
      if (!items().some(candidate => candidate.uiKey === item.uiKey)) return;
      open('생각 보관함 상세 · 임시', flow => {
        flow.back.addEventListener('click', () => { renderDetail(); flow.footer.querySelector('button')?.focus({ preventScroll: false }); });
        // Native Escape, X and action closes all return to a current list control.
        flow.dialog.addEventListener('close', () => {
          if (page.disposed) return;
          renderList();
          const target = [...list.querySelectorAll('[data-wish-key]')].find(control => control.dataset.wishKey === item.uiKey);
          (target || addButton).focus({ preventScroll: false });
        }, { once: true });
        const title = typeof item.title === 'string' ? item.title : '이름 확인 필요';
        function reset(profile = 'goal') {
          flow.body.replaceChildren(); flow.footer.replaceChildren();
          const image = staticArt(profile); if (image) flow.body.append(image);
        }
        function renderDetail() {
          reset(); flow.back.hidden = true;
          flow.body.append(U.notice('직접 입력과 화면 선택은 메모리에만 있어요. 새로고침하면 사라져요. 실제 결제를 차단하거나 알림을 예약하지 않아요.'),
            U.card(title, U.chip('preview', item.origin === 'fixture' ? '개발용 예제' : '직접 입력 · 임시'),
              U.row('가격', U.money(itemPrice(item))),
              U.row('등록 시각', typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : '기록하지 않음 · 임시'),
              U.row('다시 생각할 날짜', typeof item.reviewAt === 'string' && item.reviewAt ? item.reviewAt : '입력 안 됨'),
              U.row('다시 확인 시각', typeof item.reviewedAt === 'string' && item.reviewedAt ? item.reviewedAt : '기록하지 않음 · 임시'),
              U.row('다시 확인 상태', item.reviewed ? '이 화면에서 확인함 · 임시' : '확인 전 · 임시')));
          const reviewed = U.action('다시 확인하기 · 임시', () => {
            if (page.disposed) return;
            item.reviewed = true; // Do not manufacture a review timestamp.
            renderDetail(); flow.body.querySelector('button')?.focus({ preventScroll: false });
          }, true);
          const actions = U.el('div', 'pw-habits-actions');
          actions.append(reviewed,
            U.action('목표로 생각해 보기 · 미리보기', renderGoalPreview, true),
            U.action('삭제 확인 · 임시', renderDelete, true));
          flow.body.append(actions);
          flow.footer.append(U.action('닫기', () => flow.close.click(), true));
        }
        function renderDelete() {
          reset(); flow.back.hidden = false;
          flow.body.append(U.card('임시 목록에서 삭제할까요?', U.el('p', '', title),
            U.el('p', 'pw-muted', '이 브라우저의 임시 목록에서만 삭제해요. 실제 거래·목표·구매 기록은 바뀌지 않아요. 개발용 예제는 새로고침하면 다시 표시될 수 있어요.')));
          flow.footer.append(U.action('임시 항목 삭제', () => {
            if (page.disposed) return;
            memory.directItems = memory.directItems.filter(candidate => candidate.uiKey !== item.uiKey);
            if (memory.fixtureItems) memory.fixtureItems = memory.fixtureItems.filter(candidate => candidate.uiKey !== item.uiKey);
            flow.close.click();
          }), U.action('취소 · 상세로', () => { renderDetail(); flow.footer.querySelector('button')?.focus({ preventScroll: false }); }, true));
          flow.footer.querySelector('button')?.focus({ preventScroll: false });
        }
        function renderGoalPreview() {
          reset(); flow.back.hidden = false;
          flow.body.append(U.notice('목표화 흐름의 미리보기예요. 확인해도 실제 목표를 만들거나 수정하지 않으며 목표 입력 화면에 자동으로 채우지 않아요.'),
            U.card('이 물건을 목표로 생각해 볼까요?', U.row('직접 입력 또는 예제 물건', title), U.row('입력 또는 예제 가격', U.money(itemPrice(item))), U.row('실제 목표 생성', '준비 중 · 실행하지 않음')));
          flow.footer.append(U.action('미리보기 확인', () => {
            if (page.disposed) return;
            reset(); flow.back.hidden = false;
            flow.body.append(U.card('목표화 화면을 확인했어요', U.el('p', 'pw-muted', '미리보기 확인만 마쳤어요. 실제 목표·잔액·거래는 만들거나 바꾸지 않았어요.')));
            flow.footer.append(U.action('상세로 돌아가기', () => { renderDetail(); flow.footer.querySelector('button')?.focus({ preventScroll: false }); }, true), U.action('닫기', () => flow.close.click(), true));
            flow.footer.querySelector('button')?.focus({ preventScroll: false });
          }), U.action('취소 · 상세로', () => { renderDetail(); flow.footer.querySelector('button')?.focus({ preventScroll: false }); }, true));
          flow.footer.querySelector('button')?.focus({ preventScroll: false });
        }
        renderDetail();
      }, opener);
    }
    renderList();
    return page;
  };
})();
