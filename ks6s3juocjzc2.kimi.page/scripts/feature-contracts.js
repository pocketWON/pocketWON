/**
 * Contracts are UI projections, not stored-schema extensions or business policies.
 * @typedef {'active'|'preview'|'upcoming'|'unavailable'|'empty'|'error'} FeatureState
 * @typedef {'unavailable'|'idle'|'preparing'|'ready'|'loading'|'success'|'empty'|'error'} AIViewState
 * @typedef {'stored'|'mock'|'unavailable'} FeatureSource
 * @typedef {{code:string,message:string,canRetry:boolean}} FeatureError
 * @typedef {{featureId:string,featureState:FeatureState,aiState:AIViewState,data:Object,source:FeatureSource,period:(string|null),emptyReason:('insufficient-records'|'no-data'|null),error:(FeatureError|null)}} FeatureEnvelope
 * @typedef {{name:string,status:(string|null),description:(string|null)}} HabitFactor
 * @typedef {{score:(number|null),previousScore:(number|null),change:(number|null),factors:HabitFactor[],summary:(string|null),analyzedAt:(string|null)}} HabitAnalysisData
 * @typedef {{title:(string|null),message:(string|null),nextAction:(string|null),reasons:string[],alternatives?:{title:string,message:string}[]}} CoachingData
 * @typedef {{period:(string|null),summary:(string|null),highlights:string[],changes:string[],watchPoints:string[],insights:{title:string,message:string}[],analyzedAt:(string|null)}} AIReportData
 * @typedef {{period:(string|null),summary:(string|null),strengths:string[],highlights:string[],goalProgress:({title:string,current:number,target:number}|null),conversationTopics:string[],nextPlan:(string|null)}} ParentSummaryData
 * @typedef {{allowance:(number|null),spendingBudget:(number|null),savingBudget:(number|null),goalBudget:(number|null),freeBudget:(number|null),recommendations:{title:string,reason:string}[]}} NextPlanData
 * @typedef {{amount:(number|null),merchant:(string|null),date:(string|null),category:(string|null),memo:(string|null)}} ReceiptData
 * @typedef {{suggestedCategory:(string|null),confidence:(number|null),reason:(string|null)}} CategorySuggestionData
 * @typedef {{id:string,question:string,options:string[],answer:number,explanation:string,why:string}} QuizQuestion
 * @typedef {{topic:(string|null),difficulty:(string|null),questions:QuizQuestion[],learning:string[],nextLearning:(string|null)}} QuizData
 * @typedef {{questions:string[]}} ReflectionData
 * @typedef {{current:(number|null),best:(number|null),recordedDates:string[]}} StreakData
 * @typedef {{points:(number|null),badges:{title:string,category?:string,status:string,description:string,progress?:number}[]}} BadgeData
 * @typedef {{id:(string|null),title:(string|null),goal:(string|null),condition:(string|null),type:(string|null),reward:(string|null),promisedBy:(string|null),status:string}} RewardPromiseData
 * @typedef {{amount:(number|null),frequency:(string|null),weekday:(string|null),monthDay:(number|null),nextDate:(string|null),startDate:(string|null),enabled:boolean,status:string}} AllowanceData
 * @typedef {{consent:(boolean|null),guardianConsent:(boolean|null),sharing:(Object|null),guardians:Object[],policy:(string|null)}} PrivacyData
 * @typedef {{id:string,category:string,title:string,description:string,time:(string|null),read:boolean}} NotificationItem
 * @typedef {{record:boolean,report:boolean,goal:boolean,reward:boolean,learning:boolean,time:(string|null)}} NotificationPreferences
 * @typedef {{title:string,amount:number,createdAt:(string|null),reviewAt:(string|null),status:string}} ThoughtItem
 * @typedef {{name:string,role:string,lastSeen:(string|null)}} GuardianSummary
 * @typedef {{status:string,guardians:GuardianSummary[]}} FamilyConnectionData
 * @typedef {{guardians:GuardianSummary[],permissions:(string|Object)[]}} FamilyPermissionData
 * @typedef {{sync:string,export:string,deletion:string}} DataStatus
 * @typedef {{accounts:Object[],available:(number|null)}} FinanceData
 * @typedef {{card:(Object|null),available:(number|null)}} CardData
 * @typedef {{getFeatureViewState:function(string,{signal:AbortSignal,loaded:Object}):Promise<FeatureEnvelope|null>}} FeatureProvider
 *
 * Current producers: Unavailable + Mock only. No real provider/transport exists.
 * Future adapter must validate incoming fields against these nullable contracts,
 * retain explicit source/period/error semantics, respect AbortSignal, and return
 * an envelope through getFeatureViewState. UI.request suppresses aborted/late
 * results; app generation prevents an old response replacing a different view.
 * UI factories accept resolved envelopes outside navigation/history. Raw images,
 * user drafts, financial payloads and provider results never belong in history.
 * Receipt-to-preview mapper is separate from all original record form drafts.
 */
