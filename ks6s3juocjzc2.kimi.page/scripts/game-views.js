/* Mini game screens. Reads only; no storage writes, rewards, points or score changes. */
const pwGameWon=value=>(Number.isInteger(value)?'':'약 ')+Math.round(value).toLocaleString('ko-KR')+'원';
PWFeatureViews['price-game']=(loaded,navigate,options)=>{
 const U=PWFeatureUI,p=U.page('price-game',loaded,navigate,options),questions=PW_PRICE_QUESTIONS;let stage='intro',index=0,answers=[];
 const content=U.el('div','pw-quiz-content');p.body.append(content);
 const result=q=>pwPriceCompare(q.a,q.b);
 function focus(){const h=content.querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:false});}PWUI.refreshMotion(p.element);}
 function go(next){stage=next;render();focus();}
 function verdict(right,text){const n=U.el('div','pw-game-verdict');n.dataset.result=right?'right':'wrong';n.setAttribute('role','status');const mark=U.el('span','pw-game-verdict-mark',right?'✓':'✕');mark.setAttribute('aria-hidden','true');const copy=U.el('div','pw-game-verdict-copy');copy.append(U.el('strong','',right?'정답이에요!':'오답이에요'),U.el('span','',text));n.append(mark,copy);return n;}
 function offerBox(key,offer,priced,basis,answer,mine){const n=U.el('div','pw-game-offer'),isAnswer=key===answer,isMine=key===mine;n.dataset.mark=isAnswer?'answer':isMine?'wrong':'none';const top=U.el('div','pw-game-offer-top');top.append(U.el('span','pw-game-offer-key',key.toUpperCase()));if(isAnswer)top.append(U.el('span','pw-game-badge pw-game-badge--right','✓ 정답'+(isMine?' · 내 선택':'')));else if(isMine)top.append(U.el('span','pw-game-badge pw-game-badge--wrong','✕ 내 선택'));n.append(top,U.el('span','pw-game-offer-label',offer.label),U.el('strong','pw-game-offer-price',basis==='unit'?'1개 '+pwGameWon(priced.unit):'최종 '+pwGameWon(priced.total)));return n;}
 function render(){content.replaceChildren();p.footer.replaceChildren();p.element.dataset.gameStage=stage;delete p.element.dataset.gameResult;
  if(stage==='intro'){content.append(U.card('어느 쪽이 더 저렴할까요?',U.row('문제 수',questions.length+'개'),U.row('다루는 것',questions.map(q=>q.topic).join(' · ')),U.el('p','pw-muted','할인·묶음·배송비를 따져 최종 가격을 비교해요. 기록이나 돈은 바뀌지 않아요.')));p.footer.append(U.action('게임 시작',()=>go('question')));return;}
  if(stage==='complete'){const count=questions.filter((q,i)=>answers[i]===result(q).cheaper).length;content.append(pwIllustrationPanel('success',{panelClass:'pw-feature-art pw-compact-visual',ambient:false,idle:false}),U.card('가격 비교를 마쳤어요',U.el('p','pw-feature-score',count+' / '+questions.length),U.el('p','pw-muted','활동 포인트·습관 점수·보상은 바뀌지 않아요.')),U.card('문제별 결과',...questions.map((q,i)=>{const ok=answers[i]===result(q).cheaper,mark=U.el('span','pw-game-badge pw-game-badge--'+(ok?'right':'wrong'),ok?'✓ 정답':'✕ 오답');return U.row((i+1)+'. '+q.topic,mark);})),U.card('기억해 둘 것',U.el('p','pw-muted','묶음은 1개 가격으로, 할인과 배송비는 최종 금액으로 비교해요.')));p.footer.append(U.action('처음부터 다시',()=>{index=0;answers=[];go('intro');},true));return;}
  const q=questions[index],r=result(q),section=U.card('어느 쪽이 더 저렴할까요?',U.row('진행',`${index+1} / ${questions.length}`),U.meter((index+1)/questions.length*100,'가격 비교 문제 진행'));content.append(section);
  if(stage==='question'){const group=U.el('fieldset','pw-quiz-options');group.style.border='0';group.style.padding='0';group.append(U.el('legend','pw-sr-only','더 저렴한 쪽을 골라주세요.'));for(const [key,offer]of [['a',q.a],['b',q.b]]){const choice=U.button(key.toUpperCase()+' '+offer.label,()=>{answers[index]=key;render();content.querySelector('[data-choice="'+key+'"]').focus({preventScroll:false});},'pw-feature-option');choice.dataset.choice=key;choice.setAttribute('aria-pressed',String(answers[index]===key));group.append(choice);}section.append(group);
   const check=U.action('정답 보기',()=>{go('explanation');if(answers[index]===r.cheaper)PocketWONMotion.controllerFor(p.element)?.success(p.element.querySelector('.pw-sprite'));});check.disabled=answers[index]===undefined;p.footer.append(U.action('이전',()=>{if(index>0){index--;go('question');}else go('intro');},true),check);
  }else {const right=answers[index]===r.cheaper;const offers=U.el('div','pw-game-offers');offers.append(offerBox('a',q.a,r.a,r.basis,r.cheaper,answers[index]),offerBox('b',q.b,r.b,r.basis,r.cheaper,answers[index]));p.element.dataset.gameResult=right?'right':'wrong';
   section.append(verdict(right,right?r.cheaper.toUpperCase()+'가 더 저렴해요.':'내 선택 '+answers[index].toUpperCase()+' · 정답 '+r.cheaper.toUpperCase()),offers,U.el('p','pw-muted',r.basis==='unit'?'개수가 다르면 1개 가격으로 비교해요.':'할인과 배송비까지 더한 최종 금액으로 비교해요.'));
   p.footer.append(U.action(index+1===questions.length?'결과 보기':'다음 문제',()=>{if(index+1===questions.length)go('complete');else{index++;go('question');}}));}
 }
 render();return p;
};
PWFeatureViews['goal-weeks']=(loaded,navigate,options)=>{
 const U=PWFeatureUI,p=U.page('goal-weeks',loaded,navigate,options),goal=['loaded','empty'].includes(loaded?.status)?createGoalViewModel(loaded.state):null;let chosen=null;
 const content=U.el('div','pw-quiz-content');p.body.append(content);p.footer.append(U.action('목표 화면 보기',()=>navigate('goal'),true));
 const blocked={empty:['아직 목표가 없어요','목표를 만들면 몇 번 모으면 되는지 계산해 볼 수 있어요.'],complete:['이미 목표를 이뤘어요','새 목표를 정하면 다시 계산해 볼 수 있어요.'],invalid:['목표 정보를 확인할 수 없어요','저장된 목표를 읽을 수 없어 계산하지 않았어요.']};
 if(!goal||goal.status!=='active'){const [title,text]=blocked[goal?.status]||blocked.invalid,n=U.el('section','pw-feature-empty');n.setAttribute('role','status');n.append(pwIllustrationPanel('goal',{panelClass:'pw-feature-art pw-compact-visual',ambient:false}),U.el('h3','',title),U.el('p','pw-muted',text));content.append(n);p.element.dataset.gameStage=goal?.status||'unavailable';return p;}
 function render(){content.replaceChildren();p.element.dataset.gameStage=chosen?'result':'question';
  const group=U.el('fieldset','pw-quiz-options');group.style.border='0';group.style.padding='0';group.append(U.el('legend','pw-sr-only','매주 모을 금액을 골라주세요.'));
  for(const step of PW_GOAL_STEPS){const choice=U.button('매주 '+pwGameWon(step)+'씩',()=>{chosen=step;render();content.querySelector('[data-choice="'+step+'"]').focus({preventScroll:false});},'pw-feature-option');choice.dataset.choice=step;choice.setAttribute('aria-pressed',String(chosen===step));group.append(choice);}
  content.append(U.card(goal.title+'까지 몇 번?',U.row('남은 금액',pwGameWon(goal.remaining)),U.meter(goal.percent,'목표 진행'),U.el('p','pw-muted','매주 얼마씩 모으면 될까요? 하나를 골라보세요.'),group));
  if(chosen){const plan=pwWeeksToGoal(goal,chosen),result=U.card(pwGameWon(chosen)+'씩 '+plan.weeks+'번 모으면 돼요',...PW_GOAL_STEPS.map(step=>U.row('매주 '+pwGameWon(step),pwWeeksToGoal(goal,step).weeks+'주')),U.el('p','pw-muted','계산만 해봐요. 실제로 돈이 모이거나 저장되지는 않아요.'));result.setAttribute('role','status');content.append(result);}
 }
 render();return p;
};
