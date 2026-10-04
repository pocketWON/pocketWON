/* Goal presentation and explicit-submit orchestration. Saving never contributes funds. */
function createGoalView(initialLoad, navigate, options = {}) {
  const { el, button, money, heading } = PWUI;
  const format = new Intl.NumberFormat('ko-KR');
  const root = el('div', 'pw-screen pw-goal');
  let loaded = initialLoad, mounted = false, disposed = false, flow = null, pager = null;
  let validationLoad, openedGoal, draft = null, editing = false, conflict = false;
  let touched = {}, step = 0, busy = false, submitted = false, saveError = '';
  let trigger = null, nameTrigger = null, pendingFocus = null, opener = null;

  function refresh() { if (mounted && root.isConnected) PWUI.refreshMotion(root); }
  function clearPager() { pager?.dispose(); pager = null; }
  function retry() { loaded = (window.PWDemo?.enabled ? PWDemo.load() : loadPocketWONState()); renderDetail(); }
  function appendMoney(parent, label, value, className = '') {
    const group = el('div', 'pw-goal-value');
    group.append(el('p', 'pw-meta pw-muted', label), money(value, `pw-goal-money ${className}`));
    parent.append(group);
  }
  function renderDetail() {
    clearPager(); root.replaceChildren(heading('목표'));
    root.dataset.stage = 'detail';
    const model = createGoalViewModel(loaded.state);
    const ready = ['loaded', 'empty'].includes(loaded.status);
    const valid = ready && ['active', 'complete'].includes(model.status);
    const panel = el('section', `pw-panel pw-goal-hero${valid ? '' : ' pw-goal-hero--empty'}`);
    panel.setAttribute('aria-labelledby', 'pw-goal-name');
    if (valid) {
      const title = el('h2', 'pw-goal-name'); title.id = 'pw-goal-name';
      nameTrigger = button(model.title, renderFullName, 'pw-goal-name-action');
      nameTrigger.setAttribute('aria-label', `목표 이름 전체 보기: ${model.title}`);
      const nameText = el('span', 'pw-goal-name-text', model.title);
      nameTrigger.replaceChildren(nameText); title.append(nameTrigger);
      const overview = el('div', 'pw-goal-overview');
      const graphic = pwIllustrationPanel('goal', { panelClass: 'pw-goal-visual', ambient: model.status === 'active', goalKey: pwSpriteGoalKey(model) });
      appendMoney(overview, '지금까지 모은 돈', model.current, 'pw-goal-money--large'); overview.append(graphic);
      const progressGroup = el('div', 'pw-goal-progress-group');
      const progress = el('div', 'pw-goal-progress');
      for (const [key, value] of Object.entries({ role: 'progressbar', 'aria-label': '목표 진행률', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': model.percent, 'aria-valuetext': `${model.percent}% 달성` })) progress.setAttribute(key, String(value));
      const fill = el('span', 'pw-goal-progress-fill'); fill.style.width = `${model.percent}%`; progress.append(fill);
      progressGroup.append(progress, el('p', 'pw-goal-percent pw-meta', model.status === 'complete' ? `목표 달성 · ${model.percent}%` : `${model.percent}% 진행`));
      const info = el('div', 'pw-goal-info');
      appendMoney(info, '목표 금액', model.target); appendMoney(info, '남은 금액', model.remaining);
      const notice = el('p', `pw-meta ${model.status === 'complete' ? 'pw-goal-complete' : 'pw-muted'}`, model.status === 'complete' ? '목표를 달성했어요!' : '저장된 목표 금액을 기준으로 보여드려요.');
      panel.append(title, overview, progressGroup, info, notice);
      trigger = button('목표 수정', openForm, 'pw-button');
    } else {
      const failed = !ready || model.status === 'invalid';
      const title = el('h2', 'pw-goal-empty-title', failed ? '목표 정보를 확인할 수 없어요.' : '아직 정한 목표가 없어요.'); title.id = 'pw-goal-name';
      panel.append(pwIllustrationPanel('goal', { panelClass: 'pw-goal-empty-visual', ambient: false }), title,
        el('p', 'pw-muted', failed ? '기존 정보는 그대로 보관하고 있어요. 다시 불러와 확인해주세요.' : '갖고 싶은 것을 하나 정해볼까요?'));
      trigger = button(failed ? '다시 불러오기' : '첫 목표 만들기', failed ? retry : openForm);
    }
    const actions = el('div', 'pw-goal-actions');
    actions.append(trigger, button('기록하러 가기', () => navigate('record', pwSpriteEntryMotion(root, actions, 'record')), 'pw-button pw-button--secondary'));
    root.append(panel, actions); refresh();
    if (pendingFocus === 'trigger') { pendingFocus = null; trigger.focus({ preventScroll: true }); }
    else if (pendingFocus === 'name') { pendingFocus = null; nameTrigger?.focus({ preventScroll: true }); }
  }
  function renderFullName() {
    const model = createGoalViewModel(loaded.state);
    clearPager(); root.replaceChildren(heading('목표 이름')); root.dataset.stage = 'name';
    const panel = el('section', 'pw-panel pw-goal-name-panel');
    panel.append(el('h2', 'pw-goal-empty-title', '목표 이름'));
    pager = PWUI.createTextPager(model.title); panel.append(pager.element);
    const back = button('목표로 돌아가기', () => { pendingFocus = 'name'; renderDetail(); }, 'pw-button pw-button--secondary');
    root.append(panel, back); if (mounted) pager.mount(); refresh(); back.focus({ preventScroll: true });
  }
  function check() {
    if (!['loaded', 'empty'].includes(validationLoad.status)) return { valid: false, errors: { form: '저장된 정보를 불러오지 못했어요. 다시 시도해주세요.' } };
    if (conflict) return { valid: false, errors: { form: '목표 정보가 바뀌었어요. 닫은 뒤 다시 열어 확인해주세요.' } };
    return validateGoalDraft(draft, validationLoad.state);
  }
  function cancelForm() {
    if (!flow) return;
    const closing = flow; flow = null; closing.dismiss(); closing.dispose();
    draft = null; busy = false;
    if (disposed) return;
    if (options.returnTo) { navigate(options.returnTo); return; }
    (opener?.isConnected ? opener : trigger)?.focus({ preventScroll: true });
  }
  function openForm(event) {
    if (disposed || flow) return;
    opener = event?.currentTarget || trigger || document.activeElement;
    if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.prepareSuccess();
    validationLoad = (window.PWDemo?.enabled ? PWDemo.load() : loadPocketWONState()); openedGoal = createGoalViewModel(validationLoad.state);
    editing = ['active', 'complete'].includes(openedGoal.status);
    draft = { title: editing ? openedGoal.title : '', target: editing ? String(openedGoal.target) : '' };
    touched = {}; step = 0; busy = false; submitted = false; conflict = false; saveError = '';
    flow = PWUI.flow(editing ? '목표 수정' : '목표 만들기', cancelForm);
    flow.dialog.classList.add('pw-goal-sheet'); flow.body.classList.add('pw-goal-fields'); flow.footer.classList.add('pw-goal-sheet-footer');
    flow.back.addEventListener('click', () => { if (step > 0 && !busy) { step -= 1; saveError = ''; renderStep(); } });
    // Text/IME confirmation cannot submit; a focused Save button keeps native
    // keyboard activation so the final explicit action remains accessible.
    flow.dialog.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229 || event.target.matches('input, textarea, select'))) event.preventDefault();
    });
    renderStep(false); flow.show(); focusStep();
  }
  function focusStep() {
    if (!flow) return;
    const control = flow.body.querySelector('input') || flow.footer.querySelector('button');
    control?.focus({ preventScroll: true });
  }
  function renderStep(focus = true) {
    if (!flow || !draft) return;
    flow.body.replaceChildren(); flow.footer.replaceChildren();
    flow.dialog.dataset.step = String(step);
    flow.progress.textContent = `${step + 1} / 3`;
    flow.back.disabled = step === 0 || busy;
    flow.back.setAttribute('aria-label', '이전 단계');
    const checked = check();
    flow.body.dataset.hasError = String(step === 2 && !!(saveError || checked.errors.form || checked.errors.title || checked.errors.target));
    const error = el('p', 'pw-error pw-goal-error'); error.id = 'pw-goal-step-error'; error.setAttribute('role', 'alert');
    let input, next;
    if (step < 2) {
      const key = step === 0 ? 'title' : 'target';
      const field = el('div', 'pw-goal-field');
      const caption = el('label', 'pw-label', key === 'title' ? '무엇을 모으고 있나요?' : '얼마가 필요하나요?'); caption.htmlFor = `pw-goal-${key}`;
      input = el('input', 'pw-input pw-goal-input'); input.id = caption.htmlFor; input.type = 'text'; input.autocomplete = 'off';
      input.placeholder = key === 'title' ? '예: 새 자전거' : '숫자로 입력'; input.value = draft[key];
      if (key === 'target') input.inputMode = 'numeric';
      input.setAttribute('aria-describedby', `pw-goal-${key}-help ${error.id}`);
      const help = el('p', 'pw-meta pw-muted', key === 'title' ? '30자까지 적을 수 있어요.'
        : editing ? `지금까지 모은 ${format.format(openedGoal.current)}원 이상으로, 숫자만 입력해주세요.` : '원 단위로 숫자만 입력해주세요.'); help.id = `pw-goal-${key}-help`;
      field.append(caption, input, help);
      const update = () => {
        const result = check(), message = result.errors.form || (touched[key] ? result.errors[key] : '') || '';
        error.textContent = message; error.hidden = !message; input.setAttribute('aria-invalid', touched[key] && result.errors[key] ? 'true' : 'false');
        next.disabled = busy || !!result.errors[key] || !!result.errors.form;
      };
      next = button('다음', () => { touched[key] = true; const result = check(); if (result.errors[key] || result.errors.form) { update(); return; } step += 1; saveError = ''; renderStep(); });
      input.addEventListener('input', () => { draft[key] = input.value; touched[key] = true; saveError = ''; update(); });
      flow.body.append(field, error); flow.footer.append(next); update();
    } else {
      const confirmation = el('section', 'pw-goal-confirm');
      confirmation.append(el('h3', 'pw-goal-empty-title', '이 목표로 저장할까요?'));
      const title = el('div', 'pw-goal-confirm-title'); title.append(el('p', 'pw-meta pw-muted', '목표 이름'), el('p', '', draft.title.trim()));
      confirmation.append(title); appendMoney(confirmation, '목표 금액', Number(draft.target), 'pw-goal-money--large');
      if (editing) confirmation.append(el('p', 'pw-meta pw-muted', `지금까지 모은 ${format.format(openedGoal.current)}원은 유지돼요.`));
      error.textContent = saveError || checked.errors.form || checked.errors.title || checked.errors.target || ''; error.hidden = !error.textContent;
      next = button('목표 저장', saveGoal); next.disabled = busy || submitted || !checked.valid;
       if(typeof PWPreview!=='undefined'&&PWPreview.readOnly){next.disabled=true;error.textContent='가상 데이터 화면에서는 실제 목표를 저장하지 않아요.';error.hidden=false;}
      next.setAttribute('aria-describedby', error.id); flow.body.append(confirmation, error); flow.footer.append(next);
    }
    if (focus) focusStep();
  }
  function saveGoal() {
    if (disposed || !flow?.dialog.open || !draft || step !== 2 || busy || submitted || !check().valid || (typeof PWPreview!=='undefined'&&PWPreview.readOnly)) return;
    busy = true; flow.footer.querySelector('button').disabled = true;
    validationLoad = (window.PWDemo?.enabled ? PWDemo.load() : loadPocketWONState()); const latest = createGoalViewModel(validationLoad.state);
    conflict = editing ? !['active', 'complete'].includes(latest.status) || latest.title !== openedGoal.title || latest.target !== openedGoal.target
      : latest.status !== openedGoal.status;
    const result = check();
    if (!result.valid) { busy = false; touched = { title: true, target: true }; renderStep(); return; }
    let nextState;
    try { nextState = applyGoalUpdate(validationLoad.state, draft); } catch (_) { /* Normalize without exposing stored payloads. */ }
    if (!nextState || persistPocketWONState(nextState).status !== 'saved') {
      busy = false; saveError = '목표를 저장하지 못했어요. 다시 시도해주세요.'; renderStep(); return;
    }
    submitted = true; loaded = { status: 'loaded', state: nextState };
    const closing = flow; flow = null; closing.dismiss(); closing.dispose(); draft = null;
    renderResult();
  }
  function renderResult() {
    clearPager(); root.replaceChildren(heading('목표 저장 완료')); root.dataset.stage = 'result';window.PWNavigation?.settle({screen:'goal'});
    const model = createGoalViewModel(loaded.state);
    const panel = el('section', 'pw-panel pw-goal-result');
    panel.append(pwIllustrationPanel('goal', { panelClass: 'pw-goal-result-visual', ambient: false, goalKey: pwSpriteGoalKey(model) }),
      el('h2', 'pw-goal-empty-title', editing ? '목표를 바꿨어요.' : '목표를 만들었어요.'), el('p', 'pw-muted', model.title));
    appendMoney(panel, '목표 금액', model.target, 'pw-goal-money--large');
    const next = button('목표 보기', () => { pendingFocus = 'trigger'; renderDetail(); }); root.append(panel, next);
    refresh();
    if (typeof PocketWONMotion !== 'undefined') PocketWONMotion.requestSuccess(root, 'goal', pwSpriteGoalKey(model));
    next.focus({ preventScroll: true });
  }
  renderDetail();
  return {
    element: root,
    mount() { mounted = true; if (options.stage === 'form') openForm(); },
    dispose() { disposed = true; mounted = false; clearPager(); if (flow) { const closing = flow; flow = null; closing.dismiss(); closing.dispose(); } draft = null; },
  };
}
