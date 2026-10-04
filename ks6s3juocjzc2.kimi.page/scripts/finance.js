/* Finance has no connected-data fixtures or business actions, even in preview. */
(() => {
  const U = PWFeatureUI;
  const returnTo = id => ({ screen: 'feature', featureId: id });
  const statusOptions = [['draft', '입력 상태 예시'], ['review', '확인 대기 상태 예시'], ['paused', '일시 정지 상태 예시']];
  const integer = value => typeof value === 'string' && /^[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  function setup(id, loaded, navigate, options) {
    const page = U.page(id, loaded, navigate, options), sheets = new Set();
    page.element.classList.add('pw-settings', 'pw-finance');
    page.onDispose(() => { for (const flow of sheets) flow.dispose(); });
    page.openSheet = (title, render, opener) => {
      const flow = U.sheet(title, active => { active.dialog.classList.add('pw-settings-sheet'); render(active); }, opener);
      sheets.add(flow);flow.onDispose(()=>sheets.delete(flow)); return flow;
    };
    page.body.append(U.notice('미리보기예요. 실제 금융 연결·송금·결제·카드 설정은 하지 않으며 입력한 값도 실제 저장하지 않아요.'));
    return page;
  }
  function explain(page, title, description, opener) {
    page.openSheet(title, flow => {
      flow.body.append(U.chip('unavailable', '아직 사용할 수 없는 기능'),
        U.notice('설명 UI만 확인해요. 실제 금융 데이터나 연결 결과를 만들지 않아요.'), U.el('p', '', description));
      flow.footer.append(U.action('안내 확인', () => flow.close.click()));
    }, opener);
  }
  function commonStates(page, id, loaded) {
    const slot = U.el('div', 'pw-settings-stack');
    let control;
    function paint() {
      if (control) control.input.value = page.vm.aiState;
      if (U.ready(page.vm)) {
        slot.replaceChildren(U.el('p', 'pw-meta', '개발용 기본 안내 화면이에요. 금융 연결 결과나 금융 fixture는 제공하지 않으며 연결 정보는 계속 비어 있어요.'));
        return;
      }
      const state = U.state(page.vm, { profile: 'balance', title: page.vm.aiState === 'error' ? '오류 화면의 미리보기' : '아직 사용할 수 없는 기능이에요',
        description: '금융 서비스 연결이 없어요. 준비·빈 화면·오류의 모양만 확인하며 실제 계좌나 카드 결과는 만들지 않아요.' });
      if (page.vm.aiState === 'error') state.append(U.action('준비 화면 다시 보기', () => {
        PWPreview.select(id, 'preparing'); page.vm = PWFeatureProviders.get(id, loaded); paint();
      }, true));
      slot.replaceChildren(state);
    }
    page.body.append(slot);
    if (PWPreview.enabled) {
      control = U.select('개발용 공통 화면 상태 · 금융 결과 없음', [['success', '기본 안내'], ['preparing', '준비 중'], ['empty', '빈 화면'], ['error', '오류']], page.vm.aiState, value => {
        PWPreview.select(id, value); page.vm = PWFeatureProviders.get(id, loaded); paint();
      });
      page.body.append(U.accordion('개발용 상태 확인', [control.element, '어떤 상태에서도 실제 금융 연결이나 가짜 계좌·카드 정보를 표시하지 않아요.']));
    }
    paint();
  }

  PWFeatureViews.finance = (loaded, navigate, options = {}) => {
    const page = setup('finance', loaded, navigate, options);
    const empty = PWFeatureModels.empty('finance');
    page.body.append(U.card('금융 연결 준비 중', U.chip('unavailable', '아직 사용할 수 없는 기능'),
      U.row('계좌 정보', Array.isArray(empty.accounts) && !empty.accounts.length ? '연결 데이터 없음' : '확인 안 됨'),
      U.row('금융 서비스 상태', '아직 연결되지 않았어요'),
      U.el('p', 'pw-muted', '실제 은행·계좌·카드 정보를 가져오거나 금융 연결을 진행하지 않아요.')),
      U.card('계좌 연결', U.el('p', 'pw-muted', '계좌 연결 안내만 확인할 수 있어요.'),
        U.action('계좌 연결 안내', event => explain(page, '계좌 연결 안내',
          '계좌 연결 서비스는 아직 사용할 수 없어요. 은행 선택·계좌번호 입력·인증·권한 요청이나 실제 연결 결과는 제공하지 않아요.', event.currentTarget), true)),
      U.card('용돈 지급', U.el('p', '', '실제 지급 기능은 아직 연결되지 않았어요'),
        U.action('용돈 지급 안내', event => explain(page, '용돈 지급 안내',
          '실제 용돈 송금·자동이체·지급 예약은 없어요. 정기 용돈 화면에서는 이용자가 직접 계획의 모양만 살펴볼 수 있어요.', event.currentTarget), true),
        U.link('정기 용돈 계획 미리보기', 'allowance', navigate, returnTo('finance'))),
      U.card('카드 연결', U.el('p', 'pw-muted', '카드를 발급하거나 연결하는 기능은 준비 중이에요.'),
        U.action('카드 연결 안내', event => explain(page, '카드 연결 안내',
          '실제 카드 발급·연결은 아직 사용할 수 없어요. 카드 정보나 연결 결과를 만들지 않아요.', event.currentTarget), true),
        U.link('카드·제한 설정 화면 보기', 'card', navigate, returnTo('finance'))),
      U.card('결제', U.el('p', 'pw-muted', '결제 기능은 아직 사용할 수 없어요.'),
        U.action('결제 안내', event => explain(page, '결제 기능 안내',
          '실제 결제나 송금은 하지 않아요. 결제 코드·바코드·QR을 만들거나 표시하지 않으며 결제 완료 결과도 제공하지 않아요.', event.currentTarget), true)));
    commonStates(page, 'finance', loaded);
    page.footer.append(U.action('금융 기능 전체 안내', event => explain(page, '금융 기능 전체 안내',
      '계좌·용돈 지급·카드·결제는 모두 준비 중이에요. 현재는 안내와 임시 화면 확인만 가능하며 실제 금융 저장 정보는 바뀌지 않아요.', event.currentTarget), true));
    return page;
  };

  PWFeatureViews.card = (loaded, navigate, options = {}) => {
    const page = setup('card', loaded, navigate, options), empty = PWFeatureModels.empty('card');
    let draft = PWFeatureDrafts.card || null;
    page.body.append(U.card('카드·결제 준비 중', U.chip('unavailable', '아직 사용할 수 없는 기능'),
      U.row('카드 정보', empty.card == null ? '아직 연결된 카드 정보가 없어요' : '확인 안 됨'),
      U.row('카드 사용액', U.money(null)), U.el('p', 'pw-meta', '카드 사용액은 null이에요. 카드번호·바코드·QR이나 연결된 카드 예제를 만들지 않아요.'),
      U.action('카드 사용 안내', event => explain(page, '카드 사용 안내',
        '실제 카드 사용액 조회·결제·금액 차감은 아직 사용할 수 없어요. 금융 결과 없이 안내만 제공해요.', event.currentTarget), true)),
      U.card('카드 설정 안내', U.el('p', 'pw-muted', '제한 금액과 상태를 입력하는 화면의 모양만 확인할 수 있어요.'),
        U.action('설정·제한 안내', event => explain(page, '카드 설정·제한 안내',
          '아래 입력은 실제 카드 사용 제한이나 알림 설정으로 적용되지 않아요. 실제 카드 정책과 권한 확인 절차는 준비 중이에요.', event.currentTarget), true)));
    const draftSlot = U.el('div', 'pw-settings-stack'), result = U.el('p', 'pw-meta'); result.setAttribute('role', 'status');
    function rows(value) {
      return [U.row('하루 제한 UI 금액', U.money(value.dailyLimit)), U.row('한 달 제한 UI 금액', U.money(value.monthlyLimit)),
        U.row('제한 UI 표시', value.showLimit ? '켜짐 · 임시' : '꺼짐 · 임시'),
        U.row('알림 UI 표시', value.notificationPreview ? '켜짐 · 임시' : '꺼짐 · 임시'),
        U.row('선택한 화면 상태', statusOptions.find(([id]) => id === value.status)?.[1] || '준비 중')];
    }
    function renderDraft() {
      draftSlot.replaceChildren(draft ? U.card('이용자가 입력한 임시 설정 · 실제 카드 설정 아님', ...rows(draft),
        U.el('p', 'pw-meta', '이 브라우저 메모리에만 남고 새로고침하면 초기화돼요. 실제 제한·알림·결제를 적용하지 않아요.'))
        : U.card('임시 제한·상태 UI', U.el('p', 'pw-muted', '아직 임시로 입력한 설정이 없어요. 실제 카드 연결 없이 입력 화면만 확인할 수 있어요.')));
    }
    page.body.append(draftSlot, result);
    commonStates(page, 'card', loaded);
    page.body.append(U.link('금융 연결 안내', 'finance', navigate, returnTo('card')));
    const edit = U.action('카드 제한·상태 UI 임시 입력', event => {
      const raw = draft ? { ...draft, dailyLimit: String(draft.dailyLimit), monthlyLimit: String(draft.monthlyLimit) }
        : { dailyLimit: '', monthlyLimit: '', showLimit: false, notificationPreview: false, status: 'draft' };
      page.openSheet('카드 설정 화면 임시 입력', flow => {
        let stage = 'form', checked;
        flow.progress.hidden = false;
        flow.back.addEventListener('click', () => { if (stage === 'review') renderForm(); });
        function renderForm() {
          stage = 'form'; flow.back.hidden = true; flow.progress.textContent = '1 / 2 · UI 값 입력';
          const form = U.el('form', 'pw-settings-form'); form.noValidate = true;
          const daily = U.field('하루 제한 화면에 표시할 금액 (원)', raw.dailyLimit, 'number', value => { raw.dailyLimit = value; });
          const monthly = U.field('한 달 제한 화면에 표시할 금액 (원)', raw.monthlyLimit, 'number', value => { raw.monthlyLimit = value; });
          for (const item of [daily, monthly]) { item.input.min = '1'; item.input.max = String(Number.MAX_SAFE_INTEGER); }
          const state = U.select('카드 설정 화면 상태 · 임시 예시', statusOptions, raw.status, value => { raw.status = value; });
          const error = U.el('p', 'pw-error'); error.id = daily.input.id + '-error'; error.setAttribute('role', 'alert');
          for (const item of [daily, monthly]) item.input.setAttribute('aria-describedby', error.id);
          form.id = daily.input.id + '-form';
          form.append(daily.element, monthly.element, U.toggle('제한 UI 표시 · 실제 적용 안 됨', raw.showLimit, value => { raw.showLimit = value; }),
            U.toggle('알림 UI 표시 · 실제 발송 안 됨', raw.notificationPreview, value => { raw.notificationPreview = value; }), state.element,
            U.el('p', 'pw-meta', '1원 이상의 정수만 입력해요. 실제 카드 정책을 정하거나 활동 포인트를 현금으로 바꾸지 않아요.'), error);
          form.addEventListener('submit', submitEvent => {
            submitEvent.preventDefault();
            for (const item of [daily, monthly]) item.input.removeAttribute('aria-invalid');
            if (!integer(raw.dailyLimit) || !integer(raw.monthlyLimit)) {
              const invalid = !integer(raw.dailyLimit) ? daily.input : monthly.input;
              invalid.setAttribute('aria-invalid', 'true'); error.textContent = '각 금액을 입력 가능한 범위의 1원 이상 정수로 적어주세요.'; invalid.focus(); return;
            }
            if (!statusOptions.some(([id]) => id === raw.status)) { error.textContent = '화면 상태를 다시 골라주세요.'; state.input.focus(); return; }
            checked = { dailyLimit: Number(raw.dailyLimit), monthlyLimit: Number(raw.monthlyLimit), showLimit: !!raw.showLimit,
              notificationPreview: !!raw.notificationPreview, status: raw.status };
            renderReview();
          });
          const submit = U.action('입력한 설정 UI 확인', null); submit.type = 'submit'; submit.setAttribute('form', form.id);
          flow.body.replaceChildren(U.notice('실제 카드 설정이 아닌 임시 입력이에요. 저장·제한 적용·권한 요청은 하지 않아요.'), form);
          flow.footer.replaceChildren(submit, U.action('취소', () => flow.close.click(), true));
          if (flow.dialog.open) daily.input.focus();
        }
        function renderReview() {
          stage = 'review'; flow.back.hidden = false; flow.progress.textContent = '2 / 2 · 임시 화면 확인';
          flow.body.replaceChildren(U.notice('입력한 UI 값만 확인해요. 실제 카드 상태·제한·사용액은 바뀌지 않아요.'), U.card('입력한 임시 설정', ...rows(checked)));
          const confirm = U.action('임시 설정 화면 확인', () => {
            draft = { ...checked }; PWFeatureDrafts.card = draft;
            flow.close.click(); renderDraft(); result.textContent = '임시 화면에서 확인했어요. 실제 카드 제한이나 알림 설정은 적용하지 않았어요.'; edit.focus();
          });
          flow.footer.replaceChildren(confirm, U.action('다시 입력', renderForm, true)); confirm.focus();
        }
        renderForm();
      }, event.currentTarget);
    });
    page.footer.append(edit); renderDraft();
    return page;
  };
})();
