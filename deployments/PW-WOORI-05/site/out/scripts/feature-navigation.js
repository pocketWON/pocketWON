/* UI-only browser history. No drafts, user data or business actions in history. */
window.PWNavigation=(()=>{
 let render,current={screen:'home'},motion,overlay=null,popping=false,closing=false,queued=null,settled=null;const token='pw-ui-'+Date.now();let serial=0;
 const normalize=(value,nested=false)=>{if(typeof value==='string')return {screen:value};if(!value||typeof value!=='object')return null;const route={};for(const key of ['screen','featureId','stage','sourceIndex','page','segment','group','focusSource','focusAction'])if(['string','number'].includes(typeof value[key]))route[key]=value[key];if(!PW_TABS.some(t=>t.id===route.screen)&&!(route.screen==='feature'&&PW_FEATURES[route.featureId]))return {screen:'all'};if(!nested&&value.returnTo)route.returnTo=normalize(value.returnTo,true);return route;};
 function write(route,replace=false){history[replace?'replaceState':'pushState']({pocketwon:token,key:++serial,route},'',location.href);}
 function go(target,entryMotion,replace=false){const route=normalize(target);if(!route)return;if(closing||popping){queued={route,entryMotion,replace};return;}if(overlay){const cancel=overlay.cancel;cancel();queued={route,entryMotion,replace};return;}const same=JSON.stringify(current)===JSON.stringify(route);current=route;motion=entryMotion;if(!same)write(current,replace);render(current,true,motion);}
 function back(fallback={screen:'all'}){if(history.state?.pocketwon===token&&history.state.key>1)history.back();else go(fallback,undefined,true);}
 function openOverlay(cancel){if(overlay)return;overlay={cancel};history.pushState({pocketwon:token,key:++serial,route:current,overlay:true},'',location.href);}
 function releaseOverlay(cancel){if(overlay?.cancel!==cancel)return;overlay=null;if(!popping&&history.state?.pocketwon===token&&history.state.overlay){closing=true;history.back();}}
 window.addEventListener('popstate',event=>{
  if(event.state?.pocketwon!==token)return;popping=true;closing=false;
  if(overlay){const active=overlay;overlay=null;active.cancel();}
  const route=settled||normalize(event.state.route)||{screen:'home'},same=JSON.stringify(route)===JSON.stringify(current);if(settled){settled=null;current=route;write(route,true);}else current=route;if(!same&&!queued)render(route,true);
  popping=false;const pending=queued;queued=null;if(pending)go(pending.route,pending.entryMotion,pending.replace);
 });
 return Object.freeze({init(fn){render=fn;write(current,true);render(current,false);},go,back,openOverlay,releaseOverlay,settle(route){if(closing||popping){settled=route;current=route;}else{current=route;write(route,true);}},current:()=>current});
})();
