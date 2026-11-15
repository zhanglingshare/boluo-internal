/* Survey bridge V1.
   The research site works BEFORE any real questionnaire arrives.
   Current 1–5 responses are synthetic scenario exercises, NOT inferred
   attitudes, empirical confidence intervals or OSINT-calibrated priors.
   Later: anonymous, versioned survey aggregates may activate descriptive
   comparison without altering the frozen baseline or silently fitting weights. */
(function(root){
'use strict';
const Evidence=root.BoluoSurveyEvidence;
if(!Evidence)return;
const GROUPS={
 industry:[{id:'large',name:'较大型企业',offset:.16},{id:'small',name:'中小微企业',offset:-.13},{id:'workers',name:'制造业员工',offset:-.04}],
 tourism:[{id:'shops',name:'本地商户',offset:.05},{id:'visitors',name:'游客',offset:.18},{id:'residents',name:'周边居民',offset:-.18}],
 talent:[{id:'employers',name:'招聘企业',offset:.08},{id:'candidates',name:'求职者',offset:-.12},{id:'flex',name:'灵活就业者',offset:-.22}],
 agriculture:[{id:'farmers',name:'农户',offset:-.17},{id:'processors',name:'加工主体',offset:-.1},{id:'distributors',name:'渠道主体',offset:.12}]
};
const DIMENSIONS={
 industry:{item_id:'business_outlook',concept:'企业经营预期',question:'未来六个月，您对经营状况的预期如何？',population:'博罗县相关企业经营主体及从业群体',units:'5点有序响应'},
 tourism:{item_id:'tourism_benefit',concept:'旅游发展体感',question:'旅游发展对您的经营或生活产生了怎样的影响？',population:'博罗县旅游相关群体',units:'5点有序响应'},
 talent:{item_id:'employment_confidence',concept:'就业与用工预期',question:'您对未来六个月的就业或用工前景持什么态度？',population:'博罗县就业相关群体',units:'5点有序响应'},
 agriculture:{item_id:'agri_outlook',concept:'农业经营预期',question:'您对下一生产季的经营状况持什么预期？',population:'博罗县农业经营相关群体',units:'5点有序响应'}
};
const MECHANISMS={
 expansion:{id:'expansion',label:'扩张解释',reason:'把公开变化作为活动扩张的候选解释'},
 friction:{id:'friction',label:'摩擦解释',reason:'把同一变化作为成本、流失或约束加剧的候选解释'}
};
const SEED=941337;
function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
function rng(seed){let a=(seed>>>0)||1;return function(){a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function normal(next){const u=Math.max(1e-8,next()),v=next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function simulate(topic='industry',options={}){
 topic=Object.prototype.hasOwnProperty.call(DIMENSIONS,topic)?topic:'industry';
 const signal=Evidence.analyze(topic),dim=DIMENSIONS[topic],mechanism=MECHANISMS[options.mechanism]||MECHANISMS.expansion;
 const pressure=clamp(Number.isFinite(Number(options.pressure))?Number(options.pressure):.4,-1,1);
 const seed=Number.isFinite(Number(options.seed))?Number(options.seed):SEED;
 const size=clamp(Math.round(Number.isFinite(Number(options.perGroup))?Number(options.perGroup):120),30,300);
 const next=rng(seed+topic.length*103+Math.floor((pressure+2)*111)+(mechanism.id==='friction'?733:0));
 const groups=GROUPS[topic].map((g,i)=>{
  // These group adjustments are *illustrative assumptions*, not estimated from OSINT.
  const direction=mechanism.id==='friction'?-1:1;
  const mean=clamp(3+pressure*.62*direction+g.offset+(i===2?-pressure*.12:0),1,5);
  const choices=[0,0,0,0,0];
  let sum=0;
  for(let n=0;n<size;n++){
   const response=clamp(Math.round(mean+normal(next)*.95),1,5);
   choices[response-1]++;sum+=response;
  }
  return {id:g.id,name:g.name,assumedCenter:mean,n:size,mean:sum/size,counts:choices,source:'synthetic',surveyed:false};
 });
 const total=groups.reduce((a,g)=>a+g.mean*g.n,0)/groups.reduce((a,g)=>a+g.n,0);
 const unique=new Set(signal.observed.map(x=>x.lineage));
 return {topic,dimension:dim,mechanism,pressure,seed,
  groups,syntheticN:groups.length*size,syntheticMean:total,
  sensitivity:{low:clamp(total-1.05,1,5),high:clamp(total+1.05,1,5)},
  evidenceCount:signal.evidenceCount,sourceFamilies:unique.size,observedSurveyN:0,
  scenarioType:'researcher-assumed-synthetic',
  intervalType:'researcher-set-illustrative-bound-not-confidence-interval',
  disclosure:'模拟回答全部由预设机制生成。公开证据未被用于估计群体均值，±1.05属于人为范围，不是置信区间；任何数值均不代表博罗真人意见。'};
}
const FROZEN={};
for(const key of Object.keys(DIMENSIONS)){
 const x=simulate(key,{pressure:.4,mechanism:'expansion',seed:SEED,perGroup:120});
 FROZEN[key]=Object.freeze({version:'shadow-v1',topic:key,item_id:DIMENSIONS[key].item_id,mean:x.syntheticMean,seed:SEED,
  mechanism:'expansion',pressure:.4,n_synthetic:x.syntheticN,model:'illustrative-only'});
}
function checkSurveyFeed(feed){
 if(!feed||typeof feed!=='object')return {ok:false,reason:'没有提供问卷数据'};
 if(feed.schema_version!=='1.0')return {ok:false,reason:'不支持的问卷汇总格式'};
 if(feed.status==='pending')return {ok:true,ready:false,reason:'尚未开展真实问卷调查'};
 if(feed.status!=='verified'||!Array.isArray(feed.datasets))return {ok:false,reason:'未通过数据版本状态检查'};
 return {ok:true,ready:true,reason:'存在待核验的匿名汇总数据集'};
}
function validateAggregate(item){
 if(!item||typeof item!=='object')return {ok:false,reason:'无有效记录'};
 const t=item.topic,dim=DIMENSIONS[t];
 if(!dim)return {ok:false,reason:'不支持的研究主题'};
 if(item.item_id!==dim.item_id)return {ok:false,reason:'问卷题项与冻结对照题项不一致'};
 if(item.scale_min!==1||item.scale_max!==5)return {ok:false,reason:'目前只接受预注册的1–5等级题项'};
 if(!item.fieldwork_start||!item.fieldwork_end||!item.population||!item.sampling_frame||!item.sampling_method)return {ok:false,reason:'缺少调查时段、总体或抽样说明'};
 if(item.population!==dim.population)return {ok:false,reason:'调查总体与原先研究对象不一致，不能直接比较'};
 if(item.fieldwork_end<item.fieldwork_start)return {ok:false,reason:'调查起止时间错误'};
 if(!Array.isArray(item.groups)||!item.groups.length)return {ok:false,reason:'未提供匿名分群汇总'};
 const accepted=new Set(GROUPS[t].map(x=>x.id)),seen=new Set();let sumWeight=0;
 for(const g of item.groups){
  if(seen.has(g.id))return {ok:false,reason:'不能重复计算同一分群'};
  seen.add(g.id);
  if(!accepted.has(g.id))return {ok:false,reason:'未注册的分群名称'};
  if(!(Number.isInteger(g.n)&&g.n>=10&&Number.isFinite(g.mean)&&g.mean>=1&&g.mean<=5&&Number.isFinite(g.weight)&&g.weight>=0))return {ok:false,reason:'分群样本量不足10或均值、总体权重不合法，不得公开小样本群体'};
  if(g.ci_low!==undefined&&g.ci_high!==undefined&&!(Number.isFinite(g.ci_low)&&Number.isFinite(g.ci_high)&&g.ci_low<=g.mean&&g.mean<=g.ci_high))return {ok:false,reason:'分群区间必须包含其调查估计均值'};
  sumWeight+=g.weight;
 }
 if(sumWeight<=0)return {ok:false,reason:'缺少可使用的总体权重'};
 return {ok:true,reason:'可用于初步描述性对照',n:item.groups.reduce((a,g)=>a+g.n,0)};
}
function compare(topic,feed){
 const checked=checkSurveyFeed(feed);
 if(!checked.ok||!checked.ready)return {mode:'pre-survey',available:false,reason:checked.reason,baseline:FROZEN[topic]};
 const item=feed.datasets.find(x=>x.topic===topic&&x.item_id===DIMENSIONS[topic]?.item_id);
 if(!item)return {mode:'pre-survey',available:false,reason:'当前主题暂无同题项真实问卷汇总',baseline:FROZEN[topic]};
 const v=validateAggregate(item);
 if(!v.ok)return {mode:'invalid',available:false,reason:v.reason,baseline:FROZEN[topic]};
 const denom=item.groups.reduce((a,g)=>a+g.weight,0);
 const mean=item.groups.reduce((a,g)=>a+g.weight*g.mean,0)/denom;
 const baseline=FROZEN[topic],difference=mean-baseline.mean;
 const profile=item.groups.map(g=>({
  id:g.id,name:GROUPS[topic].find(x=>x.id===g.id)?.name||g.id,n:g.n,weight:g.weight,mean:g.mean,
  syntheticReference:simulate(topic,{pressure:baseline.pressure,mechanism:baseline.mechanism,seed:baseline.seed}).groups.find(x=>x.id===g.id)?.mean??null
 }));
 return {mode:'descriptive-comparison-only',available:true,topic,fieldwork:[item.fieldwork_start,item.fieldwork_end],
  surveyMean:mean,nSurvey:v.n,syntheticBaseline:baseline.mean,difference,groups:profile,
  frozenVersion:baseline.version,calibrationCertified:false,
  interpretation:difference<-.35?'真人问卷平均回答低于此前模拟情景参考：应审查抽样覆盖与此前的扩张假设':
  difference>.35?'真人问卷平均回答高于此前模拟情景参考：应审查公开信号是否漏掉积极变化':
  '真人问卷均值与模拟情景参考相近；这不等于代理有效性已经得到证明',
  caution:'这里只对比既定合成情景与真实调查的加权描述均值，不称为预测误差，更不能直接修正OSINT权重。需真实OSINT代理预报、问卷测量等价与独立验证后，才可认证校准。'};
}
const API={GROUPS,DIMENSIONS,MECHANISMS,SEED,FROZEN,simulate,checkSurveyFeed,validateAggregate,compare};
root.BoluoSurveyBridge=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
