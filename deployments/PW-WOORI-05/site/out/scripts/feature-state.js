/* Product shell registry. No financial writers or runtime services. */
const FEATURE_STATE = Object.freeze({active:'active',preview:'preview',upcoming:'upcoming',unavailable:'unavailable',empty:'empty',error:'error'});
const AI_FEATURE_STATE = Object.freeze({unavailable:'unavailable',idle:'idle',preparing:'preparing',ready:'ready',loading:'loading',success:'success',empty:'empty',error:'error'});
const PWPreview = (() => {
 const q=new URLSearchParams(location.search),local=['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:';
 const enabled=local&&(q.get('preview')==='1'||q.get('aiPreview')==='1'),states=new Map();
 return Object.freeze({enabled,scenario:q.get('previewCase')||'standard',state(id){return enabled?(states.get(id)||q.get('previewState')||'success'):'preparing';},select(id,state){if(enabled)states.set(id,state);}});
})();
const PW_FEATURES = Object.freeze(Object.fromEntries([
 ['habit-analysis','AI 습관 분석','report','ai',true],['coaching','AI 코칭','all','habit',true],['ai-report','AI 습관 리포트','report','ai',true],['parent-view','부모님과 함께 보기','goal','together',true],['next-plan','다음 용돈·목표 계획','goal','together',true],['receipt','영수증으로 기록','record','convenience',true],['category-suggestion','AI 추천 카테고리','record','convenience',true],['quiz','금융 퀴즈','report','learning',true],['reflection','사기 전 생각 도우미','balance','convenience',true],
 ['transaction-correction','거래 정정 미리보기','record','money'],['goal-contribution','목표에 모으기','goal','money'],['calendar','습관 캘린더','record','money'],['streak','연속 기록','all','habit'],['badges','배지·활동 포인트','all','habit'],['notifications','알림 센터','all','convenience'],['notification-settings','알림 설정','all','settings'],['rewards','칭찬·보상 약속','goal','together'],['family-connection','부모님 연결','all','together'],['family-permissions','가족·권한 관리','all','together'],['allowance','정기 용돈 계획','balance','convenience'],['thoughtbox','생각 보관함','goal','money'],['finance','금융 연결','balance','settings'],['card','카드·결제','balance','settings'],['profile','내 프로필','all','settings'],['settings','설정','all','settings'],['privacy','개인정보·동의','all','settings'],['data','데이터·동기화','record','settings'],['app-info','앱 정보','all','settings'],['admin','운영 도구 안내','all','settings']
].map(([id,title,profile,group,ai=false])=>[id,Object.freeze({id,title,profile,group,ai,state:ai?'upcoming':['calendar','profile'].includes(id)?'active':'preview'})])));
const PW_AI_FEATURE_IDS=Object.freeze(Object.keys(PW_FEATURES).filter(id=>PW_FEATURES[id].ai));
const PWFeatureViews=Object.create(null);
const PWFeatureDrafts=Object.create(null);
function pwFeatureRoute(id,returnTo){return {screen:'feature',featureId:id,...(returnTo?{returnTo}: {})};}
