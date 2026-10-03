/* Goal presentation and explicit-submit orchestration. No contributions or auto writes. */
function createGoalView(initialLoad, navigate) {
  const format = new Intl.NumberFormat('ko-KR');
  const compact = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  let loaded = initialLoad, validationLoad = initialLoad, openedGoal, draft, touched;
  let disposed = false, busy = false, submitted = false, editing = false, conflict = false, feedbackTimer, frame;
  const moneyNodes = [];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = el('div', 'pw-goal');
  const intro = el('div', 'pw-goal-intro');
  const heading = el('h1', 'pw-type-h1', '목표'); heading.id = 'pw-screen-title';
  intro.append(heading, el('p', 'pw-goal-muted pw-type-body-small', '갖고 싶은 것을 정하고 조금씩 가까워져 보세요.'));
  const hero = el('section', 'pw-goal-hero'); hero.setAttribute('aria-labelledby', 'pw-goal-name');
  const trigger = el('button'); trigger.type = 'button';
  const feedback = el('p', 'pw-goal-feedback pw-type-body-small'); feedback.setAttribute('role', 'status');
  const next = el('div', 'pw-goal-next');
  const record = el('button', 'pw-goal-action', '기록하러 가기'); record.type = 'button';
  record.addEventListener('click', () => navigate('record'));
  next.append(el('p', 'pw-goal-muted pw-type-body-small', '돈을 받거나 썼다면 기록해보세요.'), record);
  root.append(intro, hero, feedback, next);

  function money(value, large = false) {
    const wrapper = el('div', `pw-goal-money${large ? ' pw-goal-money--large' : ''}`);
    wrapper.setAttribute('role', 'group'); wrapper.setAttribute('aria-label', `${format.format(value)}원`);
    const display = el('span', 'pw-goal-money-display'); display.setAttribute('aria-hidden', 'true');
    const digits = el('span', 'pw-goal-money-digits', format.format(value));
    const unit = el('span', 'pw-goal-money-unit', '원'); display.append(digits, unit);
    const exact = el('span', 'pw-goal-money-exact pw-type-caption', `${format.format(value)}원`); exact.setAttribute('aria-hidden', 'true'); exact.hidden = true;
    wrapper.append(display, exact); moneyNodes.push({ wrapper, display, digits, unit, exact, value }); return wrapper;
  }
  function fitAmounts() {
    if (!root.isConnected) return;
    for (const { wrapper, display, digits, unit, exact, value } of moneyNodes) {
      display.classList.remove('pw-goal-money-display--wrap');
      digits.textContent = format.format(value); unit.textContent = '원'; exact.hidden = true;
      const scales = [[1e4, '만'], [1e8, '억'], [1e12, '조'], [1e16, '경']];
      const naturalScale = Math.max(0, scales.findLastIndex(([scale]) => value >= scale));
      for (const [scale, suffix] of scales.slice(naturalScale)) {
        if (display.getBoundingClientRect().width <= wrapper.clientWidth + 0.05) break;
        // Never round a nonzero amount to zero. A larger unit can keep digits together.
        if (Math.round(value / scale * 10) < 1) continue;
        digits.textContent = compact.format(value / scale); unit.textContent = `${suffix}원`; exact.hidden = false;
      }
      display.classList.toggle('pw-goal-money-display--wrap', display.getBoundingClientRect().width > wrapper.clientWidth + 0.05);
    }
  }
  function scheduleFit() { cancelAnimationFrame(frame); frame = requestAnimationFrame(fitAmounts); }
  const widths = new WeakMap();
  const observer = new ResizeObserver(entries => {
    if (entries.some(entry => {
      const changed = widths.get(entry.target) !== entry.contentRect.width;
      widths.set(entry.target, entry.contentRect.width); return changed;
    })) scheduleFit();
  });
  function render() {
    observer.disconnect(); moneyNodes.length = 0; hero.replaceChildren();
    const model = createGoalViewModel(loaded.state);
    const valid = model.status === 'active' || model.status === 'complete';
    hero.classList.toggle('pw-goal-hero--empty', !valid);
    const name = el('h2', valid ? 'pw-goal-name pw-type-h2' : 'pw-type-h3', valid ? model.title : '아직 정한 목표가 없어요.'); name.id = 'pw-goal-name';
    if (valid) {
      hero.append(name, money(model.current, true), el('p', 'pw-goal-muted pw-type-body-small', '모았어요'));
      const progress = el('div', 'pw-goal-progress');
      for (const [key, value] of Object.entries({ role: 'progressbar', 'aria-label': '목표 진행률', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': model.percent, 'aria-valuetext': `${model.percent}% 달성` })) progress.setAttribute(key, String(value));
      const fill = el('span', 'pw-goal-progress-fill'); fill.style.width = `${model.percent}%`; progress.append(fill);
      hero.append(progress, el('p', 'pw-goal-percent pw-type-body-small', `${model.percent}% 달성`));
      const info = el('dl', 'pw-goal-info');
      for (const [label, value] of [['목표 금액', model.target], ['남은 금액', model.remaining]]) {
        const row = el('div'); const detail = el('dd'); detail.append(money(value));
        row.append(el('dt', 'pw-goal-muted pw-type-caption', label), detail); info.append(row);
      }
      hero.append(info);
      if (model.status === 'complete') {
        const complete = el('p', 'pw-goal-complete pw-type-body-small');
        const check = el('span', '', '✓'); check.setAttribute('aria-hidden', 'true');
        complete.append(check, document.createTextNode('목표를 달성했어요!')); hero.append(complete);
      }
    } else {
      const icon = el('span', 'pw-goal-empty-icon'); icon.innerHTML = pwIcon('goal'); icon.setAttribute('aria-hidden', 'true');
      hero.append(icon, name, el('p', 'pw-goal-muted pw-type-body-small', '갖고 싶은 것을 하나 정해볼까요?'));
      if (model.status === 'invalid' || !['loaded', 'empty'].includes(loaded.status)) {
        hero.append(el('p', 'pw-goal-error pw-type-body-small', '저장된 목표 정보를 확인할 수 없어요. 기존 정보는 그대로 보관하고 있어요.'));
      }
    }
    trigger.className = valid ? 'pw-goal-edit' : 'pw-button pw-goal-create';
    trigger.textContent = valid ? '목표 수정' : '첫 목표 만들기'; hero.append(trigger);
    for (const item of moneyNodes) observer.observe(item.wrapper);
    scheduleFit();
  }

  const dialog = el('dialog', 'pw-goal-sheet'); dialog.setAttribute('aria-labelledby', 'pw-goal-sheet-title');
  const header = el('div', 'pw-goal-sheet-header');
  const sheetTitle = el('h2', 'pw-type-h3'); sheetTitle.id = 'pw-goal-sheet-title';
  const close = el('button', 'pw-icon-button'); close.type = 'button'; close.setAttribute('aria-label', '목표 설정 닫기'); close.innerHTML = pwIcon('close');
  header.append(sheetTitle, close);
  const form = el('form', 'pw-goal-form'); form.noValidate = true;
  const body = el('div', 'pw-goal-fields');
  const controls = {}, errors = {};
  const preview = el('p', 'pw-goal-amount-preview'); preview.setAttribute('aria-hidden', 'true');
  for (const [key, label, placeholder, help] of [
    ['title', '무엇을 모으고 있나요?', '예: 새 자전거', '30자까지 적을 수 있어요.'],
    ['target', '얼마가 필요하나요?', '숫자로 입력', '원 단위로 숫자만 입력해주세요.'],
  ]) {
    const field = el('div', 'pw-goal-field');
    const caption = el('label', 'pw-goal-label', label); caption.htmlFor = `pw-goal-${key}`;
    const input = el('input', 'pw-goal-input'); input.id = caption.htmlFor; input.type = 'text'; input.placeholder = placeholder; input.autocomplete = 'off';
    if (key === 'target') input.inputMode = 'numeric';
    input.setAttribute('aria-describedby', `pw-goal-${key}-help pw-goal-${key}-error`);
    const hint = el('p', 'pw-goal-muted pw-type-caption', help); hint.id = `pw-goal-${key}-help`;
    const error = el('p', 'pw-goal-error pw-type-body-small'); error.id = `pw-goal-${key}-error`; error.hidden = true; error.setAttribute('aria-live', 'polite');
    field.append(caption); if (key === 'target') field.append(preview);
    field.append(input, hint, error); body.append(field); controls[key] = input; errors[key] = error;
  }
  const footer = el('div', 'pw-goal-sheet-footer');
  const formError = el('p', 'pw-goal-error pw-type-body-small'); formError.id = 'pw-goal-save-error'; formError.hidden = true; formError.setAttribute('role', 'alert');
  const save = el('button', 'pw-button', '목표 저장'); save.type = 'submit'; save.disabled = true; save.setAttribute('aria-describedby', formError.id);
  footer.append(formError, save); form.append(body, footer); dialog.append(header, form);
  function check() {
    if (!['loaded', 'empty'].includes(validationLoad.status)) return { valid: false, errors: { form: '저장된 정보를 불러오지 못했어요. 다시 시도해주세요.' } };
    if (conflict) return { valid: false, errors: { form: '목표 정보가 바뀌었어요. 닫은 뒤 다시 열어 확인해주세요.' } };
    return validateGoalDraft(draft, validationLoad.state);
  }
  function update(keepFormError = false) {
    const result = check(); save.disabled = busy || submitted || !result.valid;
    const value = /^[0-9]+$/.test(draft.target) ? Number(draft.target) : NaN;
    preview.textContent = !draft.target ? '0원' : Number.isSafeInteger(value) ? `${format.format(value)}원` : '금액 확인';
    for (const key of ['title', 'target']) {
      const message = touched[key] ? result.errors[key] || '' : '';
      errors[key].textContent = message; errors[key].hidden = !message; controls[key].setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (!keepFormError) { formError.textContent = result.errors.form || ''; formError.hidden = !formError.textContent; }
  }
  function fitViewport() {
    const viewport = window.visualViewport;
    dialog.style.setProperty('--goal-viewport-height', `${viewport ? viewport.height : innerHeight}px`);
    dialog.style.setProperty('--goal-viewport-bottom', `${viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0}px`);
  }
  function closeSheet() { if (dialog.open) dialog.close(); }
  trigger.addEventListener('click', () => {
    if (disposed || dialog.open) return;
    validationLoad = loadPocketWONState(); openedGoal = createGoalViewModel(validationLoad.state);
    editing = ['active', 'complete'].includes(openedGoal.status);
    draft = { title: editing ? openedGoal.title : '', target: editing ? String(openedGoal.target) : '' };
    touched = {}; busy = false; submitted = false; conflict = false;
    sheetTitle.textContent = editing ? '목표 수정' : '목표 만들기';
    for (const key of ['title', 'target']) controls[key].value = draft[key];
    feedback.textContent = ''; update(); fitViewport(); dialog.showModal(); body.scrollTop = 0; controls.title.focus({ preventScroll: true });
  });
  for (const key of ['title', 'target']) controls[key].addEventListener('input', () => {
    draft[key] = controls[key].value; touched[key] = true; update();
  });
  close.addEventListener('click', closeSheet);
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    draft = null; busy = false; if (!disposed) trigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const nodes = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  form.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target !== save) event.preventDefault(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (disposed || !dialog.open || !draft || busy || submitted || save.disabled) return;
    busy = true; save.disabled = true; validationLoad = loadPocketWONState();
    const latest = createGoalViewModel(validationLoad.state);
    conflict = editing ? !['active', 'complete'].includes(latest.status) || latest.title !== openedGoal.title || latest.target !== openedGoal.target
      : latest.status !== openedGoal.status;
    const result = check();
    if (!result.valid) { busy = false; touched = { title: true, target: true }; update(); return; }
    let nextState;
    try { nextState = applyGoalUpdate(validationLoad.state, draft); } catch (_) { /* Normalize without exposing payloads. */ }
    if (!nextState || persistPocketWONState(nextState).status !== 'saved') {
      busy = false; formError.textContent = '목표를 저장하지 못했어요. 다시 시도해주세요.'; formError.hidden = false; update(true); return;
    }
    submitted = true; loaded = { status: 'loaded', state: nextState }; render(); closeSheet();
    feedback.textContent = editing ? '목표를 바꿨어요.' : '목표를 만들었어요.';
    clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => { feedback.textContent = ''; }, 4000);
  });
  render();
  return {
    element: root,
    mount() { document.body.append(dialog); fitAmounts(); document.fonts.ready.then(scheduleFit); window.visualViewport?.addEventListener('resize', fitViewport); window.visualViewport?.addEventListener('scroll', fitViewport); window.addEventListener('resize', fitViewport); },
    dispose() { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(feedbackTimer); closeSheet(); dialog.remove(); window.visualViewport?.removeEventListener('resize', fitViewport); window.visualViewport?.removeEventListener('scroll', fitViewport); window.removeEventListener('resize', fitViewport); },
  };
}
