/* V7 evidence review and model-adapter gate.
   Approved observations may inform a manually specified scenario comparison.
   No observation is silently converted into an engine coefficient. */
(function(root){
'use strict';
const REVIEW_STORE='boluo-model-adapter-reviews-v1';
const PROPOSAL_STORE='boluo-model-adapter-proposals-v1';
const MAX_PROPOSALS=100;
const META={
 gdp:{aliases:['GDP','地区生产总值','生产总值'],units:['亿元','亿元人民币'],kind:'scalar',note:'当年现价核算值；必须记录核算版本。'},
 industrial:{aliases:['规上工业增加值','规上工业增加值增速','规模以上工业增加值增速','工业增加值增速'],units:['%','百分比','％'],kind:'rate',note:'必须与规上工业增加值可比价增速口径一致，不等于二产现价增速。'},
 investment:{aliases:['固定资产投资','固定资产投资增速'],units:['%','百分比','％'],kind:'rate',note:'投资同比是前置信号，不可直接换算为增加值。'},
 project_delivery:{aliases:['项目投产兑现率','项目按期投产率','项目投产兑现'],units:['%','百分比','％','兑现率','比例'],kind:'share',note:'必须明确项目批次、到期项目分母和兑现定义。'},
 local_service:{aliases:['本地生产性服务采购占比','本地服务采购占比','本地采购率','本地采购比率'],units:['%','百分比','％','比例','比率'],kind:'share',note:'必须明确本地供应商定义及采购金额分母。'},
 talent:{aliases:['技能岗位缺口率','技能人才缺口率','技能岗位空缺率'],units:['%','百分比','％','比例'],kind:'share',note:'必须明确岗位口径、招聘周期与行业覆盖。'},
 price:{aliases:['产业价格指数','工业生产者出厂价格指数','产业增加值平减指数','工业价格指数'],units:['指数','定基指数','上年同期=100','上年=100'],kind:'index',note:'价格指数的基期和覆盖范围必须可核验。'},
 outside:{aliases:['出口订单增速','外需指数','行业景气指数','出口交货值增速'],units:['%','百分比','％','指数','定基指数'],kind:'context',note:'外部周期代理变量，不等于博罗本地政策效应。'},
 sectorShare:{aliases:['第一产业占比','第二产业占比','第三产业占比'],units:['%','百分比','％'],kind:'multi',note:'三次产业结构需要同口径三条分项记录组成，单条记录不可单独入模。'},
 network:{aliases:['供应商集中度','供应链HHI','供应商连接数','网络连接密度'],units:['HHI','指数','条','个','%'],kind:'multi',note:'需要明确节点、边、方向、金额口径及去重规则。'},
 survey:{aliases:['服务可得性路径系数','服务使用路径系数','经营表现路径系数'],units:['标准化路径','路径系数','β'],kind:'multi',note:'问卷均值不能直接当作结构路径系数；须保留测量模型、样本设计和估计方法。'},
 cash:{aliases:['账期错配天数','渠道回款天数','农户回款天数'],units:['天','万元','天/万元'],kind:'multi',note:'现金流错配至少需要回款、付款和日均金额等多个维度。'}
};
const BRIDGES=[
 {key:'manufacturing',label:'制造业增长条件',variables:['industrial'],reason:'工业增加值增速只能作为制造业状态证据，不能直接变成增长冲击系数。',need:'分行业产量、订单、产能利用率、投产批次、价格折算及连续期次。'},
 {key:'project_delay',label:'项目延期条件',variables:['project_delivery','investment'],reason:'投资下降或投产兑现率都不是模型中的延期冲击强度，缺少项目批次和时滞映射。',need:'项目清单、计划投产日期、实际投产日期、项目规模及到期分母。'},
 {key:'services',label:'生产性服务条件',variables:['local_service'],reason:'本地采购比例不是服务业增加值增速，也不等于服务业对制造业的弹性。',need:'采购金额、供应商属地、供应商增加值率、行业用途及跨期交易。'},
 {key:'talent',label:'技能人才条件',variables:['talent'],reason:'岗位缺口率不是人才对产能的边际贡献，方向与滞后也未识别。',need:'岗位技能分类、空缺时长、招聘/离职、培训、工资及产能兑现数据。'},
 {key:'agriculture',label:'农业价值链条件',variables:['cash'],reason:'账期天数不能直接变成农业增加值增长参数。',need:'产量、等级、加工率、销售价格、损耗、成本、回款与农户收入的同批次记录。'}
];
function clean(v,n=300){return String(v==null?'':v).trim().slice(0,n);}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function fingerprint(r){return hash([r.id,r.record_type,r.indicator,r.period,r.geography,r.industry,r.value,r.unit,r.scope,r.source_name,r.source_url,r.evidence_grade,r.sample_n,r.population,r.sample_frame,r.aggregation,r.missing_rate].join('|'));}
function read(key,storage){try{const v=JSON.parse(storage&&storage.getItem(key)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function write(key,value,storage){try{if(!storage)return false;storage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
function normalizeText(s){return clean(s,180).toLowerCase().replace(/[\s　_\-—–·/（）()：:，,。]/g,'');}
function findVariable(id,research){return (research&&research.VARIABLES||[]).find(x=>x.id===id)||null;}
function aliasMatch(record,meta){const name=normalizeText(record.indicator);return(meta.aliases||[]).some(a=>name===normalizeText(a));}
function unitMatch(unit,meta){const u=normalizeText(unit);return(meta.units||[]).some(x=>u===normalizeText(x));}
function suggest(record){
 const matches=Object.keys(META).filter(id=>aliasMatch(record,META[id])&&unitMatch(record.unit,META[id])&&
  (META[id].kind==='multi'||record.record_type==='metric'));
 return matches.length===1?{variableId:matches[0],reason:'指标名称与单位同时命中预设映射词典。'}:
  matches.length>1?{variableId:null,reason:'命中多个候选变量，需要人工选择。'}:{variableId:null,reason:'没有可靠的自动映射，需人工核对变量定义。'};
}
function reviewMap(storage){const a=read(REVIEW_STORE,storage);return Object.fromEntries(a.map(x=>[x.id,x]));}
function validation(record,variableId,all,research,mappingNote,mappingMode,storage){
 const blockers=[],warnings=[],v=findVariable(variableId,research),meta=META[variableId];
 if(!v||!meta){blockers.push('尚未映射到研究变量。');return{ok:false,blockers,warnings,modelEligible:false};}
 if(meta.kind==='multi')blockers.push(meta.note);
 if(!unitMatch(record.unit,meta))blockers.push('单位不匹配：变量“'+v.name+'”要求 '+meta.units.join(' / ')+'，当前为 '+record.unit+'。');
 if(!aliasMatch(record,meta)&&mappingMode==='manual'&&clean(mappingNote,500).length<12)blockers.push('这是人工映射，请补充至少12个字的口径对应说明。');
 if(!aliasMatch(record,meta)&&mappingMode!=='manual')blockers.push('指标名称未命中该变量的定义词典，请重新映射或说明依据。');
 if(!record.scope||!record.source_name)blockers.push('缺少统计范围或来源名称。');
 if(!/^20\d{2}([-/](0[1-9]|1[0-2]))?([-/]([0-2]\d|3[01]))?$|^20\d{2}Q[1-4]$/i.test(String(record.period||'')))blockers.push('期次格式无效。');
 if(!Number.isFinite(Number(record.value)))blockers.push('观测值不是有效数字。');
 if(!['A','B'].includes(String(record.evidence_grade||'').toUpperCase()))blockers.push('只有A/B级可核验来源可以批准进入事实证据层；C/D仅作演示或假设。');
 if(record.source_url&&!/^https?:\/\//i.test(record.source_url))blockers.push('来源链接必须为http或https。');
 if(record.record_type==='survey_aggregate'){
  if(!Number.isInteger(Number(record.sample_n))||Number(record.sample_n)<1||!record.population||!record.sample_frame||!record.aggregation||!Number.isFinite(Number(record.missing_rate)))blockers.push('调查汇总缺少样本量、总体、抽样框、聚合方法或缺失率。');
  if(Number(record.sample_n)<30)warnings.push('样本量较小；不能仅凭样本量判断代表性。');
  warnings.push('单条调查均值不能直接替代路径系数或结构模型参数。');
 }
 if(variableId==='gdp'&&String(record.period)==='2024'&&!/最终核实|final/i.test((record.scope||'')+' '+(record.notes||'')))warnings.push('2024 GDP存在初步值与最终核实值差异，请在范围说明中标记版本。');
 if(['project_delivery','local_service','talent'].includes(variableId)&&Number(record.value)>=0&&Number(record.value)<=1)warnings.push('当前比例值处于0—1区间，请确认是比例小数还是百分数，避免重复换算。');
 if(['project_delivery','local_service','talent'].includes(variableId)&& (Number(record.value)<0||Number(record.value)>100))blockers.push('比例型变量应处于0—100范围。');
 if(variableId==='gdp'&&Number(record.value)<=0)blockers.push('GDP总量必须大于0。');
 const key=[variableId,record.period,record.geography,record.industry||'',record.scope,record.unit].join('|');
 const mappedReviews=reviewMap(storage);
 const duplicates=(all||[]).filter(x=>x.id!==record.id&&(()=>{
  const rv=mappedReviews[x.id];return rv&&rv.variableId===variableId&&[variableId,x.period,x.geography,x.industry||'',x.scope,x.unit].join('|')===key;
 })());
 if(duplicates.length){
  if(clean(mappingNote,500).length<15)blockers.push('发现同变量、同地区、同期次、同范围的其他来源记录。请核对版本，并在映射说明中记录取舍依据。');
  else warnings.push('同口径存在其他来源记录；保留多源版本，不自动平均或覆盖。');
 }
 if(variableId==='industrial')warnings.push('该指标是规上工业可比价增速，不是第二产业现价增加值增速。');
 if(variableId==='investment')warnings.push('投资增速是前置信号，不可直接换算为GDP或模型增长系数。');
 if(meta.kind!=='multi')warnings.push(meta.note);
 return{ok:blockers.length===0,blockers,warnings,modelEligible:blockers.length===0&&['A','B'].includes(String(record.evidence_grade||'').toUpperCase()),variable:{id:v.id,name:v.name,unit:v.unit}};
}
function list(observations,research,storage){
 const rows=Array.isArray(observations)?observations:[],reviews=reviewMap(storage);
 return rows.map(record=>{
  const auto=suggest(record),saved=reviews[record.id],fresh=saved&&saved.fingerprint===fingerprint(record);
  const variableId=fresh?saved.variableId:auto.variableId;
  const mappingMode=fresh?saved.mappingMode:(variableId?'auto':'none');
  const note=fresh?saved.note||'':'';
  const check=validation(record,variableId,rows,research,note,mappingMode,storage);
  let status=fresh?saved.status:(variableId?'待保存':'待映射');
  if(status==='已批准'&&!check.ok)status='待复核';
  return{record,suggestedVariable:auto.variableId,suggestionReason:auto.reason,variableId,mappingMode,note,status,validation:check};
 });
}
function setMapping(id,variableId,note,observations,research,storage){
 const record=(observations||[]).find(x=>x.id===id);if(!record)return{ok:false,error:'找不到这条观察记录。'};
 const auto=suggest(record),mode=variableId&&variableId!==auto.variableId?'manual':(variableId?'auto':'none');
 const check=validation(record,variableId,observations,research,note,mode,storage);
 const reviews=reviewMap(storage),old=reviews[id]||{};
 reviews[id]={id,fingerprint:fingerprint(record),variableId:variableId||null,mappingMode:mode,note:clean(note,500),status:variableId?'待审核':'待映射',updatedAt:new Date().toISOString(),previousStatus:old.status||null};
 const ok=write(REVIEW_STORE,Object.values(reviews),storage);
 return{ok,error:ok?'': '本地存储不可用。',validation:check};
}
function setStatus(id,status,observations,research,storage){
 if(!['已批准','退回补资料','已排除','待审核'].includes(status))return{ok:false,error:'无效审核状态。'};
 const record=(observations||[]).find(x=>x.id===id);if(!record)return{ok:false,error:'找不到这条观察记录。'};
 const reviews=reviewMap(storage),old=reviews[id];if(!old||old.fingerprint!==fingerprint(record)||!old.variableId)return{ok:false,error:'请先完成变量映射。'};
 const check=validation(record,old.variableId,observations,research,old.note,old.mappingMode,storage);
 if(status==='已批准'&&!check.ok)return{ok:false,error:check.blockers.join('；'),validation:check};
 reviews[id]={...old,status,approvedAt:status==='已批准'?new Date().toISOString():null,updatedAt:new Date().toISOString()};
 const ok=write(REVIEW_STORE,Object.values(reviews),storage);
 return{ok,error:ok?'':'本地存储不可用。',validation:check};
}
function approvedFor(parameter,items){
 const bridge=BRIDGES.find(x=>x.key===parameter);if(!bridge)return[];
 return(items||[]).filter(x=>x.status==='已批准'&&x.validation.ok&&bridge.variables.includes(x.variableId));
}
function getProposals(storage){return read(PROPOSAL_STORE,storage);}
function saveProposal(input,items,engine,storage){
 const p=input||{},bridge=BRIDGES.find(x=>x.key===p.parameter);
 if(!bridge||!engine||!engine.EFFECTS||!Object.prototype.hasOwnProperty.call(engine.EFFECTS,p.parameter))return{ok:false,error:'未知模型参数。'};
 const evidenceIds=Array.from(new Set(p.evidenceIds||[]));
 const evidence=approvedFor(p.parameter,items).filter(x=>evidenceIds.includes(x.record.id));
 if(!evidenceIds.length||evidence.length!==evidenceIds.length)return{ok:false,error:'必须关联至少一条已批准、且与该参数相关的证据。'};
 if(clean(p.note,1000).length<15)return{ok:false,error:'请说明至少15个字的情景解释，避免把滑杆调整伪装成数据估计。'};
 const before=p.before||{},after=p.after||{},key=p.parameter;
 const lo=key==='project_delay'?0:-1,hi=1;
 if(!Number.isFinite(Number(after.knobs&&after.knobs[key]))||Number(after.knobs[key])<lo||Number(after.knobs[key])>hi)return{ok:false,error:'候选参数超出模型允许范围。'};
 const base=engine.normalize(before),candidate=engine.normalize(after);
 if(candidate.knobs[key]===base.knobs[key])return{ok:false,error:'候选参数与当前基准相同，没有形成对照。'};
 const summary=x=>({p10:Number(x.p10),p50:Number(x.p50),p90:Number(x.p90),hit:Number(x.hit)});
 const proposal={id:'P-'+hash([key,candidate.knobs[key],base.seed,evidenceIds.join(','),Date.now()].join('|')),parameter:key,label:bridge.label,
  evidenceIds,note:clean(p.note,1000),before:base,after:candidate,baseline:summary(p.baseline),candidate:summary(p.candidate),
  deltaP50:Number(p.candidate.p50)-Number(p.baseline.p50),createdAt:new Date().toISOString(),
  status:'情景提案 · 未应用',disclaimer:'数据仅提供情境依据；参数值由研究者手动指定，不是由数据估计的系数。未改变默认基准或正式模型。'};
 const all=getProposals(storage);all.unshift(proposal);
 const ok=write(PROPOSAL_STORE,all.slice(0,MAX_PROPOSALS),storage);
 return{ok,proposal:ok?proposal:null,error:ok?'':'本地存储不可用。'};
}
const API={REVIEW_STORE,PROPOSAL_STORE,META,BRIDGES,fingerprint,suggest,validation,list,setMapping,setStatus,approvedFor,getProposals,saveProposal};
root.BoluoAdapter=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
