/* Settings are explanatory previews and read-only native-core projections. */
(() => {
  const U = PWFeatureUI;
  const route = id => ({ screen: 'feature', featureId: id });
  const source = loaded => loaded?.status === 'loaded' ? loaded.state : null;
  const storageLabel = loaded => loaded?.status === 'loaded' ? '이 기기에 저장됨'
    : loaded?.status === 'empty' ? '아직 기록 없음' : '확인 안 됨';

  function setup(id, loaded, navigate, options) {
    const page = U.page(id, loaded, navigate, options), sheets = new Set();
    page.element.classList.add('pw-settings');
    page.onDispose(() => { for (const flow of sheets) flow.dispose(); });
    page.openSheet = (title, render, opener) => {
      const flow = U.sheet(title, active => { active.dialog.classList.add('pw-settings-sheet'); render(active); }, opener);
      sheets.add(flow);flow.onDispose(()=>sheets.delete(flow));
      return flow;
    };
    page.body.append(U.notice('미리보기 화면이에요. 입력·선택·확인은 실제 저장이나 요청 전송을 하지 않아요. 기존 저장 정보는 읽기 전용으로만 표시해요.'));
    return page;
  }
  function live() { const node = U.el('p', 'pw-meta'); node.setAttribute('role', 'status'); return node; }
  function explain(page, title, description, opener, ...nodes) {
    return page.openSheet(title, flow => {
      flow.body.append(U.notice('설명 화면 미리보기예요. 실제 설정·권한·인증·서버 요청은 없어요.'),
        U.el('p', '', description), ...nodes);
      flow.footer.append(U.action('안내 확인', () => flow.close.click()));
    }, opener);
  }
  function confirmPreview(page, title, description, result, opener, finalCopy, ...nodes) {
    return page.openSheet(title, flow => {
      flow.body.append(U.notice('실제 처리는 하지 않는 확인 UI예요.'), U.el('p', '', description), ...nodes);
      flow.footer.append(U.action('임시 확인 화면 확인', () => {
        result.textContent = '임시 화면에서 확인했어요. ' + finalCopy;
        flow.close.click();
      }), U.action('취소', () => flow.close.click(), true));
    }, opener);
  }
  function commonPreview(page, id, loaded, description) {
    if (!PWPreview.enabled) return;
    const slot = U.el('div', 'pw-settings-stack');
    const control = U.select('개발용 공통 화면 상태', [['success', '기본 화면 예시'], ['preparing', '준비 중'], ['empty', '빈 화면'], ['error', '오류']], page.vm.aiState, value => {
      PWPreview.select(id, value); page.vm = PWFeatureProviders.get(id, loaded); paint();
    });
    function paint() {
      control.input.value = page.vm.aiState;
      if (U.ready(page.vm)) { slot.replaceChildren(U.el('p', 'pw-meta', '개발용 기본 화면이에요. 실제 사용자·정책·서비스 데이터를 만들지 않아요.')); return; }
      const state = U.state(page.vm, { profile: PW_FEATURES[id].profile,
        title: page.vm.aiState === 'error' ? '오류 화면의 개발용 예시' : page.vm.aiState === 'empty' ? '빈 화면의 개발용 예시' : '준비 화면의 개발용 예시', description });
      if (page.vm.aiState === 'error') state.append(U.action('준비 화면 다시 보기', () => {
        PWPreview.select(id, 'preparing'); page.vm = PWFeatureProviders.get(id, loaded); paint();
      }, true));
      slot.replaceChildren(state);
    }
    page.body.append(U.accordion('개발용 상태 확인', [control.element, '이 상태는 아래의 기존 저장 정보와 별개이며 실제 데이터를 바꾸지 않아요.']), slot);
    paint();
  }

  PWFeatureViews.profile = (loaded, navigate, options = {}) => {
    const page = setup('profile', loaded, navigate, options);
    const model = createHomeViewModel(source(loaded));
    const name = model.greeting.name;
    const nameLabel = loaded?.status === 'loaded' ? name || '저장된 이름 없음'
      : loaded?.status === 'empty' ? '아직 저장된 이름 없음' : '이름 확인 안 됨';
    page.body.append(U.card('기존 저장 프로필 · 읽기 전용', U.row('표시 이름', nameLabel),
      U.row('저장 정보 상태', storageLabel(loaded)), U.row('사용 유형', '준비 중'), U.row('가입 정보', '준비 중'),
      U.el('p', 'pw-meta', '기존 createHomeViewModel의 greeting.name만 읽어 보여줘요. 개발용 fixture 이름을 합치거나 사용자·금융 저장 정보를 바꾸지 않아요.')));
    commonPreview(page, 'profile', loaded, '프로필 변경 기능은 준비 중이에요. 기존 저장 이름은 위에서 읽기 전용으로 확인해요.');
    const draftSlot = U.el('div', 'pw-settings-stack'), result = live();
    function paintDraft() {
      const draft = PWFeatureDrafts.profile;
      draftSlot.replaceChildren(draft ? U.card('임시로 확인한 이름 · 실제 프로필 아님', U.row('직접 입력한 예시', draft.displayName),
        U.el('p', 'pw-meta', '이 브라우저 메모리에만 남으며 새로고침하면 초기화돼요. 위의 저장된 이름은 바뀌지 않아요.'))
        : U.card('프로필 변경 화면 미리보기', U.el('p', 'pw-muted', '변경할 이름을 임시 예시로 입력하고 확인하는 UI예요. 실제 저장은 하지 않아요.')));
    }
    page.body.append(draftSlot, result, U.link('개인정보·동의 보기', 'privacy', navigate, route('profile')));
    const edit = U.action('이름 변경 화면 미리보기', event => {
      let value = PWFeatureDrafts.profile?.displayName || '';
      page.openSheet('프로필 이름 임시 예시 입력', flow => {
        let stage = 'form';
        flow.progress.hidden = false;
        flow.back.addEventListener('click', () => { if (stage === 'review') formStep(); });
        function formStep() {
          stage = 'form'; flow.back.hidden = true; flow.progress.textContent = '1 / 2 · 임시 입력';
          const form = U.el('form', 'pw-settings-form'); form.noValidate = true;
          const field = U.field('변경할 표시 이름 · 임시 예시', value, 'text', next => { value = next; });
          field.input.maxLength = 40;
          const error = U.el('p', 'pw-error'); error.setAttribute('role', 'alert'); error.id = field.input.id + '-error';
          field.input.setAttribute('aria-describedby', error.id);
          form.id = field.input.id + '-form'; form.append(field.element, error);
          form.addEventListener('submit', submitEvent => {
            submitEvent.preventDefault();
            if (!value.trim() || Array.from(value.trim()).length > 40) {
              field.input.setAttribute('aria-invalid', 'true'); error.textContent = '표시 이름을 1~40자로 적어주세요.'; field.input.focus(); return;
            }
            value = value.trim(); reviewStep();
          });
          const submit = U.action('입력한 이름 확인', null); submit.type = 'submit'; submit.setAttribute('form', form.id);
          flow.body.replaceChildren(U.notice('금융 저장 키나 실제 사용자 정보는 바꾸지 않아요. 이 입력은 임시 예시예요.'), form);
          flow.footer.replaceChildren(submit, U.action('취소', () => flow.close.click(), true));
          if (flow.dialog.open) field.input.focus();
        }
        function reviewStep() {
          stage = 'review'; flow.back.hidden = false; flow.progress.textContent = '2 / 2 · 변경 UI 확인';
          flow.body.replaceChildren(U.notice('확인해도 실제 이름은 저장하지 않아요.'), U.card('임시 이름 확인', U.row('입력한 이름', value)));
          const confirm = U.action('임시 이름 화면 확인', () => {
            PWFeatureDrafts.profile = { displayName: value };
            flow.close.click(); paintDraft(); result.textContent = '임시 화면에서 확인했어요. 기존 이름이나 사용자 정보는 바꾸지 않았어요.'; edit.focus();
          });
          flow.footer.replaceChildren(confirm, U.action('다시 입력', formStep, true)); confirm.focus();
        }
        formStep();
      }, event.currentTarget);
    });
    page.footer.append(edit); paintDraft();
    return page;
  };

  PWFeatureViews.settings = (loaded, navigate, options = {}) => {
    const page = setup('settings', loaded, navigate, options), backTo = route('settings');
    page.body.append(U.card('사용', U.link('내 프로필', 'profile', navigate, backTo),
      U.action('기록·목표 이용 안내', event => explain(page, '기록·목표 이용 안내',
        '현재 기록과 목표는 이 기기의 기존 화면에서 확인해요. 이 설정 화면에서 기록·금액·목표를 수정하거나 저장하지 않아요.', event.currentTarget), true)),
      U.card('알림', U.link('알림 설정 미리보기', 'notification-settings', navigate, backTo),
        U.el('p', 'pw-meta', '실제 푸시 알림 권한이나 알림 서버는 연결되지 않았어요.')));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)'), motionText = U.el('span');
    function paintMotion() { motionText.textContent = motion.matches ? 'OS에서 움직임 줄이기 켜짐' : 'OS에서 움직임 줄이기 꺼짐'; }
    paintMotion(); motion.addEventListener?.('change', paintMotion);
    page.onDispose(() => motion.removeEventListener?.('change', paintMotion));
    page.body.append(U.card('접근성', U.row('움직임 줄이기', motionText),
      U.el('p', 'pw-muted', '이 화면은 OS의 움직임 줄이기 설정을 따라요. 여기에서 OS 설정이나 접근 권한을 변경하지 않아요.'),
      U.action('접근성 사용 안내', event => explain(page, '접근성 사용 안내',
        '키보드 Tab으로 항목을 이동하고 Enter 또는 Space로 선택할 수 있어요. 확인 창은 Escape로 닫을 수 있고 이전 버튼으로 돌아가요. 기기의 큰 글씨·움직임 줄이기 설정을 사용할 수 있어요.', event.currentTarget), true)),
      U.card('가족', U.link('부모님과 함께 보기', 'parent-view', navigate, backTo),
        U.link('부모님 연결 안내', 'family-connection', navigate, backTo), U.link('가족·권한 관리', 'family-permissions', navigate, backTo)),
      U.card('개인정보·데이터', U.link('개인정보·동의', 'privacy', navigate, backTo), U.link('데이터·동기화', 'data', navigate, backTo)),
      U.card('앱 정보·문의·정책', U.link('앱 정보와 이용 안내', 'app-info', navigate, backTo),
        U.action('문의 안내', event => explain(page, '문의 안내 준비 중', '공식 문의 채널은 준비 중이에요. 이 화면에서 문의를 보내거나 연락처를 수집하지 않아요.', event.currentTarget), true),
        U.action('약관·정책 안내', event => explain(page, '약관·정책 준비 중', '확정된 약관과 정책이 제공되면 여기에서 안내할 예정이에요. 현재 법적 문구를 임의로 표시하지 않아요.', event.currentTarget), true)));
    commonPreview(page, 'settings', loaded, '설정 저장과 서비스 연결은 준비 중이에요. 각 항목의 안내 화면을 확인할 수 있어요.');
    return page;
  };

  PWFeatureViews.privacy = (loaded, navigate, options = {}) => {
    const page = setup('privacy', loaded, navigate, options), contract = PWFeatureModels.empty('privacy'), result = live();
    page.body.append(U.card('현재 개인정보·AI 안내', U.row('AI 데이터 전송', '아직 전송하지 않아요'),
      U.row('보호자 동의', contract.guardianConsent == null ? '확인되지 않음 · null' : '확인 안 됨'),
      U.row('동의 상태', contract.consent == null ? '확정된 동의 정보 없음 · 준비 중' : '준비 중'),
      U.row('공유 범위', '정책 확정 후 표시'), U.el('p', 'pw-muted', '실제 AI provider·보호자 공유·인증은 아직 연결되지 않았어요. 임의로 동의를 받았다고 표시하지 않아요.')),
      U.card('정책 문서', U.el('p', 'pw-muted', '개인정보·보호자 동의·보관 정책의 확정된 내용은 준비 중이에요. 법적 문구를 임의로 만들지 않아요.'),
        U.action('정책 안내 화면 보기', event => explain(page, '개인정보 정책 준비 중', '정책이 확정된 후 내용과 공유 범위를 표시할 예정이에요. 이 화면에서 동의를 수집하거나 인증하지 않아요.', event.currentTarget), true)),
      U.card('동의·삭제 요청 UI', U.action('동의 철회 확인 화면', event => confirmPreview(page, '동의 철회 확인 미리보기',
        '확정된 동의나 실제 철회 서비스가 아직 없어요. 확인 절차의 모양만 살펴봐요.', result, event.currentTarget,
        '실제 동의 철회나 요청 전송은 하지 않았어요.'), true),
        U.action('삭제 요청 확인 화면', event => confirmPreview(page, '개인정보 삭제 요청 미리보기',
          '실제 삭제 요청을 보내거나 이 기기의 데이터를 지우지 않아요. 요청 처리 절차와 정책은 준비 중이에요.', result, event.currentTarget,
          '실제 삭제 요청이나 데이터 삭제는 하지 않았어요.'), true)), result,
      U.link('가족·권한 관리 안내', 'family-permissions', navigate, route('privacy')),
      U.link('데이터·동기화 보기', 'data', navigate, route('privacy')));
    commonPreview(page, 'privacy', loaded, '동의·공유 범위와 정책은 준비 중이에요. 실제 동의나 요청을 처리하지 않아요.');
    return page;
  };

  function summary(loaded) {
    const nativeLoaded = { status: loaded?.status || 'unavailable', state: source(loaded) };
    const model = PWFeatureModels.snapshot(nativeLoaded);
    const goal = model.goal;
    const rows = [U.row('읽은 저장 상태', storageLabel(loaded)), U.row('저장된 잔액', U.money(model.home.balance)),
      U.row('저장된 받은 돈', U.money(model.home.monthly.received)), U.row('저장된 쓴 돈', U.money(model.home.monthly.spent)),
      U.row('집계 기간', '확인 안 됨'), U.row('확인 가능한 기록 수', model.report.records.count === null ? '확인 안 됨' : model.report.records.count.toLocaleString('ko-KR') + '건'),
      U.row('저장된 습관 점수', model.report.score.value === null ? '확인 안 됨' : model.report.score.value + '점')];
    if (['active', 'complete'].includes(goal.status)) rows.push(U.row('저장된 목표', goal.title),
      U.row('목표에 모은 금액', U.money(goal.current)), U.row('목표 금액', U.money(goal.target)));
    else rows.push(U.row('목표', loaded?.status === 'empty' || (loaded?.status === 'loaded' && goal.status === 'empty') ? '저장된 목표 없음' : '확인 안 됨'));
    if (model.report.records.partial) rows.push(U.el('p', 'pw-meta', '확인 가능한 기록만 집계했어요. 원본 기록을 고치거나 복구하지 않아요.'));
    rows.push(U.el('p', 'pw-meta', '기존 native core 모델의 읽기 전용 요약이에요. 개발용 결과와 합치거나 기록 목록을 편집하지 않아요.'));
    return U.card('내 데이터 읽기 전용 요약', ...rows);
  }

  PWFeatureViews.data = (loaded, navigate, options = {}) => {
    const page = setup('data', loaded, navigate, options), result = live();
    page.body.append(U.card('데이터 보관 상태', U.row('현재 읽은 상태', storageLabel(loaded)),
      U.el('p', 'pw-muted', loaded?.status === 'loaded' ? '이 기기에서 읽은 기존 저장 정보가 있어요.'
        : loaded?.status === 'empty' ? '저장 키가 비어 있어 아직 기록이 없어요.' : '저장 정보를 읽거나 해석하지 못해 보관 여부를 확인할 수 없어요.'),
      U.row('클라우드 동기화', '아직 연결되지 않았어요'),
      U.action('동기화 안내 보기', event => explain(page, '동기화 안내', '실제 클라우드 저장·동기화·계정 연결은 아직 사용할 수 없어요. 이 화면에서는 이 기기에서 읽은 상태만 안내해요.', event.currentTarget), true)),
      U.card('내 데이터 보기', U.action('읽기 전용 요약 열기', event => page.openSheet('내 데이터 읽기 전용 요약', flow => {
        flow.body.append(U.notice('기존 모델을 읽기만 해요. 금융 기록이나 저장 정보는 바뀌지 않아요.'), summary(loaded));
        flow.footer.append(U.action('닫기', () => flow.close.click()));
      }, event.currentTarget), true)),
      U.card('데이터 작업 설명 미리보기', U.action('내보내기 확인 화면', event => confirmPreview(page, '데이터 내보내기 미리보기',
        '내보내기 형식과 기능은 준비 중이에요. 확인해도 파일을 만들거나 실제 다운로드하지 않아요.', result, event.currentTarget,
        '실제 파일 생성이나 다운로드는 하지 않았어요.', U.row('현재 데이터 상태', storageLabel(loaded))), true),
        U.action('삭제 확인 화면', event => confirmPreview(page, '데이터 삭제 확인 미리보기',
          '실제 데이터 삭제 기능은 연결되지 않았어요. 확인해도 기존 저장 기록을 지우지 않아요.', result, event.currentTarget,
          '실제 데이터 삭제는 하지 않았어요.', U.row('현재 데이터 상태', storageLabel(loaded))), true),
        U.action('초기화 확인 화면', event => confirmPreview(page, '앱 데이터 초기화 미리보기',
          '초기화 확인 UI만 보여줘요. 저장 공간이나 기존 금융 기록을 비우지 않아요.', result, event.currentTarget,
          '실제 초기화나 저장 공간 정리는 하지 않았어요.', U.row('현재 데이터 상태', storageLabel(loaded))), true)), result,
      U.link('개인정보·동의 안내', 'privacy', navigate, route('data')));
    commonPreview(page, 'data', loaded, '내보내기·삭제·동기화 서비스는 준비 중이에요. 실제 파일이나 저장 공간을 바꾸지 않아요.');
    return page;
  };

  PWFeatureViews['app-info'] = (loaded, navigate, options = {}) => {
    const page = setup('app-info', loaded, navigate, options), version = document.querySelector('meta[name="pocketwon-frontend-version"]')?.content?.trim();
    page.body.append(U.card('포켓WON 로컬 프런트엔드', U.row('프런트엔드 버전', version || '확인 안 됨 · 표시 값 준비 중'),
      U.el('p', 'pw-meta', version ? '이 페이지에 명시된 로컬 프런트엔드 버전이에요. 금융 서비스나 계정 버전이 아니에요.'
        : '확정된 프런트엔드 버전 표시 값이 없어 임의 버전을 만들지 않아요.'),
      U.row('금융·계정 서비스', '아직 연결되지 않았어요')),
      U.card('이용 안내', U.action('미리보기 이용 안내', event => explain(page, '미리보기 이용 안내',
        '안내 화면과 임시 입력 UI를 살펴볼 수 있어요. 실제 AI·부모님 공유·금융 연결은 준비 중이에요. 임시 입력은 새로고침하면 초기화되고 실제 저장이나 송금은 하지 않아요.', event.currentTarget), true),
        U.action('문의 안내', event => explain(page, '문의 채널 준비 중', '공식 문의 채널은 준비 중이에요. 실제 문의 발송이나 연락처 수집은 하지 않아요.', event.currentTarget), true)),
      U.card('약관·정책', U.action('이용약관 안내', event => explain(page, '이용약관 준비 중', '확정된 이용약관이 제공되면 표시할 예정이에요. 임의의 법적 문구나 가입·인증 정보를 만들지 않아요.', event.currentTarget), true),
        U.action('정책 안내', event => explain(page, '정책 안내 준비 중', '보호자 동의·공유 범위·개인정보 정책은 확정 후 표시할 예정이에요.', event.currentTarget), true),
        U.link('개인정보·동의 보기', 'privacy', navigate, route('app-info'))),
      U.card('운영 도구 안내', U.el('p', 'pw-muted', '일반 진입에서는 운영 도구의 정보 안내만 볼 수 있어요. 관리 기능이나 사용자 목록을 제공하지 않아요.'),
        U.link('운영 도구 안내 보기', 'admin', navigate, route('app-info'))));
    commonPreview(page, 'app-info', loaded, '버전·정책 등 확정된 정보가 없는 항목은 준비 중으로 표시해요.');
    return page;
  };

  PWFeatureViews.admin = (loaded, navigate, options = {}) => {
    const page = setup('admin', loaded, navigate, options);
    page.body.append(U.card('운영 도구 정보 안내', U.el('p', '', '실제 관리 기능은 아직 사용할 수 없어요.'),
      U.el('p', 'pw-muted', '사용자 정보·권한·인증·서버를 관리하지 않아요. 일반 화면은 운영 도구 안내만 제공해요.'),
      U.action('운영 도구 안내 확인', event => explain(page, '운영 도구 안내', '현재는 운영 도구의 안내 화면이에요. 관리 권한을 얻거나 실제 데이터를 조회·수정하는 기능은 없어요.', event.currentTarget), true)));
    if (PWPreview.enabled) {
      const contracts = [
        ['content', '콘텐츠', '콘텐츠 계약 · items: []'], ['education', '교육', '교육 콘텐츠 계약 · items: []'],
        ['notifications', '알림 템플릿', '알림 템플릿 계약 · templates: []'], ['flags', '기능 플래그', '기능 플래그 계약 · flags: []'],
        ['status', '서비스 상태', '서비스 상태 계약 · states: []'], ['errors', '오류', '오류 계약 · errors: []'], ['policy', '정책', '정책 계약 · policy: null']
      ];
      const slot = U.el('div', 'pw-settings-stack');
      const select = U.select('개발용 운영 계약 분야', contracts.map(([id, title]) => [id, title]), 'content', paint);
      function paint(value = 'content') {
        const item = contracts.find(([id]) => id === value) || contracts[0];
        slot.replaceChildren(U.card('개발용 빈 계약 · ' + item[1], U.row('슬롯', item[2]),
          U.el('p', 'pw-muted', '실제 연결된 데이터가 없어요. 수정·발송·정책 게시나 플래그 적용은 하지 않아요.')));
      }
      page.body.append(U.card('개발용 운영 계약 미리보기', U.notice('개발 미리보기에서만 보이는 빈 데이터 계약이에요. 실제 운영 데이터나 가짜 사용자 목록이 아니에요.'),
        U.row('공통 모델', Array.isArray(PWFeatureModels.empty('admin').items) ? 'items: [] · 연결 없음' : '준비 중'), select.element), slot);
      paint();
      commonPreview(page, 'admin', loaded, '운영 데이터 연결이 없는 빈 계약이에요. 실제 사용자·정책·오류 데이터를 만들지 않아요.');
    }
    page.footer.append(U.link('앱 정보로 돌아가기', 'app-info', navigate, route('admin')));
    return page;
  };
})();
