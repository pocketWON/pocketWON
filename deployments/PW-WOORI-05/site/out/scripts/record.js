/* Fixed-frame record presentation. Financial validation and writes remain in state.js. */
function createRecordView(initialLoad, navigate, options = {}) {
  const { el, button, heading, money } = PWUI;
  const format = new Intl.NumberFormat('ko-KR');
  const compact = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  let loaded = initialLoad, validationLoad = initialLoad, disposed = false, mounted = false;
  let page = Math.max(1, Number(options.page) || 1), capacity = 1, measured = false, stage = 'list';
  let list, listObserver, listFrame, textPager, wizardPager, returnFocus, wizard, draft, step = 'type';
  let busy = false, submitted = false, composing = false;
  const root = el('div', 'pw-screen pw-record');
  const refreshMotion = () => { if (mounted && !disposed) PWUI.refreshMotion(root); };
  const model = () => createRecordViewModel(loaded.state);
  const stopPager = () => { textPager?.dispose(); textPager = null; };
  const stopWizardPager = () => { wizardPager?.dispose(); wizardPager = null; };
  const stopList = () => { listObserver?.disconnect(); listObserver = null; cancelAnimationFrame(listFrame); listFrame = null; list = null; };
  const smallButton = (label, callback) => button(label, callback, 'pw-record-secondary');

  function showList(focusSource) {
    stage = 'list'; root.dataset.stage = stage; root.className = 'pw-screen pw-record';
    stopPager(); stopList();
    const current = model();
    root.replaceChildren(heading('기록'));
    const summary = el('section', 'pw-panel pw-record-summary'); summary.setAttribute('aria-label', '현재 용돈');
    const balance = el('div', 'pw-record-summary-copy');
    balance.append(el('p', 'pw-muted', '지금 쓸 수 있는 돈'), money(current.balance, 'pw-record-balance'));
    summary.append(balance, pwIllustrationPanel('record', { panelClass: 'pw-compact-visual pw-record-summary-visual' }));
    const toolbar = el('div', 'pw-record-toolbar');
    toolbar.append(el('h2', 'pw-record-section-title', '기록 내역'), button('새 기록 추가', openWizard, 'pw-button pw-record-add'));
    const history = el('section', 'pw-record-history'); history.setAttribute('aria-label', '기록 목록');
    list = el('ul', 'pw-record-list'); list.setAttribute('aria-label', '거래');
    const notice = el('p', 'pw-muted pw-record-notice');
    if (!['loaded', 'empty'].includes(loaded.status)) {
      notice.textContent = '저장된 용돈 정보를 불러오지 못했어요.';
      toolbar.replaceChildren(el('h2', 'pw-record-section-title', '기록 내역'), smallButton('다시 불러오기', () => { loaded = loadPocketWONState(); showList(); }));
    } else if (current.history === 'partial' || current.history === 'unavailable') notice.textContent = '일부 기록 정보를 확인할 수 없어요.';
    notice.hidden = !notice.textContent;
    const paging = el('nav', 'pw-record-pagination'); paging.setAttribute('aria-label', '기록 페이지');
    const previous = smallButton('이전', () => { page--; renderRows(); focusFirst(); });
    const pageLabel = el('p', 'pw-meta'); pageLabel.setAttribute('role', 'status');
    const next = smallButton('다음', () => { page++; renderRows(); focusFirst(); });
    paging.append(previous, pageLabel, next);
    history.append(notice, list, paging); root.append(summary, toolbar, history);

    function focusFirst() { list.querySelector('button')?.focus({ preventScroll: true }); }
    function renderRows() {
      const rows = current.rows, pages = Math.max(1, Math.ceil(rows.length / capacity));
      page = Math.max(1, Math.min(page, pages)); root.dataset.page = String(page); root.dataset.pageSize = String(capacity);
      list.replaceChildren();
      if (!rows.length) {
        const empty = el('li', 'pw-record-empty');
        empty.append(el('p', '', current.history === 'unavailable' ? '기록 정보를 확인할 수 없어요.' : '아직 기록이 없어요.'), el('p', 'pw-muted', '돈을 받거나 썼을 때 남겨보세요.'));
        list.append(empty);
      }
      for (const row of rows.slice((page - 1) * capacity, page * capacity)) {
        const item = el('li', 'pw-record-row');
        const trigger = button('', () => showDetail(row.sourceIndex), 'pw-record-row-button');
        trigger.dataset.sourceIndex = String(row.sourceIndex);
        const icon = el('span', 'pw-record-row-icon'); icon.innerHTML = pwIcon('record'); icon.setAttribute('aria-hidden', 'true');
        const description = el('span', 'pw-record-row-description');
        description.append(el('span', 'pw-record-row-title', row.title), el('span', 'pw-muted pw-record-row-date', [row.category !== row.title ? row.category : '', row.dateLabel].filter(Boolean).join(' · ')));
        const exact = row.valid ? `${row.type === 'in' ? '+' : '−'}${format.format(row.amount)}원` : '금액 확인 안 됨';
        const scale = row.amount >= 1e12 ? 1e12 : 1e8, unit = scale === 1e12 ? '조' : '억';
        const displayAmount = exact.length > 14 && row.valid ? `${row.type === 'in' ? '+' : '−'}${compact.format(row.amount / scale)}${unit}원` : exact;
        const amount = el('span', `pw-record-row-money${row.valid ? ` pw-record-row-money--${row.type}` : ''}`, displayAmount);
        trigger.setAttribute('aria-label', `${row.title}, ${row.dateLabel}, ${exact}, 상세 보기`);
        trigger.append(icon, description, amount); item.append(trigger); list.append(item);
      }
      previous.disabled = page <= 1; next.disabled = page >= pages;
      pageLabel.textContent = `${page} / ${pages}`;
    }
    function resizeList() {
      if (disposed || stage !== 'list' || !list?.isConnected) return;
      const newCapacity = Math.max(1, Math.min(6, Math.floor((list.clientHeight + 8) / 72)));
      if (newCapacity !== capacity) {
        const focusedRow = document.activeElement?.closest('[data-source-index]');
        const focusedSource = focusedRow && list.contains(focusedRow) ? Number(focusedRow.dataset.sourceIndex) : null;
        const focusedIndex = focusedSource === null ? -1 : current.rows.findIndex(row => row.sourceIndex === focusedSource);
        const anchor = focusedIndex >= 0 ? focusedIndex : (page - 1) * capacity; capacity = newCapacity;
        if (measured) page = Math.floor(anchor / capacity) + 1;
        measured = true; renderRows();
        if (focusedIndex >= 0) list.querySelector(`[data-source-index="${focusedSource}"]`)?.focus({ preventScroll: true });
      } else measured = true;
    }
    renderRows();
    if (mounted) {
      listObserver = new ResizeObserver(() => {
        cancelAnimationFrame(listFrame);
        listFrame = requestAnimationFrame(() => { listFrame = null; resizeList(); });
      });
      listObserver.observe(list); resizeList();
    }
    if (focusSource !== undefined) requestAnimationFrame(() => { if (!disposed && stage === 'list') list.querySelector(`[data-source-index="${focusSource}"]`)?.focus({ preventScroll: true }); });
    refreshMotion();
  }

  function showDetail(sourceIndex) {
    const row = model().rows.find(entry => entry.sourceIndex === sourceIndex); if (!row) return;
    stopPager(); stopList(); stage = 'detail';
    root.className = 'pw-screen pw-record pw-record-detail'; root.dataset.stage = stage;
    const header = el('div', 'pw-record-detail-header');
    header.append(smallButton('목록으로', () => showList(sourceIndex)), el('h2', 'pw-record-section-title', '기록 상세'));
    const details = el('section', 'pw-panel pw-record-detail-panel'); details.setAttribute('aria-label', '거래 상세');
    details.append(el('p', 'pw-muted', row.type === 'in' ? '받은 돈' : row.type === 'out' ? '쓴 돈' : '기록 확인'), el('p', 'pw-record-detail-money', row.valid ? `${format.format(row.amount)}원` : '금액 확인 안 됨'));
    const fullDate = row.dateValid ? row.timestamp : row.timestamp ? `${row.timestamp} (날짜 확인 안 됨)` : '날짜 확인 안 됨';
    textPager = PWUI.createTextPager(`분류: ${row.category || '확인 안 됨'}\n날짜: ${fullDate}\n메모: ${row.memo || '메모 없음'}`);
    textPager.element.classList.add('pw-record-detail-text'); details.append(textPager.element);
    root.replaceChildren(heading('기록 상세'), header, details);
    if (mounted) textPager.mount(); refreshMotion();
    requestAnimationFrame(() => { if (!disposed && stage === 'detail') header.querySelector('button')?.focus({ preventScroll: true }); });
  }

  function showResult(savedDraft) {
    stopPager(); stopList(); stage = 'result'; root.dataset.stage = stage;
    root.className = 'pw-screen pw-record pw-record-result';
    const panel = el('section', 'pw-panel pw-record-result-panel'); panel.setAttribute('role', 'status');
    panel.append(pwIllustrationPanel('record', { panelClass: 'pw-compact-visual pw-record-result-visual', ambient: false, idle: false }), el('h2', 'pw-record-result-title', '기록했어요.'), el('p', 'pw-muted', savedDraft.type === 'in' ? '받은 돈을 남겼어요.' : '쓴 돈을 남겼어요.'), money(Number(savedDraft.amount), 'pw-record-result-money'));
    root.replaceChildren(heading('기록 완료'), panel, button('기록 내역 보기', () => { page = 1; showList(); }));
    refreshMotion();
    if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.requestSuccess(root, 'record');
    requestAnimationFrame(() => { if (!disposed && stage === 'result') root.lastElementChild.focus({ preventScroll: true }); });
  }

  function cancelWizard() {
    stopWizardPager();
    wizard?.dismiss();
    draft = null; busy = false; composing = false;
    if (disposed) return;
    if (options.stage === 'form' && typeof navigate === 'function') navigate(options.returnTo || { screen: 'record', stage: 'list', page });
    else returnFocus?.focus({ preventScroll: true });
  }
  function checkDraft() {
    if (!['loaded', 'empty'].includes(validationLoad.status)) return { valid: false, errors: { form: '저장된 용돈 정보를 불러오지 못했어요. 다시 시도해주세요.' } };
    return validateRecordDraft(draft, validationLoad.state);
  }
  function steps() { return draft.type === 'out' ? ['type', 'amount', 'category', 'memo', 'confirm'] : ['type', 'amount', 'memo', 'confirm']; }
  function openWizard(event) {
    if (disposed || wizard?.dialog.open) return;
    returnFocus = event?.currentTarget || root.querySelector('.pw-record-add') || document.activeElement;
    validationLoad = loadPocketWONState();
    draft = { type: '', amount: '', category: '', memo: '' }; step = 'type'; busy = false; submitted = false;
    stopWizardPager(); wizard?.dispose(); wizard = PWUI.flow('돈 기록하기', cancelWizard); wizard.dialog.classList.add('pw-record-sheet');
    wizard.back.addEventListener('click', () => { if (!busy && draft) { step = steps()[Math.max(0, steps().indexOf(step) - 1)]; renderStep(); } });
    wizard.dialog.addEventListener('compositionstart', () => { composing = true; });
    wizard.dialog.addEventListener('compositionend', () => { composing = false; });
    wizard.dialog.addEventListener('keydown', event => { if (event.key === 'Enter' && (composing || event.isComposing || event.target.matches('input,textarea'))) event.preventDefault(); });
    if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.prepareSuccess();
    document.body.append(wizard.dialog); renderStep(); wizard.show(); focusStep();
  }
  function focusStep() {
    const active = wizard.body.querySelector('input:checked, input, button:not(:disabled)');
    (active || wizard.footer.querySelector('button'))?.focus({ preventScroll: true });
  }
  function renderStep() {
    if (!draft || !wizard) return;
    stopWizardPager();
    wizard.body.replaceChildren(); wizard.footer.replaceChildren();
    wizard.back.hidden = step === 'type';
    const order = steps(); wizard.progress.textContent = `${order.indexOf(step) + 1} / ${order.length}`;
    wizard.dialog.dataset.step = step;
    const field = el('div', `pw-record-field pw-record-field--${step}`), error = el('p', 'pw-error pw-record-error');
    error.id = step === 'confirm' ? 'pw-record-save-error' : `pw-${step}-error`; error.hidden = true; error.setAttribute('role', 'alert');
    let controls = [];
    const next = button(step === 'confirm' ? '기록 저장' : step === 'memo' && !draft.memo ? '건너뛰기' : '다음', () => {
      if (busy || submitted || !draft || composing) return;
      if (step === 'confirm') { saveDraft(error, next); return; }
      const checked = checkDraft(), message = checked.errors[step];
      if (message) { error.textContent = message; error.hidden = false; controls[0]?.focus({ preventScroll: true }); return; }
      step = steps()[steps().indexOf(step) + 1]; renderStep(); focusStep();
    });
    const update = () => {
      const checked = checkDraft(), message = checked.errors[step];
      next.disabled = busy || submitted || (step !== 'confirm' && !!message);
      if (step === 'memo') next.textContent = draft.memo ? '다음' : '건너뛰기';
      error.textContent = message || ''; error.hidden = !message;
      for (const control of controls) control.setAttribute('aria-invalid', message ? 'true' : 'false');
    };
    const choice = (name, value, label, className) => {
      const wrapper = el('label', className), input = el('input'); input.type = 'radio'; input.name = name; input.value = value;
      input.checked = (step === 'type' ? draft.type : draft.category) === value;
      input.setAttribute('aria-describedby', error.id); wrapper.append(input, el('span', '', label)); controls.push(input); return { wrapper, input };
    };
    if (step === 'type' || step === 'category') {
      const group = el('fieldset', 'pw-record-options'); group.append(el('legend', 'pw-label pw-record-label', step === 'type' ? '어떤 돈인가요?' : '어디에 썼나요?'));
      const options = el('div', step === 'type' ? 'pw-record-segments' : 'pw-record-chips');
      for (const value of step === 'type' ? ['in', 'out'] : PW_RECORD_CATEGORIES.out) {
        const item = choice(step === 'type' ? 'record-type' : 'record-category', value, step === 'type' ? value === 'in' ? '받은 돈' : '쓴 돈' : value, step === 'type' ? 'pw-record-choice' : 'pw-record-chip');
        item.input.addEventListener('change', () => {
          if (step === 'type') { if (draft.type !== item.input.value) { draft.type = item.input.value; draft.category = draft.type === 'in' ? '용돈' : ''; } }
          else draft.category = item.input.value;
          wizard.progress.textContent = `${steps().indexOf(step) + 1} / ${steps().length}`; update();
        }); options.append(item.wrapper);
      }
      group.append(options); field.append(group);
    } else if (step === 'amount' || step === 'memo') {
      const input = el('input', `pw-input pw-record-input${step === 'amount' ? ' pw-record-amount' : ''}`);
      input.type = 'text'; input.id = `pw-record-${step}`; input.value = draft[step]; input.autocomplete = 'off';
      if (step === 'amount') input.inputMode = 'numeric';
      const label = el('label', 'pw-label pw-record-label', step === 'amount' ? '얼마인가요?' : '메모를 남길까요?'); label.htmlFor = input.id;
      const help = el('p', 'pw-muted pw-record-help', step === 'amount' ? '원 단위로 숫자만 입력해주세요.' : '50자까지 적을 수 있어요. 건너뛰어도 괜찮아요.'); help.id = `pw-${step}-help`;
      input.placeholder = step === 'amount' ? '숫자로 입력' : '예: 학교 끝나고 간식'; input.setAttribute('aria-describedby', `${help.id} ${error.id}`); controls.push(input);
      field.append(label);
      if (step === 'amount') {
        const preview = el('p', 'pw-record-amount-preview'); preview.setAttribute('aria-hidden', 'true');
        const previewAmount = () => { const value = Number(draft.amount); preview.textContent = !draft.amount ? '0원' : /^[0-9]+$/.test(draft.amount) && Number.isSafeInteger(value) ? `${format.format(value)}원` : '금액 확인'; };
        previewAmount(); field.append(preview);
      }
      input.addEventListener('input', () => { draft[step] = input.value; update(); });
      // Update the preview after the draft is synchronized with the input.
      input.addEventListener('input', () => { if (step === 'amount') { const preview = field.querySelector('.pw-record-amount-preview'), value = Number(draft.amount); preview.textContent = !draft.amount ? '0원' : /^[0-9]+$/.test(draft.amount) && Number.isSafeInteger(value) ? `${format.format(value)}원` : '금액 확인'; } });
      field.append(input, help);
    } else {
      field.append(el('h3', 'pw-record-confirm-title', '이대로 기록할까요?'));
      const summary = [['종류', draft.type === 'in' ? '받은 돈' : '쓴 돈'], ['금액', `${format.format(Number(draft.amount))}원`], ['분류', draft.category], ['메모', draft.memo || '없음']].map(([label, value]) => `${label}: ${value}`).join('\n');
      wizardPager = PWUI.createTextPager(summary);
      wizardPager.element.classList.add('pw-record-confirm-summary');
      wizardPager.element.setAttribute('aria-label', '저장할 기록 확인');
      field.append(wizardPager.element);
    }
    field.append(error); wizard.body.append(field); wizard.footer.append(next);
    if (wizardPager) wizardPager.mount();
    // Initial untouched fields stay quiet; clicking or entering a value reveals errors.
    next.disabled = step !== 'confirm' && !!checkDraft().errors[step];
  }
  function saveDraft(error, save) {
    if (disposed || !wizard.dialog.open || !draft || busy || submitted) return;
    busy = true; save.disabled = true;
    validationLoad = loadPocketWONState();
    const checked = checkDraft();
    if (!checked.valid) {
      busy = false; save.disabled = false;
      error.textContent = checked.errors.form || checked.errors.amount || checked.errors.category || checked.errors.memo || checked.errors.type; error.hidden = false; error.parentElement.dataset.hasError = 'true'; return;
    }
    let nextState;
    try { nextState = applyTransaction(validationLoad.state, draft, new Date().toISOString()); } catch (_) { /* Normalized failure keeps the draft. */ }
    if (!nextState || persistPocketWONState(nextState).status !== 'saved') {
      busy = false; save.disabled = false; error.textContent = '기록을 저장하지 못했어요. 다시 시도해주세요.'; error.hidden = false; error.parentElement.dataset.hasError = 'true'; return;
    }
    submitted = true;
    const savedDraft = { ...draft }; loaded = { status: 'loaded', state: nextState }; validationLoad = loaded;
    stopWizardPager(); wizard.dismiss(); draft = null; busy = false; showResult(savedDraft);
  }
  showList();
  return {
    element: root,
    mount() {
      mounted = true;
      if (stage === 'list') showList(); else if (stage === 'detail') textPager?.mount();
      if (options.stage === 'form') openWizard();
    },
    dispose() { disposed = true; mounted = false; stopList(); stopPager(); stopWizardPager(); wizard?.dispose(); draft = null; },
  };
}
