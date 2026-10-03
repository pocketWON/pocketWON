/* One current value and four distinct tasks; no inferred weekly budget. */
function createHomeView(model,navigate,status){
 const {el,button,heading,money}=PWUI;const root=el('div','pw-screen pw-home');root.append(heading('홈'));
 const hero=el('section','pw-home-hero');hero.setAttribute('aria-labelledby','pw-home-balance-title');
 const body=el('div','pw-home-hero-body');const title=el('h2','pw-home-hero-title','지금 남은 용돈');title.id='pw-home-balance-title';
 body.append(title,money(model.balance,'pw-home-money'));
 const note=status==='empty'?'첫 기록을 남기면 여기에 보여드려요.':status!=='loaded'?'저장된 정보를 불러오지 못했어요.':model.balance===null?'저장된 잔액을 확인할 수 없어요.':'지금 쓸 수 있는 돈이에요.';
 body.append(el('p','pw-meta',note));hero.append(body,pwIllustrationPanel('balance',{panelClass:'pw-compact-visual pw-home-hero-art'}));hero.dataset.pwMotionCard='';root.append(hero);
 const grid=el('div','pw-home-feature-grid');
 const tasks=[['기록하기','받거나 쓴 돈 남기기','record',{screen:'record',stage:'form',returnTo:{screen:'home',focusAction:'form'}}],['기록 내역','내 돈이 오간 순간','all',{screen:'record',stage:'list'}],['목표','모으고 싶은 것','goal',{screen:'goal'}],['리포트','저장된 돈 습관','report',{screen:'report'}]];
 for(const [label,description,profile,target] of tasks){
  const card=button('',()=>navigate(target,pwSpriteEntryMotion(root,card,target.screen)),'pw-home-card');card.setAttribute('aria-label',label);card.dataset.pwMotionCard='';card.dataset.action=target.stage||target.screen;
  const visual=pwIllustrationPanel(profile,{panelClass:'pw-compact-visual pw-home-card-art',ambient:profile==='goal'&&model.goal.status==='active',goalKey:profile==='goal'?pwSpriteGoalKey(model.goal):undefined});
  const caption=el('div','pw-home-card-caption');caption.append(el('span','pw-home-card-title',label),el('span','pw-home-card-chevron','›'));const meta=el('span','pw-home-card-meta pw-meta',description);card.append(visual,caption,meta);grid.append(card);
 }
 root.append(grid);return {element:root,mount(){},dispose(){}};
}
