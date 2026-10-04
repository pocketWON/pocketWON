/* Nullable data contracts and read-only projections. Policy is not inferred. */
const PWFeatureModels=(()=>{
 const contracts={
  'habit-analysis':()=>({score:null,previousScore:null,change:null,factors:[],summary:null,analyzedAt:null}),
  coaching:()=>({title:null,message:null,nextAction:null,reasons:[]}),
  'ai-report':()=>({period:null,summary:null,highlights:[],changes:[],watchPoints:[],insights:[],analyzedAt:null}),
  'parent-view':()=>({period:null,summary:null,strengths:[],highlights:[],goalProgress:null,conversationTopics:[],nextPlan:null}),
  'next-plan':()=>({allowance:null,spendingBudget:null,savingBudget:null,goalBudget:null,freeBudget:null,recommendations:[]}),
  receipt:()=>({amount:null,merchant:null,date:null,category:null,memo:null}),
  'category-suggestion':()=>({suggestedCategory:null,confidence:null,reason:null}),
  quiz:()=>({topic:null,difficulty:null,questions:[],learning:[],nextLearning:null}),
  reflection:()=>({questions:['지금 꼭 필요한 물건인가요?','사고 나면 남는 용돈을 직접 확인했나요?','내 목표에는 어떤 영향을 줄까요?','하루 뒤에도 사고 싶을까요?']}),
  streak:()=>({current:null,best:null,recordedDates:[]}),badges:()=>({points:null,badges:[]}),notifications:()=>({items:[]}),
  'notification-settings':()=>({record:false,report:false,goal:false,reward:false,learning:false,time:null}),
  rewards:()=>({id:null,title:null,goal:null,condition:null,type:null,reward:null,promisedBy:null,status:'before'}),
  'family-connection':()=>({status:'unavailable',guardians:[]}),'family-permissions':()=>({guardians:[],permissions:[]}),
  allowance:()=>({amount:null,frequency:null,weekday:null,monthDay:null,nextDate:null,startDate:null,enabled:false,status:'unavailable'}),
  thoughtbox:()=>({items:[]}),privacy:()=>({consent:null,guardianConsent:null,sharing:null,guardians:[],policy:null}),
  data:()=>({sync:'unavailable',export:'unavailable',deletion:'unavailable'}),finance:()=>({accounts:[],available:null}),card:()=>({card:null,available:null}),admin:()=>({items:[]})
 };
 function empty(id){return contracts[id]?contracts[id]():{};}
 function calendar(loaded,now=new Date()){
  const source=Array.isArray(loaded?.state?.transactions)?loaded.state.transactions:null,days=new Map();let omitted=0;
  for(const [sourceIndex,tx]of (source||[]).entries()){
   const date=validPocketWONTransaction(tx)?parsePocketWONDate(tx.ts):null;if(!date){omitted++;continue;}
   const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
   if(!days.has(key))days.set(key,[]);days.get(key).push({sourceIndex,type:tx.type,amount:tx.amount,category:tx.category,memo:typeof tx.memo==='string'?tx.memo:'',timestamp:tx.ts});
  }
  return {status:source===null?'unavailable':days.size?'active':'empty',days,omitted,year:now.getFullYear(),month:now.getMonth(),timezone:'브라우저의 날짜 표시 기준'};
 }
 function snapshot(loaded){return {status:loaded.status,home:createHomeViewModel(loaded.state),goal:createGoalViewModel(loaded.state),report:createReportViewModel(loaded.state),records:createRecordViewModel(loaded.state)};}
 return Object.freeze({empty,calendar,snapshot});
})();
