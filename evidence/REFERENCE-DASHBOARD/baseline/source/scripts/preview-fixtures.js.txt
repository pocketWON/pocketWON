/* Development fixtures only. Never merged into PocketWON storage or form drafts. */
const AI_PREVIEW_MOCK=Object.freeze({
 'habit-analysis':{score:82,previousScore:78,change:4,factors:[{name:'기록 습관',status:'예시: 꾸준함',description:'예시 기록 습관 설명입니다.'},{name:'소비 습관',status:'예시: 살펴보기',description:'예시 소비 습관 설명입니다.'},{name:'목표 습관',status:'예시: 도전 중',description:'예시 목표 습관 설명입니다.'},{name:'계획 습관',status:'예시: 시작',description:'예시 계획 습관 설명입니다.'}],summary:'기록과 계획을 함께 살펴보는 예시 화면이에요.',analyzedAt:'2026-09-28'},
 coaching:{alternatives:[{title:'작은 기록도 좋은 시작이에요',message:'예제 코칭: 기억나는 돈 이야기를 하나 남겨볼까요?'},{title:'다음 계획을 이야기해볼까요?',message:'두 번째 개발용 코칭 예시예요. 실제 기록과 관계없어요.'}],title:'작은 기록도 좋은 시작이에요',message:'예제 코칭 문구예요. 오늘 기억나는 돈 이야기를 하나 남겨볼까요?',nextAction:'기록 화면 살펴보기',reasons:['이 설명은 개발용 예시이며 실제 기록을 분석하지 않았어요.','개인화된 조언은 아직 연결되지 않았어요.']},
 'ai-report':{period:'예시 기간 · 9월 21일~27일',summary:'돈의 흐름과 목표를 함께 살펴보는 예제 리포트예요.',highlights:['예시: 기록을 이어갔어요.'],changes:['예시: 계획을 다시 살펴봤어요.'],watchPoints:['예시: 다음 기간에 해보고 싶은 일을 이야기해요.'],insights:[{title:'기록 습관',message:'예제 인사이트: 짧게라도 기록하는 흐름을 보여줘요.'},{title:'소비 카테고리',message:'실제 소비를 분류한 결과가 아닌 디자인 예시예요.'},{title:'목표 진행',message:'예제 목표의 흐름을 함께 이야기해요.'}]},
 'parent-view':{summary:'아이의 목표와 이야기를 함께 살펴보는 개발용 예시예요.',strengths:['예제 잘한 점 · 스스로 기록해봤어요.'],period:'예시 기간 · 이번 주',highlights:['예시: 아이가 직접 기록해봤어요.'],goalProgress:{title:'예제 목표',current:3000,target:10000},conversationTopics:['기록하면서 어떤 점이 재미있었나요?','다음에는 어떤 목표를 함께 생각할까요?'],nextPlan:'예시: 다음 계획을 함께 적어보기'},
 'next-plan':{allowance:10000,spendingBudget:3000,savingBudget:2000,goalBudget:3000,freeBudget:2000,recommendations:[{title:'예제 목표 · 책',reason:'정해진 fixture입니다. 실제 취향이나 기록을 분석하지 않았어요.'}]},
 receipt:{amount:2500,merchant:'예시 사용처',date:'2026-09-27',category:'간식',memo:'사진과 관계없는 개발용 영수증 예시'},
 'category-suggestion':{suggestedCategory:'간식',confidence:.84,reason:'입력 메모와 관계없는 개발용 추천 예시입니다.'},
 quiz:{topic:'필요와 계획',difficulty:'예시 · 쉬움',questions:[{id:'q1',question:'갖고 싶은 것을 사기 전에 먼저 해볼 일은 무엇일까요?',options:['필요한지 생각해보기','아무 생각 없이 사기','가격은 확인하지 않기'],answer:0,explanation:'꼭 필요한지 먼저 생각하면 선택하는 데 도움이 돼요.',why:'필요한 것과 원하는 것은 다를 수 있어요.'},{id:'q2',question:'목표를 정할 때 함께 적으면 좋은 것은 무엇일까요?',options:['친구의 비밀번호','필요한 금액','카드 번호'],answer:1,explanation:'목표에 필요한 금액을 알면 계획하기 쉬워요.',why:'얼마가 필요한지 알아야 조금씩 모으는 계획을 세울 수 있어요.'},{id:'q3',question:'활동 포인트는 무엇과 다를까요?',options:['활동을 기억하는 표시','배지를 향한 진행','실제로 쓸 수 있는 현금'],answer:2,explanation:'활동 포인트는 실제 현금이나 결제 수단이 아니에요.',why:'이 앱의 포인트 정책은 아직 정해지지 않았어요.'}],learning:['필요와 원하는 것 구분','목표 금액 확인','활동 포인트와 현금 구분'],nextLearning:'예시 다음 학습 · 용돈 계획'},
});
const FEATURE_PREVIEW_MOCK=Object.freeze({
 streak:{current:5,best:8,recordedDates:['예시']},badges:{points:30,badges:[{title:'첫 기록',category:'첫 기록',status:'획득',description:'예제 배지'},{title:'기록 습관',category:'기록',status:'진행 중',description:'예제 진행 상태'},{title:'계획 습관',category:'계획',status:'진행 중',description:'예제 계획 상태'},{title:'목표 도전',category:'목표',status:'잠김',description:'예제 잠김 상태'},{title:'꾸준함',category:'꾸준함',status:'잠김',description:'예제 꾸준함 상태'},{title:'금융 학습',category:'금융 학습',status:'잠김',description:'예제 잠김 상태'}]},
 notifications:{items:[{id:'n1',category:'습관',title:'예제 소식 · 함께 살펴보기',description:'실제 발송된 알림이 아니에요.',time:'예시 시간',read:false},{id:'n2',category:'학습',title:'예제 금융 학습',description:'알림 UI 확인용 데이터예요.',time:'예시 시간',read:true}]},
 rewards:{id:'preview-reward',title:'함께 책 읽기',condition:'예제 조건 · 목표를 이야기하기',type:'함께하는 활동',reward:'함께 도서관 가기',promisedBy:'예시 보호자',status:'progress'},
 'family-connection':{status:'connected',guardians:[{name:'예시 보호자',role:'보호자',lastSeen:'실제 연결 아님'}]},
 'family-permissions':{guardians:[{name:'예시 보호자',role:'보호자'}],permissions:['습관 요약 보기','목표 보기','약속 만들기','보상 확인','계획 함께 만들기']},
 allowance:{amount:10000,frequency:'weekly',nextDate:null,startDate:'2026-09-28',enabled:false,status:'preview'},
 thoughtbox:{items:[{id:'wish-example',title:'예제 물건',amount:5000,createdAt:'예시 등록 날짜',reviewAt:'예시 · 내일',status:'생각 중'}]}
});
