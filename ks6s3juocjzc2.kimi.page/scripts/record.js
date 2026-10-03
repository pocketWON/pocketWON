/* Record presentation and explicit-submit orchestration. No writes during rendering. */
function createRecordView(initialLoad) {
  const format = new Intl.NumberFormat('ko-KR');
  let loaded = initialLoad, validationLoad = initialLoad, disposed = false, busy = false, submitted = false;
  let draft, touched, feedbackTimer;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = element('div', 'pw-record');
  const intro = element('div', 'pw-record-intro');
  const heading = element('h1', 'pw-type-h1', '기록'); heading.id = 'pw-screen-title';
  intro.append(heading, element('p', 'pw-record-muted pw-type-body-small', '돈이 들어오고 나간 순간을 간단히 남겨보세요.'));
  const summary = element('section', 'pw-record-summary'); summary.setAttribute('aria-label', '현재 용돈');
  const add = element('button', 'pw-button pw-record-add', '새 기록 추가'); add.type = 'button';
  const feedback = element('p', 'pw-record-feedback pw-type-body-small'); feedback.setAttribute('role', 'status');
  const recent = element('section', 'pw-record-recent'); recent.setAttribute('aria-labelledby', 'pw-recent-title');
  root.append(intro, summary, add, feedback, recent);

  const dialog = element('dialog', 'pw-record-sheet');
  dialog.setAttribute('aria-labelledby', 'pw-record-sheet-title');
  const header = element('div', 'pw-record-sheet-header');
  const title = element('h2', 'pw-type-h3', '돈 기록하기'); title.id = 'pw-record-sheet-title';
  const close = element('button', 'pw-icon-button'); close.type = 'button'; close.setAttribute('aria-label', '돈 기록하기 닫기');
  close.innerHTML = pwIcon('close'); header.append(title, close);
  const form = element('form', 'pw-record-form'); form.noValidate = true;
  const body = element('div', 'pw-record-fields');
  const typeField = element('fieldset', 'pw-record-field');
  typeField.append(element('legend', 'pw-record-label', '어떤 돈인가요?'));
  const segments = element('div', 'pw-record-segments');
  const radio = (name, value, label, className) => {
    const wrapper = element('label', className);
    const input = element('input'); input.type = 'radio'; input.name = name; input.value = value;
    wrapper.append(input, element('span', '', label));
    return { wrapper, input };
  };
  const typeInputs = ['in', 'out'].map((value, index) => {
    const choice = radio('record-type', value, index ? '쓴 돈' : '받은 돈', 'pw-record-choice');
    segments.append(choice.wrapper); return choice.input;
  });
  typeField.append(segments);
  const amountField = element('div', 'pw-record-field');
  const amountLabel = element('label', 'pw-record-label', '얼마인가요?'); amountLabel.htmlFor = 'pw-record-amount';
  const preview = element('p', 'pw-record-amount-preview', '0원'); preview.setAttribute('aria-hidden', 'true');
  const amount = element('input', 'pw-record-input pw-record-amount');
  amount.type = 'text'; amount.inputMode = 'numeric'; amount.autocomplete = 'off'; amount.id = 'pw-record-amount'; amount.placeholder = '숫자로 입력';
  amount.setAttribute('aria-describedby', 'pw-amount-help pw-amount-error');
  const amountHelp = element('p', 'pw-record-muted pw-type-caption', '원 단위로 숫자만 입력해주세요.'); amountHelp.id = 'pw-amount-help';
  amountField.append(amountLabel, preview, amount, amountHelp);
  const categoryField = element('fieldset', 'pw-record-field');
  categoryField.append(element('legend', 'pw-record-label', '어떤 돈이었나요?'));
  const chips = element('div', 'pw-record-chips'); categoryField.append(chips);
  const memoField = element('div', 'pw-record-field');
  const memoLabel = element('label', 'pw-record-label', '메모'); memoLabel.htmlFor = 'pw-record-memo';
  memoLabel.append(element('span', 'pw-record-optional', '선택'));
  const memo = element('input', 'pw-record-input'); memo.id = 'pw-record-memo'; memo.type = 'text';
  memo.placeholder = '예: 학교 끝나고 간식'; memo.setAttribute('aria-describedby', 'pw-memo-help pw-memo-error');
  const memoHelp = element('p', 'pw-record-muted pw-type-caption', '50자까지 적을 수 있어요.'); memoHelp.id = 'pw-memo-help';
  memoField.append(memoLabel, memo, memoHelp);
  const errors = {};
  for (const [name, field] of [['type', typeField], ['amount', amountField], ['category', categoryField], ['memo', memoField]]) {
    const message = element('p', 'pw-record-error pw-type-body-small'); message.id = `pw-${name}-error`; message.hidden = true;
    message.setAttribute('aria-live', 'polite'); errors[name] = message; field.append(message);
  }
  for (const input of typeInputs) input.setAttribute('aria-describedby', errors.type.id);
  body.append(typeField, amountField, categoryField, memoField);
  const footer = element('div', 'pw-record-sheet-footer');
  const formError = element('p', 'pw-record-error pw-type-body-small'); formError.id = 'pw-record-save-error'; formError.hidden = true; formError.setAttribute('role', 'alert');
  const save = element('button', 'pw-button', '기록 저장'); save.type = 'submit'; save.disabled = true; save.setAttribute('aria-describedby', formError.id);
  footer.append(formError, save); form.append(body, footer); dialog.append(header, form);

  function renderSummary() {
    const model = createRecordViewModel(loaded.state);
    summary.replaceChildren(pwIllustrationPanel('record', { panelClass: 'pw-record-summary-visual', imageClass: 'pw-record-summary-illustration' }), element('p', 'pw-record-muted pw-type-body-small', '지금 쓸 수 있는 돈'));
    summary.append(element('p', 'pw-record-balance', model.balance === null ? '확인 전' : `${format.format(model.balance)}원`));
    if (loaded.status === 'empty') summary.append(element('p', 'pw-record-muted pw-type-caption', '첫 기록은 0원에서 시작해요. 받은 돈을 먼저 남겨보세요.'));
    else if (!model.writable) summary.append(element('p', 'pw-record-muted pw-type-body-small', '저장된 용돈 정보를 확인할 수 없어 기록을 저장할 수 없어요.'));
    recent.replaceChildren(element('h2', 'pw-type-h3', '최근 기록')); recent.firstChild.id = 'pw-recent-title';
    if (loaded.status === 'empty' || model.history === 'empty') {
      const empty = element('div', 'pw-record-empty');
      empty.append(pwIllustration('empty', { className: 'pw-record-empty-illustration' }));
      empty.append(element('p', '', '아직 기록이 없어요.'), element('p', 'pw-record-muted pw-type-body-small', '돈을 받거나 썼을 때 한 번씩 남겨보세요.'));
      recent.append(empty); return;
    }
    if (model.history === 'unavailable' || model.history === 'partial') recent.append(element('p', 'pw-record-muted pw-type-body-small', '일부 기록 정보를 확인할 수 없어요.'));
    let groupKey, list;
    for (const row of model.rows) {
      if (!list || (model.grouped && row.dayKey !== groupKey)) {
        groupKey = row.dayKey;
        if (model.grouped) recent.append(element('h3', 'pw-record-date-heading pw-type-caption', row.dateLabel));
        list = element('ul', 'pw-record-list'); recent.append(list);
      }
      const item = element('li', 'pw-record-row');
      const icon = element('span', 'pw-record-row-icon'); icon.innerHTML = pwIcon('record');
      const description = element('div', 'pw-record-row-description');
      description.append(element('p', 'pw-record-row-title', row.title));
      const detail = [row.category && row.category !== row.title ? row.category : '', row.dateLabel].filter(Boolean).join(' · ');
      description.append(element('p', 'pw-record-muted pw-type-caption', detail));
      const money = element('p', `pw-record-row-money${row.valid ? ` pw-record-row-money--${row.type}` : ''}`, row.valid ? `${row.type === 'in' ? '+' : '-'}${format.format(row.amount)}원` : '금액 확인 안 됨');
      if (row.valid) money.setAttribute('aria-label', `${row.type === 'in' ? '받은 돈' : '쓴 돈'} ${format.format(row.amount)}원`);
      if (row.valid && format.format(row.amount).length > 12) item.classList.add('pw-record-row--long');
      item.append(icon, description, money); list.append(item);
    }
  }
  function renderCategories() {
    chips.replaceChildren();
    if (!draft.type) chips.append(element('p', 'pw-record-muted pw-type-body-small', '받은 돈인지 쓴 돈인지 먼저 골라주세요.'));
    const categories = draft.type === 'in' || draft.type === 'out' ? PW_RECORD_CATEGORIES[draft.type] : [];
    for (const category of categories) {
      const choice = radio('record-category', category, category, 'pw-record-chip');
      choice.input.checked = draft.category === category;
      choice.input.setAttribute('aria-describedby', errors.category.id);
      choice.input.addEventListener('change', () => { draft.category = choice.input.value; touched.category = true; update(); });
      chips.append(choice.wrapper);
    }
  }
  function check() {
    if (!['loaded', 'empty'].includes(validationLoad.status)) return { valid: false, errors: { form: '저장된 용돈 정보를 불러오지 못했어요. 다시 시도해주세요.' } };
    return validateRecordDraft(draft, validationLoad.state);
  }
  function update(keepFormError = false) {
    const result = check();
    save.disabled = busy || submitted || !result.valid;
    const numeric = /^[0-9]+$/.test(draft.amount) ? Number(draft.amount) : NaN;
    preview.textContent = !draft.amount ? '0원' : Number.isSafeInteger(numeric) ? `${format.format(numeric)}원` : '금액 확인';
    preview.classList.toggle('pw-record-amount-preview--long', preview.textContent.length > 14);
    for (const name of ['type', 'amount', 'category', 'memo']) {
      const message = touched[name] ? result.errors[name] || '' : '';
      errors[name].textContent = message; errors[name].hidden = !message;
      const controls = name === 'amount' ? [amount] : name === 'memo' ? [memo] : name === 'type' ? typeInputs : [...chips.querySelectorAll('input')];
      for (const input of controls) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (!keepFormError) { formError.textContent = result.errors.form || ''; formError.hidden = !formError.textContent; }
  }
  function fitViewport() {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    const bottom = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    dialog.style.setProperty('--record-viewport-height', `${height}px`);
    dialog.style.setProperty('--record-viewport-bottom', `${bottom}px`);
  }
  function closeSheet() { if (dialog.open) dialog.close(); }
  function onClose() {
    if (dialog.open) return;
    draft = null; busy = false;
    if (!disposed) add.focus({ preventScroll: true });
  }
  function openSheet() {
    if (disposed || dialog.open) return;
    validationLoad = loadPocketWONState();
    draft = { type: '', amount: '', category: '', memo: '' }; touched = {};
    busy = false; submitted = false; amount.value = ''; memo.value = '';
    for (const input of typeInputs) input.checked = false;
    feedback.textContent = ''; renderCategories(); update(); fitViewport();
    dialog.showModal(); body.scrollTop = 0; typeInputs[0].focus({ preventScroll: true });
  }
  for (const input of typeInputs) input.addEventListener('change', () => {
    draft.type = input.value; draft.category = draft.type === 'in' ? '용돈' : '';
    touched.type = true; touched.category = false; renderCategories(); update();
  });
  amount.addEventListener('input', () => { draft.amount = amount.value; touched.amount = true; update(); });
  memo.addEventListener('input', () => { draft.memo = memo.value; touched.memo = true; update(); });
  close.addEventListener('click', closeSheet); add.addEventListener('click', openSheet);
  // Enter while editing is not an explicit activation of the save button.
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target !== save) event.preventDefault();
  });
  dialog.addEventListener('close', onClose);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const all = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const focusable = all.filter(input => input.type !== 'radio' || input.checked || (!all.some(other => other.type === 'radio' && other.name === input.name && other.checked) && all.find(other => other.type === 'radio' && other.name === input.name) === input));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (disposed || !dialog.open || !draft || busy || submitted || save.disabled) return;
    busy = true; save.disabled = true;
    validationLoad = loadPocketWONState();
    const checked = check();
    if (!checked.valid) {
      busy = false; touched = { type: true, amount: true, category: true, memo: true }; update(); return;
    }
    let nextState;
    try { nextState = applyTransaction(validationLoad.state, draft, new Date().toISOString()); }
    catch (_) { /* Keep the draft and report the same normalized save failure below. */ }
    if (!nextState || persistPocketWONState(nextState).status !== 'saved') {
      busy = false; formError.textContent = '기록을 저장하지 못했어요. 다시 시도해주세요.'; formError.hidden = false; update(true); return;
    }
    submitted = true;
    loaded = { status: 'loaded', state: nextState }; validationLoad = loaded;
    renderSummary(); closeSheet(); feedback.textContent = '기록했어요.';
    clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 4000);
  });
  renderSummary();
  return {
    element: root,
    mount() { document.body.append(dialog); window.visualViewport?.addEventListener('resize', fitViewport); window.visualViewport?.addEventListener('scroll', fitViewport); window.addEventListener('resize', fitViewport); },
    dispose() { disposed = true; clearTimeout(feedbackTimer); closeSheet(); dialog.remove(); window.visualViewport?.removeEventListener('resize', fitViewport); window.visualViewport?.removeEventListener('scroll', fitViewport); window.removeEventListener('resize', fitViewport); },
  };
}
