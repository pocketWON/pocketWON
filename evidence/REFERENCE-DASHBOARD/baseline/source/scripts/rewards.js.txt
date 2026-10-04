/* Promises are temporary UI drafts only: no automatic judgment, reward or points. */
(() => {
  const U = PWFeatureUI;
  const types = [['praise', '칭찬'], ['together', '함께 활동'], ['gift', '선물'], ['allowance', '추가 용돈'], ['custom', '직접 정하기']];
  const statuses = [['before', '시작 전'], ['progress', '진행 중'], ['achieved', '조건 달성 상태 예시'], ['needs-confirmation', '확인 필요'], ['complete', '완료 상태 예시']];
  const confirmations = { 'not-yet': '아직이에요 · 임시 답변', received: '받았어요 · 임시 답변', 'parent-pending': '부모님 확인 대기 상태 예시' };
  const text = (value, fallback = '준비 중') => typeof value === 'string' && value.trim() ? value : fallback;
  const label = (items, value) => items.find(([id]) => id === value)?.[1] || '준비 중';
  const integer = value => typeof value === 'string' && /^[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
  const returnTo = { screen: 'feature', featureId: 'rewards' };

  PWFeatureViews.rewards = (loaded, navigate, options = {}) => {
    const page = U.page('rewards', loaded, navigate, options), sheets = new Set();
    page.element.classList.add('pw-family', 'pw-rewards');
    page.onDispose(() => { for (const flow of sheets) flow.dispose(); });
    function sheet(title, render, opener) {
      const flow = U.sheet(title, active => { active.dialog.classList.add('pw-family-sheet'); render(active); }, opener);
      sheets.add(flow);flow.onDispose(()=>sheets.delete(flow));
      return flow;
    }
    let draft = PWFeatureDrafts.rewards || null;
    const result = U.el('p', 'pw-meta');
    result.setAttribute('role', 'status');
    page.body.append(U.notice('약속 미리보기예요. 이용자가 입력한 임시 내용은 메모리에만 남고 새로고침하면 초기화돼요. 실제 저장·보상·지급은 하지 않아요.'),
      U.card('함께 정하는 약속', U.el('p', '', '어떤 목표를 응원하고 어떤 약속을 나눌지 직접 적어볼 수 있어요.'),
        U.el('p', 'pw-muted', '목표 달성을 자동 판정하지 않아요. 실제 보상 지급이나 활동 포인트 증가도 없어요.')));
    const statusSlot = U.el('div', 'pw-family-stack'), draftSlot = U.el('div', 'pw-family-stack');
    let previewInput;
    function renderState() {
      if (previewInput) previewInput.value = page.vm.aiState;
      if (!U.ready(page.vm)) {
        const state = U.state(page.vm, { profile: 'goal', title: page.vm.aiState === 'error' ? '약속 화면 오류 예시' : '아직 저장된 약속이 없어요',
          description: '실제 약속 저장 기능은 준비 중이에요. 아래에서 이용자가 직접 임시 약속을 만들어 화면만 확인할 수 있어요.' });
        if (page.vm.aiState === 'error') state.append(U.action('준비 화면 다시 보기', () => {
          PWPreview.select('rewards', 'preparing'); page.vm = PWFeatureProviders.get('rewards', loaded); renderState();
        }, true));
        statusSlot.replaceChildren(state);
        return;
      }
      const data = page.vm.data;
      statusSlot.replaceChildren(U.card('통합 개발용 약속 예제 · 실제 약속 아님',
        U.row('약속 제목', text(data.title)), U.row('연결할 목표', text(data.goal, '예제 목표 슬롯 준비 중')),
        U.row('조건', text(data.condition)), U.row('유형', text(data.type)), U.row('보상', text(data.reward)),
        U.row('약속한 사람', text(data.promisedBy)), U.row('상태', label(statuses, data.status)),
        U.el('p', 'pw-meta', '이 예제는 임시 입력 양식에 합치지 않아요. 실제 달성·보상 확인 결과가 아니에요.')));
    }
    page.body.append(statusSlot);
    if (PWPreview.enabled) {
      const preview = U.select('개발용 공통 화면 상태', [['success', '예제 보기'], ['preparing', '준비 중'], ['empty', '빈 화면'], ['error', '오류']], page.vm.aiState, value => {
        PWPreview.select('rewards', value); page.vm = PWFeatureProviders.get('rewards', loaded); renderState();
      });
      previewInput = preview.input;
      page.body.append(U.accordion('개발용 상태 확인', [preview.element, '예제 상태만 바뀌며 실제 약속이나 보상은 바뀌지 않아요.']));
    }
    page.body.append(draftSlot, result);

    function rewardValue(value) {
      return value.type === 'allowance' ? U.money(value.amount) : value.reward;
    }
    function rows(value) {
      return [U.row('약속 제목', value.title), U.row('연결할 목표', value.goal || '아직 직접 정하지 않았어요'),
        U.row('조건', value.condition), U.row('유형', label(types, value.type)), U.row('보상', rewardValue(value)),
        U.row('약속한 사람', value.promisedBy), U.row('선택한 상태 · 임시', label(statuses, value.status)),
        U.row('보상 확인 · 임시', confirmations[value.confirmation] || confirmations['not-yet'])];
    }
    function confirmAnswer(value, opener) {
      if (!draft) return;
      sheet('보상 확인 답변 미리보기', flow => {
        flow.body.append(U.notice('답변 UI만 확인해요. 실제 보상 수령·부모님 확인·지급을 처리하지 않아요.'),
          U.card('임시 약속', U.row('제목', draft.title), U.row('선택할 답변', confirmations[value])),
          U.el('p', 'pw-muted', '이 답변으로 목표 달성이나 약속 완료 상태를 자동 판정하지 않아요.'));
        flow.footer.append(U.action('임시 답변 화면 확인', () => {
          draft = { ...draft, confirmation: value };
          PWFeatureDrafts.rewards = draft;
          flow.close.click();
          renderDraft();
          result.textContent = '임시 화면에서 확인했어요. 실제 보상 수령이나 부모님 확인은 하지 않았어요.';
          editButton.focus();
        }), U.action('취소', () => flow.close.click(), true));
      }, opener);
    }
    function renderDraft() {
      if (!draft) {
        draftSlot.replaceChildren(U.card('내가 입력할 임시 약속', U.el('p', 'pw-muted', '아직 입력한 임시 약속이 없어요. 새 약속을 입력해 화면에서 확인해보세요.')));
        return;
      }
      draftSlot.replaceChildren(U.card('내가 입력한 임시 약속 · 새로고침 시 초기화', ...rows(draft),
        U.el('p', 'pw-meta', '상태는 이용자가 고른 UI 예시이며 실제 목표 달성이나 보상 완료를 뜻하지 않아요.'),
        U.action('받았어요 · 답변 화면 예시', event => confirmAnswer('received', event.currentTarget), true),
        U.action('아직이에요 · 답변 화면 예시', event => confirmAnswer('not-yet', event.currentTarget), true),
        U.action('부모님 확인 대기 · 상태 예시', event => confirmAnswer('parent-pending', event.currentTarget), true)));
    }

    function openForm(opener) {
      const raw = draft ? { ...draft, amount: draft.amount === null ? '' : String(draft.amount) } : {
        title: '', goal: '', condition: '', type: 'praise', reward: '', amount: '', promisedBy: '', status: 'before', confirmation: 'not-yet'
      };
      sheet('칭찬·보상 약속 임시 입력', flow => {
        let checked, stage = 'form';
        flow.progress.hidden = false;
        flow.back.addEventListener('click', () => { if (stage === 'review') renderForm(); });
        function renderForm() {
          stage = 'form'; flow.back.hidden = true; flow.progress.textContent = '1 / 2 · 이용자가 직접 입력';
          const form = U.el('form', 'pw-family-form');
          form.noValidate = true;
          const fields = {};
          function field(key, title, type = 'text', maximum = 80) {
            const item = U.field(title, raw[key], type, value => { raw[key] = value; });
            if (type !== 'number') item.input.maxLength = maximum;
            fields[key] = item;
            return item.element;
          }
          const title = field('title', '약속 제목', 'text', 60), goal = field('goal', '함께할 목표 이름 (선택)', 'text', 80);
          const condition = field('condition', '직접 정한 조건', 'textarea', 300);
          const type = U.select('약속 유형', types, raw.type, value => { raw.type = value; updateType(); });
          const reward = field('reward', '보상 내용', 'textarea', 200), amount = field('amount', '추가 용돈 금액 (원)', 'number');
          fields.amount.input.min = '1'; fields.amount.input.max = String(Number.MAX_SAFE_INTEGER);
          const promisedBy = field('promisedBy', '약속할 사람의 표시 이름', 'text', 50);
          const state = U.select('약속 상태 · 이용자가 고르는 임시 예시', statuses, raw.status, value => { raw.status = value; });
          const error = U.el('p', 'pw-error'); error.id = fields.title.input.id + '-error'; error.setAttribute('role', 'alert');
          for (const item of Object.values(fields)) item.input.setAttribute('aria-describedby', error.id);
          function updateType() { reward.hidden = raw.type === 'allowance'; amount.hidden = raw.type !== 'allowance'; }
          updateType();
          form.id = fields.title.input.id + '-form';
          form.append(title, goal, condition, type.element, reward, amount, promisedBy, state.element,
            U.el('p', 'pw-meta', '추가 용돈은 1원 이상의 정수만 입력해요. 현금 금액과 활동 포인트를 섞지 않아요.'), error);
          form.addEventListener('submit', event => {
            event.preventDefault();
            const errors = [];
            const invalid = (key, message) => { fields[key].input.setAttribute('aria-invalid', 'true'); errors.push([key, message]); };
            for (const item of Object.values(fields)) item.input.removeAttribute('aria-invalid');
            if (!raw.title.trim() || Array.from(raw.title.trim()).length > 60) invalid('title', '약속 제목을 1~60자로 적어주세요.');
            if (Array.from(raw.goal.trim()).length > 80) invalid('goal', '목표 이름은 80자까지 적어주세요.');
            if (!raw.condition.trim() || Array.from(raw.condition.trim()).length > 300) invalid('condition', '조건을 1~300자로 적어주세요.');
            if (!raw.promisedBy.trim() || Array.from(raw.promisedBy.trim()).length > 50) invalid('promisedBy', '약속할 사람의 표시 이름을 1~50자로 적어주세요.');
            if (raw.type === 'allowance' && !integer(raw.amount)) invalid('amount', '추가 용돈 금액은 입력 가능한 범위의 1원 이상 정수로 적어주세요.');
            if (raw.type !== 'allowance' && (!raw.reward.trim() || Array.from(raw.reward.trim()).length > 200)) invalid('reward', '보상 내용을 1~200자로 적어주세요.');
            if (!types.some(([id]) => id === raw.type) || !statuses.some(([id]) => id === raw.status)) {
              error.textContent = '유형과 상태를 다시 골라주세요.'; type.input.focus(); return;
            }
            if (errors.length) { error.textContent = errors.map(([, message]) => message).join(' '); fields[errors[0][0]].input.focus(); return; }
            checked = { title: raw.title.trim(), goal: raw.goal.trim(), condition: raw.condition.trim(), type: raw.type,
              reward: raw.type === 'allowance' ? '' : raw.reward.trim(), amount: raw.type === 'allowance' ? Number(raw.amount) : null,
              promisedBy: raw.promisedBy.trim(), status: raw.status, confirmation: raw.confirmation || 'not-yet' };
            renderReview();
          });
          const submit = U.action('입력한 약속 확인', null); submit.type = 'submit'; submit.setAttribute('form', form.id);
          flow.body.replaceChildren(U.notice('실제 약속 저장이 아닌 임시 예시 입력이에요. 새로고침하면 초기화돼요.'), form);
          flow.footer.replaceChildren(submit, U.action('취소', () => flow.close.click(), true));
          if (flow.dialog.open) fields.title.input.focus();
        }
        function renderReview() {
          stage = 'review'; flow.back.hidden = false; flow.progress.textContent = '2 / 2 · 임시 화면에서 확인';
          flow.body.replaceChildren(U.notice('아래 내용은 이 브라우저의 임시 화면에만 남아요. 실제 보상·지급·포인트 증가가 없어요.'),
            U.card('입력한 약속 확인', ...rows(checked)));
          const confirm = U.action('임시 약속 화면 확인', () => {
            draft = { ...checked }; PWFeatureDrafts.rewards = draft;
            flow.close.click(); renderDraft();
            result.textContent = '임시 화면에서 확인했어요. 실제 약속이나 금융 기록은 저장하지 않았어요.';
            editButton.focus();
          });
          flow.footer.replaceChildren(confirm, U.action('다시 입력', renderForm, true));
          confirm.focus();
        }
        renderForm();
      }, opener);
    }
    const editButton = U.action('약속 임시 입력·수정', event => openForm(event.currentTarget));
    page.footer.append(editButton);
    page.body.append(U.card('함께 보기', U.link('부모님과 함께 보기', 'parent-view', navigate, returnTo),
      U.link('다음 용돈·목표 계획', 'next-plan', navigate, returnTo)));
    renderState(); renderDraft();
    return page;
  };
})();
