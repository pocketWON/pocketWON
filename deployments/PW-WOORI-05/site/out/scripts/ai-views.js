/* AI presentation only: no scores, evaluations or recommendations are generated. */
(()=>{
 const U=PWFeatureUI;
 PWFeatureViews['habit-analysis']=(loaded,navigate,options)=>{
  const p=U.page('habit-analysis',loaded,navigate,options),d=p.vm.data,stored=createReportViewModel(loaded.state).score;
  if(U.ready(p.vm)){p.body.append(U.card('종합 습관 Score · 예시',U.el('p','pw-feature-score',String(d.score)),U.meter(d.score,'예제 습관 점수'),U.row('이전 기간 · 예시',d.previousScore===null?'준비 중':d.previousScore+'점'),U.row('변화 · 예시',d.change===null?'준비 중':(d.change>0?'+':'')+d.change+'점'),U.el('p','pw-muted',d.summary||'설명 준비 중')));}else {U.appendStatus(p);if(stored.status==='available')p.body.append(U.card('기존에 저장된 습관 점수',U.el('p','pw-feature-score',String(stored.value)),U.el('p','pw-muted','저장된 값 그대로예요. 새로운 AI 분석 점수가 아니에요.')));}
  const factors=U.card('분석 항목');for(const name of ['기록 습관','소비 습관','목표 습관','계획 습관']){const factor=d.factors.find(f=>f.name===name);factors.append(U.card(name,U.chip(factor?'preview':'upcoming',factor?.status||'분석 준비 중'),U.el('p','pw-muted',factor?.description||'향후 이 항목의 설명이 표시됩니다.')));}p.body.append(factors,U.row('분석 날짜',d.analyzedAt||'아직 분석되지 않았어요.'),U.accordion('분석 기준 보기',['분석 기준과 데이터 사용 범위는 확정 후 안내해요.','현재는 기록이나 목표를 점수로 계산하지 않아요.']));p.footer.append(U.link('코칭 보기','coaching',navigate,options),U.link('AI 리포트','ai-report',navigate,options));return p;
 };
 PWFeatureViews.coaching=(loaded,navigate,options)=>{
  const p=U.page('coaching',loaded,navigate,options),d=p.vm.data;let alternative=0;
  const title=U.el('h3','',d.title||'AI 코칭 준비 중'),message=U.el('p','pw-muted',d.message||'향후 맞춤 코칭이 표시될 자리예요. AI 코칭은 아직 연결되지 않았어요.');
  p.body.append(pwIllustrationPanel('all',{panelClass:'pw-feature-art pw-compact-visual',ambient:false}),U.card('오늘의 짧은 코칭',U.chip(p.vm.aiState),title,message));if(!U.ready(p.vm))U.appendStatus(p);
  p.body.append(U.card('다음 행동',U.el('p','pw-muted',d.nextAction||'다음 행동 제안이 들어갈 자리예요.')),U.accordion('왜 이런 조언을 받았나요?',d.reasons.length?d.reasons:['조언의 근거는 아직 없어요. 실제 기록을 분석하지 않았어요.']));
  p.footer.append(U.action('다른 조언 보기',()=>{if(!U.ready(p.vm)){message.textContent='AI 코칭은 아직 연결되지 않았어요. 개발 Preview에서 예시를 확인할 수 있어요.';return;}const list=d.alternatives||[{title:d.title,message:d.message}];alternative=(alternative+1)%list.length;title.textContent=list[alternative].title;message.textContent=list[alternative].message;},true),U.link('다음 계획','next-plan',navigate,options));return p;
 };
 PWFeatureViews['ai-report']=(loaded,navigate,options)=>{
  const p=U.page('ai-report',loaded,navigate,options),d=p.vm.data;p.body.append(U.periodControl(),U.row('기간',d.period||'기간 선택·분석 준비 중'));if(!U.ready(p.vm))U.appendStatus(p);
  const overview=U.card('AI 한눈에 보기',U.el('p','pw-muted',d.summary||'향후 이번 기간 요약이 표시됩니다.'));
  for(const [title,key]of [['잘하고 있는 점','highlights'],['변화한 점','changes'],['살펴볼 점','watchPoints']])overview.append(U.card(title,...(d[key].length?d[key].map(t=>U.el('p','pw-muted',t)):[U.el('p','pw-muted','아직 분석 결과가 없어요.')])));p.body.append(overview);
  const insights=U.card('AI 인사이트');if(d.insights.length)for(const i of d.insights)insights.append(U.card(i.title,U.chip('preview'),U.el('p','pw-muted',i.message)));else for(const t of ['기록 습관','지출 변화','목표 진행','소비 카테고리 변화'])insights.append(U.row(t,'분석 준비 중'));p.body.append(insights,U.accordion('저장된 정보와 AI 분석은 달라요',['기존 리포트의 숫자는 저장된 값이에요.','AI 요약·평가·기간 비교는 아직 만들어지지 않아요.']));p.footer.append(U.link('부모님과 함께 보기','parent-view',navigate,options),U.link('AI 코칭','coaching',navigate,options));return p;
 };
 PWFeatureViews['next-plan']=(loaded,navigate,options)=>{
  const p=U.page('next-plan',loaded,navigate,options),d=p.vm.data,keys=[['계획 총액','allowance'],['일반 사용','spendingBudget'],['따로 모으기','savingBudget'],['목표에 넣을 몫','goalBudget'],['자유롭게 사용할 돈','freeBudget']],draft={};
  p.body.append(U.notice('비파괴적인 계획 미리보기예요. 저장된 잔액·목표·받은 돈 누계와 연결하지 않아요.'));if(!U.ready(p.vm))U.appendStatus(p,'AI 추천은 준비 중이에요. 직접 입력해서 계획 UI만 미리 확인할 수 있어요.');
  const form=U.card('다음 기간 계획 · 직접 수정'),error=U.el('p','pw-error');error.setAttribute('role','status');
  for(const [label,key]of keys){draft[key]=d[key]===null?'':String(d[key]);const f=U.field(label,draft[key],'text',v=>{draft[key]=v;error.textContent='';});f.input.inputMode='numeric';form.append(f.element);}p.body.append(form,U.card('추천 목표',...(d.recommendations.length?d.recommendations.map(r=>U.card(r.title,U.el('p','pw-muted',r.reason))):[U.el('p','pw-muted','추천 목표와 이유는 아직 없어요.')])));
  form.append(U.el('p','pw-muted','일반 사용·따로 모으기·목표 몫·자유 사용은 서로 다른 계획 칸이에요.'),error);
  function confirm(){const values=keys.map(([,key])=>/^[0-9]+$/.test(draft[key])?Number(draft[key]):NaN);if(values.some(v=>!Number.isSafeInteger(v)||v<0)){error.textContent='모든 칸에 0 이상의 안전한 정수를 입력해주세요.';return;}const sum=values.slice(1).reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(sum)||sum>values[0]){error.textContent='나눈 금액의 합이 계획 총액을 넘지 않게 적어주세요.';return;}
   const sheet=U.sheet('계획 미리보기',f=>{f.body.append(U.notice('실제 돈을 배분하거나 목표에 적립하지 않았어요.'));keys.forEach(([label],i)=>f.body.append(U.row(label,U.money(values[i]))));f.body.append(U.row('아직 나누지 않은 금액',U.money(values[0]-sum)));f.footer.append(U.action('확인했어요',()=>f.dispose()));});p.trackSheet(sheet);}
  p.footer.append(U.action('계획 미리보기',confirm),U.action('다시 추천',()=>{error.textContent=PWPreview.enabled?'정해진 개발용 예시예요. 실제 추천은 하지 않아요.':'AI 추천 기능은 준비 중이에요. 직접 계획 UI를 살펴볼 수 있어요.';},true));return p;
 };
})();
