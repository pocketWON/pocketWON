/* A regular allowance plan is a memory-only preview, never a payment schedule. */
(() => {
  const U = PWFeatureUI;
  const frequencies = [['weekly', '매주'], ['monthly', '매월']];
  const weekdays = [['mon', '월요일'], ['tue', '화요일'], ['wed', '수요일'], ['thu', '목요일'], ['fri', '금요일'], ['sat', '토요일'], ['sun', '일요일']];
  const statuses = [['active', '사용 중 · 임시'], ['paused', '일시 정지 · 임시'], ['ended', '종료 · 임시']];
  const label = (values, value, fallback = '준비 중') => values.find(([id]) => id === value)?.[1] || fallback;
  const integer = value => typeof value === 'string' && /^[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  const paymentNotice = '실제 지급 기능은 아직 연결되지 않았어요';
  function validStart(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
  }

  PWFeatureViews.allowance = (loaded, navigate, options = {}) => {
    const page = U.page('allowance', loaded, navigate, options), sheets = new Set();
    page.element.classList.add('pw-family', 'pw-allowance');
    page.onDispose(() => { for (const flow of sheets) flow.dispose(); });
    let draft = PWFeatureDrafts.allowance || null, previewInput;
    const stateSlot = U.el('div', 'pw-family-stack'), draftSlot = U.el('div', 'pw-family-stack');
    const result = U.el('p', 'pw-meta'); result.setAttribute('role', 'status');
    page.body.append(U.notice('정기 용돈 계획 미리보기예요. 직접 입력한 내용은 메모리에만 남으며 새로고침하면 초기화돼요. 실제 저장·송금·자동이체는 하지 않아요.'),
      U.card('용돈을 받는 계획', U.el('p', '', paymentNotice),
        U.el('p', 'pw-muted', '요일과 날짜를 정하는 UI만 확인해요. 실제 다음 지급일을 계산하거나 추정하지 않아요.')),
      stateSlot);
    function renderState() {
      if (previewInput) previewInput.value = page.vm.aiState;
      if (!U.ready(page.vm)) {
        const state = U.state(page.vm, { profile: 'balance', title: page.vm.aiState === 'error' ? '정기 용돈 화면 오류 예시' : '아직 저장된 정기 용돈 계획이 없어요',
          description: paymentNotice + '. 직접 입력한 계획을 임시 화면에서만 살펴볼 수 있어요.' });
        if (page.vm.aiState === 'error') state.append(U.action('준비 화면 다시 보기', () => {
          PWPreview.select('allowance', 'preparing'); page.vm = PWFeatureProviders.get('allowance', loaded); renderState();
        }, true));
        stateSlot.replaceChildren(state);
        return;
      }
      const data = page.vm.data;
      stateSlot.replaceChildren(U.card('통합 개발용 용돈 계획 예제 · 실제 지급 아님',
        U.row('예제 주기', label(frequencies, data.frequency)), U.row('예제 금액', U.money(data.amount)),
        U.row('예제 시작 날짜', typeof data.startDate === 'string' ? data.startDate : '확인 안 됨'),
        U.row('요일·날짜', data.frequency === 'weekly' ? label(weekdays, data.weekday, '예제 요일 준비 중') : Number.isInteger(data.monthDay) ? data.monthDay + '일' : '예제 날짜 준비 중'),
        U.row('상태', '개발용 계획 예시 · 실제 사용 중 아님'), U.row('다음 지급일', '준비 중 · 실제 날짜 추론 안 함'),
        U.el('p', 'pw-muted', paymentNotice), U.el('p', 'pw-meta', '예제 데이터를 아래 임시 입력 양식에 합치지 않아요.')));
    }
    if (PWPreview.enabled) {
      const control = U.select('개발용 공통 화면 상태', [['success', '예제 보기'], ['preparing', '준비 중'], ['empty', '빈 화면'], ['error', '오류']], page.vm.aiState, value => {
        PWPreview.select('allowance', value); page.vm = PWFeatureProviders.get('allowance', loaded); renderState();
      });
      previewInput = control.input;
      page.body.append(U.accordion('개발용 상태 확인', [control.element, '계획 상태 UI만 바뀌며 실제 지급은 하지 않아요.']));
    }
    function rows(value) {
      return [U.row('주기', label(frequencies, value.frequency)),
        U.row('받기로 생각한 요일·날짜', value.frequency === 'weekly' ? label(weekdays, value.weekday) : value.monthDay + '일'),
        U.row('용돈 금액', U.money(value.amount)), U.row('시작 날짜 · 직접 입력', value.startDate),
        U.row('선택한 상태', label(statuses, value.status)), U.row('다음 지급일', '준비 중 · 실제 날짜 추론 안 함')];
    }
    function renderDraft() {
      draftSlot.replaceChildren(draft ? U.card('직접 입력한 임시 용돈 계획', ...rows(draft),
        U.el('p', 'pw-muted', paymentNotice), U.el('p', 'pw-meta', '사용 중·일시 정지·종료는 화면 상태 예시예요. 실제 자동이체나 지급 상태가 아니에요.'))
        : U.card('내 임시 계획', U.el('p', 'pw-muted', '아직 임시로 입력한 계획이 없어요. 주기와 금액을 직접 정해 화면에서 확인해보세요.')));
    }
    page.body.append(draftSlot, result, U.card('계획과 금융 기능 안내',
      U.link('다음 용돈·목표 계획', 'next-plan', navigate, { screen: 'feature', featureId: 'allowance' }),
      U.link('금융 연결 안내', 'finance', navigate, { screen: 'feature', featureId: 'allowance' })));

    function openForm(opener) {
      const raw = draft ? { ...draft, amount: String(draft.amount), monthDay: String(draft.monthDay ?? '') } : {
        frequency: 'weekly', weekday: 'mon', monthDay: '', amount: '', startDate: '', status: 'active'
      };
      const flow = U.sheet('정기 용돈 계획 임시 입력', active => {
        active.dialog.classList.add('pw-family-sheet');
        let stage = 'form', checked;
        active.progress.hidden = false;
        active.back.addEventListener('click', () => { if (stage === 'review') renderForm(); });
        function renderForm() {
          stage = 'form'; active.back.hidden = true; active.progress.textContent = '1 / 2 · 직접 입력';
          const form = U.el('form', 'pw-family-form'); form.noValidate = true;
          const frequency = U.select('용돈 주기', frequencies, raw.frequency, value => { raw.frequency = value; updateFrequency(); });
          const weekday = U.select('매주 받을 요일', weekdays, raw.weekday, value => { raw.weekday = value; });
          const monthDay = U.field('매월 받을 날짜 (1~31일)', raw.monthDay, 'number', value => { raw.monthDay = value; });
          monthDay.input.min = '1'; monthDay.input.max = '31';
          const amount = U.field('용돈 금액 (원)', raw.amount, 'number', value => { raw.amount = value; });
          amount.input.min = '1'; amount.input.max = String(Number.MAX_SAFE_INTEGER);
          const start = U.field('계획을 시작할 날짜', raw.startDate, 'date', value => { raw.startDate = value; });
          const status = U.select('계획 상태 · 임시 화면', statuses, raw.status, value => { raw.status = value; });
          const error = U.el('p', 'pw-error'); error.id = amount.input.id + '-error'; error.setAttribute('role', 'alert');
          for (const item of [monthDay, amount, start]) item.input.setAttribute('aria-describedby', error.id);
          function updateFrequency() { weekday.element.hidden = raw.frequency !== 'weekly'; monthDay.element.hidden = raw.frequency !== 'monthly'; }
          updateFrequency();
          form.id = amount.input.id + '-form';
          form.append(frequency.element, weekday.element, monthDay.element, amount.element, start.element, status.element,
            U.el('p', 'pw-meta', '금액은 1원 이상의 정수예요. 날짜가 없는 달의 처리 정책은 준비 중이며 다음 지급일은 계산하지 않아요.'), error);
          form.addEventListener('submit', event => {
            event.preventDefault();
            const errors = [], inputs = { monthDay, amount, start };
            for (const item of Object.values(inputs)) item.input.removeAttribute('aria-invalid');
            const invalid = (key, message) => { inputs[key].input.setAttribute('aria-invalid', 'true'); errors.push([key, message]); };
            if (!integer(raw.amount)) invalid('amount', '용돈 금액을 입력 가능한 범위의 1원 이상 정수로 적어주세요.');
            if (raw.frequency === 'monthly' && (!integer(raw.monthDay) || Number(raw.monthDay) > 31)) invalid('monthDay', '매월 날짜는 1~31일 중 정수로 적어주세요.');
            if (!validStart(raw.startDate)) invalid('start', '시작 날짜를 정확하게 선택해주세요.');
            if (!frequencies.some(([id]) => id === raw.frequency) || !statuses.some(([id]) => id === raw.status)
              || (raw.frequency === 'weekly' && !weekdays.some(([id]) => id === raw.weekday))) {
              error.textContent = '주기·요일·상태를 다시 선택해주세요.'; frequency.input.focus(); return;
            }
            if (errors.length) { error.textContent = errors.map(([, message]) => message).join(' '); inputs[errors[0][0]].input.focus(); return; }
            checked = { frequency: raw.frequency, weekday: raw.frequency === 'weekly' ? raw.weekday : null,
              monthDay: raw.frequency === 'monthly' ? Number(raw.monthDay) : null, amount: Number(raw.amount), startDate: raw.startDate, status: raw.status, nextDate: null };
            renderReview();
          });
          const submit = U.action('입력한 계획 확인', null); submit.type = 'submit'; submit.setAttribute('form', form.id);
          active.body.replaceChildren(U.notice('미리보기 입력이에요. 실제 지급·자동이체·송금은 없어요.'), U.el('p', 'pw-muted', paymentNotice), form);
          active.footer.replaceChildren(submit, U.action('취소', () => active.close.click(), true));
          if (active.dialog.open) frequency.input.focus();
        }
        function renderReview() {
          stage = 'review'; active.back.hidden = false; active.progress.textContent = '2 / 2 · 임시 확인';
          active.body.replaceChildren(U.notice('확인해도 실제 계획이나 금융 정보는 저장하지 않아요.'),
            U.card('입력한 용돈 계획', ...rows(checked)), U.el('p', 'pw-muted', paymentNotice));
          const confirm = U.action('임시 계획 화면 확인', () => {
            draft = { ...checked }; PWFeatureDrafts.allowance = draft;
            active.close.click(); renderDraft(); result.textContent = '임시 화면에서 확인했어요. 실제 지급 예약이나 저장은 하지 않았어요.';
            edit.focus();
          });
          active.footer.replaceChildren(confirm, U.action('다시 입력', renderForm, true)); confirm.focus();
        }
        renderForm();
      }, opener);
      sheets.add(flow);flow.onDispose(()=>sheets.delete(flow));
    }
    const edit = U.action('정기 용돈 임시 입력·수정', event => openForm(event.currentTarget));
    page.footer.append(edit);
    renderState(); renderDraft();
    return page;
  };
})();
