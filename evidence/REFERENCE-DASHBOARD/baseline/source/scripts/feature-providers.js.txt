/* Only unavailable and fixture providers exist. No transport or real AI provider. */
const PWFeatureProviders=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 function get(id,loaded={status:'empty',state:null}){
  const info=PW_FEATURES[id],requested=PWPreview.state(id),state=Object.values(AI_FEATURE_STATE).includes(requested)?requested:'preparing';
  let data=PWFeatureModels.empty(id),source='unavailable',effective=info?.ai?'preparing':'empty';
  if(PWPreview.enabled){effective=state;source='mock';if(['success','ready'].includes(state)){data={...data,...clone(AI_PREVIEW_MOCK[id]||FEATURE_PREVIEW_MOCK[id]||{})};if(id==='habit-analysis'&&PWPreview.scenario==='zero')data.score=0;if(id==='habit-analysis'&&PWPreview.scenario==='max')data.score=100;if(id==='habit-analysis'&&PWPreview.scenario==='fraction')data.score=82.123456789;if(id==='habit-analysis'&&['zero','max','fraction'].includes(PWPreview.scenario)){data.previousScore=null;data.change=null;}if(PWPreview.scenario==='long'){for(const key of ['summary','message','title','reason'])if(typeof data[key]==='string')data[key]=data[key].repeat(18);}}}
  return {featureId:id,featureState:PWPreview.enabled?'preview':info?.state||'upcoming',aiState:effective,data,source,period:null,emptyReason:PWPreview.scenario==='insufficient'?'insufficient-records':'no-data',error:effective==='error'?{code:'PREVIEW',message:'결과를 불러오지 못한 화면의 개발용 예시',canRetry:true}:null};
 }
 const unavailable=Object.freeze({name:'unavailable',read(id){return {featureId:id,aiState:'preparing',data:PWFeatureModels.empty(id),source:'unavailable'};}});
 const mock=Object.freeze({name:'mock',read(id,loaded){return get(id,loaded);}});
 return Object.freeze({get,unavailable,mock,getFeatureViewState(id,{signal,loaded}={}){if(signal?.aborted)return Promise.resolve(null);return Promise.resolve(get(id,loaded));}});
})();
