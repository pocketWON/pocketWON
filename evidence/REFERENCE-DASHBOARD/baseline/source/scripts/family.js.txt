/* Family views are read-only. Connection, sharing and permissions are UI previews. */
(() => {
  const U = PWFeatureUI;
  const permissionLabels = ['습관 요약 보기', '목표 보기', '약속 만들기', '보상 확인', '계획 함께 만들기'];
  const text = (value, fallback = '준비 중') => typeof value === 'string' && value.trim() ? value : fallback;
  const route = id => ({ screen: 'feature', featureId: id });

  function setup(id, loaded, navigate, options) {
    const page = U.page(id, loaded, navigate, options);
    const sheets = new Set();
    page.element.classList.add('pw-family');
    page.onDispose(() => { for (const flow of sheets) flow.dispose(); });
    page.openSheet = (title, render, opener) => {
      const flow = U.sheet(title, active => {
        active.dialog.classList.add('pw-family-sheet');
        render(active);
      }, opener);
      sheets.add(flow);flow.onDispose(()=>sheets.delete(flow));
      return flow;
    };
    page.body.append(U.notice('화면 미리보기예요. 입력과 선택은 실제 저장하지 않으며, 부모님에게 보내거나 연결하지 않아요.'));
    return page;
  }

  function previewControls(page, id, loaded, refresh) {
    if (!PWPreview.enabled) return null;
    const state = U.select('개발용 공통 화면 상태', [
      ['success', '예제 결과'], ['preparing', '준비 중'], ['empty', '빈 화면'], ['error', '오류'], ['loading', '로딩 화면']
    ], page.vm.aiState, value => {
      PWPreview.select(id, value);
      page.vm = PWFeatureProviders.get(id, loaded);
      refresh();
    });
    page.body.append(U.accordion('개발용 상태 확인', [state.element, '예제 데이터와 상태만 바뀌며 실제 연결·분석·저장은 하지 않아요.']));
    return state.input;
  }

  function unavailable(page, id, title, description, refresh) {
    const node = U.state(page.vm, { profile: PW_FEATURES[id].profile, title, description });
    if (page.vm.aiState === 'error') node.append(U.action('준비 화면 다시 보기', () => {
      PWPreview.select(id, 'preparing');
      page.vm = PWFeatureProviders.get(id, page.loaded);
      refresh();
    }, true));
    return node;
  }

  function goalCard(goal, title = '이 기기에 저장된 목표 · 읽기 전용') {
    if (!['active', 'complete'].includes(goal.status)) return U.card(title,
      U.el('p', 'pw-muted', goal.status === 'empty' ? '아직 저장된 목표가 없어요.' : '저장된 목표를 확인할 수 없어요.'),
      U.el('p', 'pw-meta', '새 목표나 목표 평가를 만들지 않아요.'));
    return U.card(title, U.row('목표', goal.title), U.row('모은 금액', U.money(goal.current)),
      U.row('목표 금액', U.money(goal.target)), U.meter(goal.percent, '저장된 목표 진행률'),
      U.el('p', 'pw-meta', '기존 목표 하나의 저장된 값만 보여줘요. 자동 평가나 보상 판단은 하지 않아요.'));
  }

  function list(values, fallback) {
    const items = Array.isArray(values) ? values.filter(item => typeof item === 'string') : [];
    const node = U.el('ul', 'pw-family-list');
    for (const item of items) node.append(U.el('li', '', item));
    return items.length ? node : U.el('p', 'pw-muted', fallback);
  }

  PWFeatureViews['parent-view'] = (loaded, navigate, options = {}) => {
    const id = 'parent-view', page = setup(id, loaded, navigate, options);
    const goal = loaded?.status === 'loaded' ? createGoalViewModel(loaded.state)
      : { status: loaded?.status === 'empty' ? 'empty' : 'invalid' };
    page.body.append(U.periodControl(),U.card('같은 기기에서 함께 보기',
      U.el('p', '', '아이와 부모님이 이 화면을 함께 보며 이야기할 수 있어요.'),
      U.row('기간', '확인 안 됨'),
      U.el('p', 'pw-muted', '부모님 연결이 필요 없는 안내 화면이에요. 개별 거래 목록이나 감시 화면은 제공하지 않아요.')),
      goalCard(goal));
    const aiSlot = U.el('div', 'pw-family-stack');
    let stateInput;
    function renderAI() {
      if (stateInput) stateInput.value = page.vm.aiState;
      if (!U.ready(page.vm)) {
        aiSlot.replaceChildren(unavailable(page, id, 'AI 부모 요약은 준비 중이에요',
          '실제 AI 요약이나 평가가 없어요. 금융 기록을 AI나 부모님에게 보내지 않아요.', renderAI),
          U.card('함께 이야기할 요약 슬롯', U.row('AI 요약', '준비 중 · 평가 없음'),
            U.row('하이라이트', '준비 중'), U.row('잘한 점', '준비 중 · 평가 없음'),
            U.row('대화 주제', '준비 중'), U.row('다음 계획', '준비 중')));
        return;
      }
      const data = page.vm.data;
      const nodes = [U.notice('아래는 통합 개발용 fixture의 별도 부모 요약 예시예요. 위의 저장된 목표를 분석한 결과가 아니에요.'),
        U.card('예제 AI 부모 요약', U.row('예제 기간', text(data.period, '예제 기간 준비 중')),
          U.el('p', '', text(data.summary, '예제 요약 슬롯 준비 중'))),
        U.card('예제 하이라이트', list(data.highlights, '예제 하이라이트 준비 중')),
        U.card('예제 잘한 점', list(data.strengths, '예제 잘한 점 슬롯 준비 중 · 실제 평가 없음')),
        U.card('예제 대화 주제', list(data.conversationTopics, '예제 대화 주제 준비 중')),
        U.card('예제 다음 계획', U.el('p', '', text(data.nextPlan, '예제 계획 슬롯 준비 중')))];
      if (data.goalProgress && pwMoney(data.goalProgress.current) && pwMoney(data.goalProgress.target) && data.goalProgress.target > 0) {
        nodes.splice(2, 0, U.card('별도 예제 목표', U.row('예제 목표 이름', text(data.goalProgress.title)),
          U.row('예제 모은 금액', U.money(data.goalProgress.current)), U.row('예제 목표 금액', U.money(data.goalProgress.target))));
      }
      aiSlot.replaceChildren(...nodes);
    }
    page.body.append(aiSlot);
    stateInput = previewControls(page, id, loaded, renderAI);
    renderAI();
    page.body.append(U.card('개인정보와 공유 범위',
      U.el('p', 'pw-muted', 'AI 전송과 부모님 공유는 아직 연결되지 않았어요. 보호자 동의와 공유 범위는 정책 확정 후 표시할 예정이에요.'),
      U.link('개인정보·동의 안내', 'privacy', navigate, route(id))));
    const result = U.el('p', 'pw-meta');
    result.setAttribute('role', 'status');
    page.body.append(result);
    const share = U.action('함께 보기 공유 화면 미리보기', event => page.openSheet('함께 보기 공유 미리보기', flow => {
      flow.body.append(pwIllustration('all', { className: 'pw-family-sheet-art' }),
        U.notice('실제 공유·전송·링크 생성은 하지 않아요. 같은 기기에서 확인하는 화면 예시예요.'),
        U.card('공유 화면에 표시할 내용', U.row('기간', '확인 안 됨'),
          U.row('기존 목표', ['active', 'complete'].includes(goal.status) ? goal.title : goal.status === 'empty' ? '저장된 목표 없음' : '확인 안 됨'),
          U.row('AI 요약·잘한 점', '준비 중 · 실제 평가 없음'), U.row('공유 대상', '선택하거나 전송하지 않아요')));
      flow.footer.append(U.action('임시 화면 확인', () => {
        result.textContent = '임시 화면에서 확인했어요. 실제 공유나 저장은 하지 않았어요.';
        flow.close.click();
      }), U.action('닫기', () => flow.close.click(), true));
    }, event.currentTarget));
    page.footer.append(share);
    page.body.append(U.card('함께 정할 다음 이야기',
      U.link('칭찬·보상 약속 보기', 'rewards', navigate, route(id)),
      U.link('다음 용돈·목표 계획 보기', 'next-plan', navigate, route(id))));
    return page;
  };

  PWFeatureViews['family-connection'] = (loaded, navigate, options = {}) => {
    const id = 'family-connection', page = setup(id, loaded, navigate, options);
    let connectionState = U.ready(page.vm) && page.vm.data.status === 'connected' ? 'connected' : 'unavailable';
    let method = 'code', stateInput, connectionInput;
    const statusSlot = U.el('div', 'pw-family-stack');
    const result = U.el('p', 'pw-meta');
    result.setAttribute('role', 'status');
    page.body.append(U.card('부모님 연결 안내',
      U.el('p', '', '부모님과 연결하는 기능은 아직 사용할 수 없어요.'),
      U.el('p', 'pw-muted', '연결 코드·QR·초대 링크를 만들지 않으며 권한이나 인증을 요청하지 않아요.')));
    const methodSelect = U.select('연결 방식의 설명 선택', [['code', '코드'], ['qr', 'QR'], ['link', '초대 링크']], method, value => { method = value; renderMethod(); });
    const methodSlot = U.el('div', 'pw-family-placeholder');
    function renderMethod() {
      const label = { code: '연결 코드', qr: '연결 QR', link: '초대 링크' }[method];
      methodSlot.replaceChildren(U.el('strong', '', label + ' 준비 중'),
        U.el('p', 'pw-muted', '이곳은 설명용 자리예요. 실제 코드·QR·링크는 표시하거나 생성하지 않아요.'));
    }
    page.body.append(U.card('연결 방식 미리보기', methodSelect.element, methodSlot,
      U.action('선택한 방식 안내 보기', event => page.openSheet('부모님 연결 방식 안내', flow => {
        flow.body.append(U.notice('실제 연결이 아닌 설명 화면이에요.'),
          U.row('선택한 방식', { code: '코드', qr: 'QR', link: '초대 링크' }[method]),
          U.el('p', 'pw-muted', '연결과 보호자 확인 절차가 준비되면 안내할 예정이에요. 지금은 어떤 연결 정보도 생성하지 않아요.'));
        flow.footer.append(U.action('안내 확인', () => flow.close.click()));
      }, event.currentTarget), true)));
    renderMethod();
    function renderConnection() {
      if (!U.ready(page.vm)) connectionState = page.vm.aiState === 'error' ? 'error'
        : page.vm.aiState === 'loading' ? 'pending' : 'unavailable';
      if (stateInput) stateInput.value = page.vm.aiState;
      if (connectionInput) connectionInput.value = connectionState;
      const labels = { unavailable: '미연결', pending: '연결을 기다리는 모양', connected: '연결된 모양', error: '연결 오류의 모양' };
      const status = U.card(PWPreview.enabled ? '연결 UI 미리보기' : '현재 연결 상태',
        U.row('상태', labels[connectionState]),
        U.el('p', 'pw-muted', PWPreview.enabled ? '실제 연결이 아니에요. 개발용 상태 화면만 확인해요.' : '아직 연결된 보호자가 없어요.'));
      const nodes = [status];
      if (!U.ready(page.vm)) nodes.push(unavailable(page, id, page.vm.aiState === 'error' ? '연결 오류 화면 예시' : '부모님 연결은 준비 중이에요',
        '실제 연결 요청이나 전송 없이 준비·빈 화면·오류의 모양만 확인해요.', renderConnection));
      if (PWPreview.enabled && connectionState === 'connected' && U.ready(page.vm)) {
        const guardians = Array.isArray(page.vm.data.guardians) ? page.vm.data.guardians : [];
        for (const guardian of guardians) {
          nodes.push(U.card('개발용 보호자 예제 · 실제 연결 아님', U.row('이름', text(guardian.name)),
            U.row('역할', text(guardian.role)), U.row('마지막 확인', text(guardian.lastSeen, '예제 확인 정보 없음')),
            U.row('권한', '공유 범위 UI에서만 확인 · 실제 권한 없음'),
            U.link('권한 관리 미리보기', 'family-permissions', navigate, route(id)),
            U.action('연결 해제 화면 미리보기', event => page.openSheet('연결 해제 확인 미리보기', flow => {
              flow.body.append(U.notice('개발용 연결 해제 UI예요. 실제 가족 연결이나 권한을 바꾸지 않아요.'),
                U.row('예제 대상', text(guardian.name)), U.el('p', 'pw-muted', '확인하면 미연결 화면의 모양으로만 바뀌어요.'));
              flow.footer.append(U.action('임시 해제 화면 확인', () => {
                flow.close.click();
                connectionState = 'unavailable';
                PWPreview.select(id, 'unavailable');
                page.vm = PWFeatureProviders.get(id, loaded);
                renderConnection();
                result.textContent = '임시 화면에서 확인했어요. 실제 연결을 해제하지 않았어요.';
                methodSelect.input.focus();
              }), U.action('취소', () => flow.close.click(), true));
            }, event.currentTarget), true)));
        }
        if (!guardians.length) nodes.push(U.card('보호자 정보 슬롯', U.row('이름·역할·마지막 확인·권한', '예제 데이터 준비 중')));
      } else nodes.push(U.card('보호자 정보 슬롯', U.row('이름', '연결된 보호자 없음'), U.row('역할', '준비 중'),
        U.row('마지막 확인', '확인 안 됨'), U.row('권한', '확정된 권한 없음')));
      statusSlot.replaceChildren(...nodes);
    }
    page.body.append(statusSlot);
    stateInput = previewControls(page, id, loaded, () => {
      connectionState = U.ready(page.vm) && page.vm.data.status === 'connected' ? 'connected'
        : page.vm.aiState === 'error' ? 'error' : page.vm.aiState === 'loading' ? 'pending' : 'unavailable';
      renderConnection();
    });
    if (PWPreview.enabled) {
      const control = U.select('개발용 연결 UI 상태 · 실제 연결 아님', [
        ['unavailable', '미연결'], ['pending', '연결 대기 예시'], ['connected', '연결된 모양 예시'], ['error', '오류 예시']
      ], connectionState, value => {
        connectionState = value;
        PWPreview.select(id, { unavailable: 'unavailable', pending: 'loading', connected: 'success', error: 'error' }[value]);
        page.vm = PWFeatureProviders.get(id, loaded);
        renderConnection();
      });
      connectionInput = control.input;
      page.body.append(U.card('개발용 연결 상태 선택', control.element,
        U.el('p', 'pw-muted', '예제 보호자는 통합 fixture에서만 읽으며 실제 연결된 사람이 아니에요.')));
    }
    page.body.append(result);
    page.footer.append(U.link('가족·권한 관리 보기', 'family-permissions', navigate, route(id)));
    renderConnection();
    return page;
  };

  PWFeatureViews['family-permissions'] = (loaded, navigate, options = {}) => {
    const id = 'family-permissions', page = setup(id, loaded, navigate, options);
    const choices = Object.fromEntries(permissionLabels.map(label => [label, false]));
    page.body.append(U.card('함께 볼 수 있는 범위의 미리보기',
      U.el('p', 'pw-muted', '공유 정책과 보호자 동의는 아직 확정되지 않았어요. 아래 선택은 실제 권한으로 저장하거나 적용하지 않아요.'),
      U.el('p', '', '개별 거래 목록·전체 거래 열람 권한은 제공하지 않아요.')));
    const exampleSlot = U.el('div', 'pw-family-stack');
    let stateInput;
    function renderExamples() {
      if (stateInput) stateInput.value = page.vm.aiState;
      if (!U.ready(page.vm)) {
        exampleSlot.replaceChildren(unavailable(page, id, '가족 권한 정보는 준비 중이에요',
          '연결된 보호자나 확정된 권한이 없어요. 공유 범위의 UI만 살펴볼 수 있어요.', renderExamples));
        return;
      }
      const guardians = Array.isArray(page.vm.data.guardians) ? page.vm.data.guardians : [];
      const labels = Array.isArray(page.vm.data.permissions) ? page.vm.data.permissions.filter(value => permissionLabels.includes(value)) : [];
      exampleSlot.replaceChildren(U.card('개발용 가족·권한 예제 · 실제 권한 아님',
        ...guardians.map(guardian => U.row('예제 보호자', text(guardian.name) + ' · ' + text(guardian.role))),
        U.row('예제 범위', labels.length ? labels.join(', ') : '예제 권한 없음'),
        U.el('p', 'pw-meta', '아래 임시 선택에 예제 데이터를 합치지 않아요.')));
    }
    page.body.append(exampleSlot);
    stateInput = previewControls(page, id, loaded, renderExamples);
    const result = U.el('p', 'pw-meta');
    result.setAttribute('role', 'status');
    page.body.append(U.card('공유 범위 선택 UI · 실제 저장 안 됨', ...permissionLabels.map(label => U.toggle(label, false, value => { choices[label] = value; }))), result);
    const confirm = U.action('선택한 범위 미리보기', event => page.openSheet('공유 범위 확인 미리보기', flow => {
      const selected = permissionLabels.filter(label => choices[label]);
      flow.body.append(U.notice('실제 보호자 권한이나 공유 범위를 바꾸지 않아요.'),
        U.card('임시로 선택한 범위', list(selected, '선택한 범위가 없어요.')),
        U.el('p', 'pw-muted', '개별 거래·전체 거래 열람은 선택할 수 없어요. 정책 확정 후 실제 범위를 안내할 예정이에요.'));
      flow.footer.append(U.action('임시 화면 확인', () => {
        result.textContent = '임시 화면에서 확인했어요. 실제 권한 적용이나 저장은 하지 않았어요.';
        flow.close.click();
      }), U.action('취소', () => flow.close.click(), true));
    }, event.currentTarget));
    page.footer.append(confirm);
    page.body.append(U.card('연결과 개인정보 안내', U.link('부모님 연결 안내', 'family-connection', navigate, route(id)),
      U.link('개인정보·동의 안내', 'privacy', navigate, route(id))));
    renderExamples();
    return page;
  };
})();
