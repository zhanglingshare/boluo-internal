/* V6: evidence-led problem discovery.
   It screens comparable observations; it does not infer causality or claim real-time monitoring.
   Only anonymized aggregate survey rows and aggregate indicators are accepted. */
(function(root){
'use strict';
const STORE='boluo-research-observations-v1';
const STATUS_STORE='boluo-research-discovery-status-v1';
const MAX_ROWS=500,MAX_BYTES=2*1024*1024;
const ALLOWED=['record_type','indicator','period','geography','industry','value','unit','scope','source_name','source_url','evidence_grade','sample_n','population','sample_frame','aggregation','missing_rate','notes'];
const FORBIDDEN=/(姓名|手机号|手机号码|电话|身份证|身份证号|家庭住址|详细地址|联系人|个人ID|员工ID|respondent|employee_id|person_id|phone|email|id_card)/i;
function safeText(v,n=240){return String(v==null?'':v).trim().slice(0,n);}
function parseCsv(text){
 const input=String(text||'');
 if(input.length>MAX_BYTES)return {rows:[],errors:['文件超过2MB限制。']};
 const matrix=[];let row=[],cell='',quoted=false;
 for(let i=0;i<input.length;i++){
  const ch=input[i];
  if(quoted){
   if(ch==='"'&&input[i+1]==='"'){cell+='"';i++;}
   else if(ch==='"')quoted=false;
   else cell+=ch;
  }else if(ch==='"'){if(cell.length)return {rows:[],errors:['CSV引号格式错误。']};quoted=true;}
  else if(ch===','){row.push(cell);cell='';}
  else if(ch==='\n'){row.push(cell);matrix.push(row);row=[];cell='';}
  else if(ch!=='\r')cell+=ch;
 }
 if(quoted)return {rows:[],errors:['CSV存在未闭合引号。']};
 if(cell.length||row.length){row.push(cell);matrix.push(row);}
 const nonempty=matrix.filter(r=>r.some(c=>String(c).trim()!==''));
 if(nonempty.length<2)return {rows:[],errors:['没有可导入的数据行。']};
 const headers=nonempty[0].map(x=>safeText(x,80).replace(/^\uFEFF/,'').toLowerCase());
 if(headers.some(h=>FORBIDDEN.test(h)))return {rows:[],errors:['检测到个人身份或联系方式字段。仅接受匿名汇总数据，已拒绝整个文件。']};
 const unknown=headers.filter(h=>!ALLOWED.includes(h));
 if(unknown.length)return {rows:[],errors:['存在不支持的字段：'+unknown.join('、')+'。请使用标准模板。']};
 const missing=['record_type','indicator','period','geography','value','unit','scope','source_name','evidence_grade'].filter(h=>!headers.includes(h));
 if(missing.length)return {rows:[],errors:['缺少必需列：'+missing.join('、')+'。']};
 if(nonempty.length-1>MAX_ROWS)return {rows:[],errors:['单次最多导入500条汇总记录。']};
 const errors=[],rows=[];
 nonempty.slice(1).forEach((cells,index)=>{
  const obj={};headers.forEach((h,i)=>obj[h]=safeText(cells[i],h==='notes'?500:500));
  const line=index+2;
  const type=obj.record_type;
  if(!['metric','survey_aggregate'].includes(type)){errors.push('第'+line+'行：record_type只能是metric或survey_aggregate。');return;}
  if(!obj.indicator||!obj.period||!obj.geography||!obj.unit||!obj.scope||!obj.source_name){errors.push('第'+line+'行：指标、期次、地区、单位、统计范围和来源名称不能为空。');return;}
  if(!/^20\d{2}([-/](0[1-9]|1[0-2]))?([-/]([0-2]\d|3[01]))?$|^20\d{2}Q[1-4]$/i.test(obj.period)){errors.push('第'+line+'行：期次请使用YYYY、YYYY-MM、YYYY-MM-DD或YYYYQ1格式。');return;}
  const value=Number(obj.value);
  if(!Number.isFinite(value)){errors.push('第'+line+'行：value必须是数字。');return;}
  const grade=String(obj.evidence_grade||'').toUpperCase();
  if(!['A','B','C','D'].includes(grade)){errors.push('第'+line+'行：evidence_grade只能是A/B/C/D。');return;}
  const url=safeText(obj.source_url,500);
  if(url&&!/^https?:\/\//i.test(url)){errors.push('第'+line+'行：source_url必须是http或https链接。');return;}
  const record={id:'obs-'+(index+1)+'-'+hash([type,obj.indicator,obj.period,obj.geography,obj.scope,obj.source_name,value].join('|')),
   record_type:type,indicator:safeText(obj.indicator,100),period:obj.period.toUpperCase(),geography:safeText(obj.geography,80),
   industry:safeText(obj.industry,80),value,unit:safeText(obj.unit,24),scope:safeText(obj.scope,120),
   source_name:safeText(obj.source_name,120),source_url:url,evidence_grade:grade,
   sample_n:null,population:'',sample_frame:'',aggregation:'',missing_rate:null,notes:safeText(obj.notes,500),importedAt:new Date().toISOString()};
  if(type==='survey_aggregate'){
   const n=Number(obj.sample_n),miss=Number(obj.missing_rate);
   if(!Number.isInteger(n)||n<1||!obj.population||!obj.sample_frame||!['mean','median','share','count'].includes(obj.aggregation)||!Number.isFinite(miss)||miss<0||miss>100){
    errors.push('第'+line+'行：调查汇总必须提供正整数sample_n、population、sample_frame、aggregation(mean/median/share/count)和0—100的missing_rate。');return;
   }
   record.sample_n=n;record.population=safeText(obj.population,120);record.sample_frame=safeText(obj.sample_frame,200);
   record.aggregation=obj.aggregation;record.missing_rate=miss;
  }
  rows.push(record);
 });
 return {rows,errors};
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function load(storage){
 try{const a=JSON.parse(storage&&storage.getItem(STORE)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}
}
function save(rows,storage){
 try{if(!storage)return false;storage.setItem(STORE,JSON.stringify(rows.slice(-MAX_ROWS)));return true;}catch(e){return false;}
}
function importCsv(text,storage){
 const parsed=parseCsv(text);if(parsed.errors.length)return {ok:false,imported:0,errors:parsed.errors,total:load(storage).length};
 const old=load(storage),seen=new Set(old.map(x=>x.id)),fresh=parsed.rows.filter(x=>!seen.has(x.id));
 const merged=old.concat(fresh).slice(-MAX_ROWS),ok=save(merged,storage);
 return {ok,imported:ok?fresh.length:0,skipped:parsed.rows.length-fresh.length,errors:ok?[]:['浏览器本地存储不可用，数据未保存。'],total:old.length+(ok?fresh.length:0)};
}
function clear(storage){try{storage.removeItem(STORE);return true;}catch(e){return false;}}
function readStatuses(storage){try{return JSON.parse(storage&&storage.getItem(STATUS_STORE)||'{}')||{};}catch(e){return {};}}
function setStatus(id,status,storage){if(!['new','investigating','verified','dismissed'].includes(status))return false;try{const s=readStatuses(storage);s[id]=status;storage.setItem(STATUS_STORE,JSON.stringify(s));return true;}catch(e){return false;}}
function median(a){if(!a.length)return 0;const x=a.slice().sort((u,v)=>u-v),m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;}
function issue(data,storage){const statuses=readStatuses(storage);return Object.assign({},data,{status:statuses[data.id]||'new'});}
function builtIn(ctx,storage){
 const V3=ctx.v3||{},V4=ctx.v4||{},ind=V3.INDICATORS||[],industries=V3.INDUSTRIES||[],targets=V3.TARGETS||[],conflicts=V3.CONFLICTS||[];
 const find=(name)=>ind.find(x=>x.name===name);
 const invest=find('固定资产投资'),industrial=find('规上工业增加值'),electric=find('工业用电量');
 const out=[];
 if(invest&&industrial){
  out.push(issue({id:'discovery-public-industrial-investment',kind:'divergence',tier:'watch',area:'data',title:'工业产出与投资方向背离',metric:'工业 '+(industrial.value>0?'+':'')+industrial.value+'%  /  投资 '+(invest.value>0?'+':'')+invest.value+'%',summary:'两个公开指标方向相反。这是结构信号，不是因果结论，也不等于工业危机。',evidence:[industrial.name+' '+industrial.value+'%（'+industrial.basis+'）',invest.name+' '+invest.value+'%（'+invest.basis+'）'].concat(electric?[electric.name+' '+electric.value+'%']:[]),alternatives:['存量产能释放或前期项目形成产出','新项目从投资到投产存在时间差','外需、订单和产品结构变化','统计范围、价格和指标口径差异'],falsifier:'若新增投产、订单与产能利用率数据不能支持存量产能或项目时滞解释，应调整判断。',nextStep:'按行业和项目批次补充订单、产能利用率、实际投产时间与工业投资。',grade:'A/B · 公开统计',source:'2025博罗公开统计',destination:'data'},storage));
 }
 if(industries.length){
  const sorted=industries.slice().sort((a,b)=>a.growth-b.growth),lo=sorted[0],hi=sorted[sorted.length-1],spread=hi.growth-lo.growth;
  out.push(issue({id:'discovery-industry-dispersion',kind:'dispersion',tier:'watch',area:'data',title:'工业内部冷热差距值得追问',metric:hi.name+' +'+hi.growth.toFixed(1)+'%  /  '+lo.name+' '+lo.growth.toFixed(1)+'%',summary:'已披露重点行业的增速跨度为'+spread.toFixed(1)+'个百分点。它提示行业内部并不同步，不代表全县工业全貌。',evidence:sorted.map(x=>x.name+' '+(x.growth>0?'+':'')+x.growth.toFixed(1)+'%'),alternatives:['行业需求周期不同','产品价格与实物产量变化不同','规上企业样本进出影响结构','企业内部产品线分化'],falsifier:'若补齐行业全量数据后，极端行业不再具有代表性，需降低该线索优先级。',nextStep:'补齐重点行业企业数量、实物产量、订单和企业进出样本。',grade:'A/B · 部分行业披露',source:'2025规上工业重点行业',destination:'data'},storage));
 }
 const target=targets.find(x=>x.name==='固定资产投资');
 if(target){
  out.push(issue({id:'discovery-target-investment-gap',kind:'target_gap',tier:'watch',area:'mission',title:'固定资产投资与年度目标存在明显落差',metric:'差 '+target.gap.toFixed(1)+' 个百分点',summary:'年度目标增速与实际增速相差'+Math.abs(target.gap).toFixed(1)+'个百分点。比较的是增速，不是投资金额缺口。',evidence:['计划目标 '+target.goal+'%','公布实际 '+target.actual+'%',target.note],alternatives:['项目开工与入库节奏变化','房地产投资下行拖累总投资','产业投资结构与项目规模变化','目标制定口径与实际统计口径不同'],falsifier:'若项目入库口径或目标统计范围不一致，先修正可比性，再判断执行差距。',nextStep:'拆分工业、房地产、基础设施和民间投资，补项目入库与完成额。',grade:'A/B · 计划与统计对照',source:'2025计划与统计公报',destination:'data'},storage));
 }
 const pending=conflicts.filter(x=>x.state==='待查');
 if(pending.length){
  out.push(issue({id:'discovery-source-conflicts',kind:'conflict',tier:'review',area:'data',title:'公开材料存在'+pending.length+'项待核口径冲突',metric:pending.length+' 项待核',summary:'先解决同一指标的统计范围、时点和版本差异，否则后续模型会把口径误差当成经济变化。',evidence:pending.map(x=>x.name+'：'+x.a+'；'+x.b),alternatives:['统计范围不同','基期或核算版本修订','截止日期不同','转载或摘录时口径丢失'],falsifier:'取得同口径原始表并完成版本核对后，冲突可关闭或重新分类。',nextStep:'优先核验社零、财政收入和高新技术企业数量口径。',grade:'A/B · 多源材料',source:'V3证据冲突清单',destination:'data'},storage));
 }
 const readiness=V4.evidenceReadiness?V4.evidenceReadiness():[];
 const missing=readiness.filter(x=>x.status==='关键数据缺失');
 if(missing.length){
  out.push(issue({id:'discovery-critical-data-gaps',kind:'gap',tier:'review',area:'models',title:'关键产业机制仍缺少可识别数据',metric:missing.length+' 个关键缺口',summary:'公开数据能显示部分结果，却不能替代企业真实采购、项目兑现和本地价值留存数据。',evidence:missing.map(x=>x.title+'：'+x.need),alternatives:['先做匿名企业汇总调查','用项目批次数据补时间顺序','明确哪些问题公开资料无法识别'],falsifier:'取得有覆盖说明、统计范围和版本记录的实际数据后，逐项重评可识别性。',nextStep:'优先补企业匿名采购地、供应商所在地、项目投产批次和本地服务采购。',grade:'数据缺口 · 非风险结论',source:'V4证据可得性矩阵',destination:'models'},storage));
 }
 const basket=V4.OSINT_BASKET;
 if(basket&&basket.constructs){
  const blind=basket.constructs.filter(x=>x.layer==='blindspot');
  const proxy=basket.constructs.filter(x=>x.layer==='proxy');
  out.push(issue({id:'discovery-survey-blindspots',kind:'survey_gap',tier:'review',area:'survey',title:'公开资料看不到的经营问题，需要企业调查',metric:blind.length+' 个核心盲区 / '+proxy.length+' 个代理变量',summary:'公开统计可说明县域结果，但企业经营表现、供应链关系和服务采购去向仍需要匿名调查补齐。',evidence:basket.constructs.map(x=>x.name+'：'+x.surveyNeed),alternatives:['企业匿名汇总调查','按行业、规模、园区分层抽样','用公开代理指标与调查结果交叉验证'],falsifier:'若有可核验的行政汇总数据覆盖相同变量，问卷的必要性和题项需相应调整。',nextStep:'先定义抽样框、行业分层、题项口径和匿名汇总规则，再发放问卷。',grade:'公开盲区识别 · 非实测',source:'V4公开信号到问卷需求映射',destination:'survey'},storage));
 }
 return out;
}
function importedIssues(rows,storage){
 const usable=(rows||[]).filter(x=>x.evidence_grade!=='D');
 const out=[],groups=new Map();
 usable.forEach(x=>{const k=[x.record_type,x.indicator,x.geography,x.industry||'',x.scope,x.unit].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);});
 groups.forEach((items,key)=>{
  const byPeriod=new Map();items.forEach(x=>{if(!byPeriod.has(x.period))byPeriod.set(x.period,[]);byPeriod.get(x.period).push(x);});
  byPeriod.forEach((same,period)=>{
   if(same.length>1){
    const vals=same.map(x=>x.value),spread=Math.max(...vals)-Math.min(...vals),base=Math.max(1,...vals.map(Math.abs)),threshold=same[0].unit==='%'?1:base*.05;
    if(spread>threshold){
     out.push(issue({id:'import-conflict-'+hash(key+'|'+period),kind:'conflict',tier:'review',area:'data',title:'同一指标出现不同来源数值',metric:same[0].indicator+' · '+period,summary:'相同地区、统计范围和期次下出现不同数值。先核对口径，不自动选取较大或较新的数。',evidence:same.map(x=>x.source_name+'：'+x.value+' '+x.unit+'（'+x.evidence_grade+'级）'),alternatives:['统计范围或样本范围不同','初步值与修订值不同','单位或计算方法不同','来源转录错误'],falsifier:'回到原始表并确认范围、版本和单位后，差异可能消失或需要保留为版本差。',nextStep:'核对来源原表、统计时点、样本范围、单位和修订状态。',grade:'导入数据 · 待复核',source:'本地导入汇总数据',destination:'data'},storage));
    }
   }
  });
  if(items[0].record_type==='metric'){
   const series=items.slice().sort((a,b)=>a.period.localeCompare(b.period));
   if(series.length>=5){
    const deltas=[];for(let i=1;i<series.length;i++)deltas.push(series[i].value-series[i-1].value);
    const mid=median(deltas),mad=median(deltas.map(x=>Math.abs(x-mid))),last=deltas[deltas.length-1];
    const threshold=Math.max(2.5*mad,series[0].unit==='%'?1:Math.max(.01,Math.abs(mid)*2));
    if(Math.abs(last-mid)>threshold){
     const latest=series[series.length-1],prev=series[series.length-2];
     out.push(issue({id:'import-anomaly-'+hash(key),kind:'anomaly',tier:'watch',area:'data',title:'发现一项时间序列异常候选',metric:latest.indicator+' '+(last>0?'+':'')+last.toFixed(2)+' '+latest.unit,summary:latest.geography+' '+latest.indicator+' 在'+prev.period+'至'+latest.period+'的变化，偏离该序列此前变化节奏。当前仅是统计筛查候选。',evidence:['历史变化中位数 '+mid.toFixed(2)+' '+latest.unit,'历史变化MAD '+mad.toFixed(2)+' '+latest.unit,'最新变化 '+last.toFixed(2)+' '+latest.unit,'有效期次数 '+series.length],alternatives:['真实结构变化','统计口径或样本范围改变','一次性冲击或季节因素','录入、单位或版本错误'],falsifier:'核对原始来源、口径与后续期次；若修订后回归常态或后续反转，不应保留为持续异常。',nextStep:'复核最新数据并补充同期行业、企业规模或相关指标作交叉验证。',grade:'本地导入 · 统计候选',source:'MAD稳健变化筛查（仅用于线索排序）',destination:'data'},storage));
    }
   }
  }
 });
 const survey=usable.filter(x=>x.record_type==='survey_aggregate');
 survey.forEach(x=>{
  out.push(issue({id:'import-survey-'+x.id,kind:'survey',tier:'review',area:'survey',title:'新增一条匿名调查汇总观察',metric:x.indicator+' · '+x.value+' '+x.unit,summary:x.period+'，'+x.geography+'，样本量n='+x.sample_n+'。'+(x.sample_n<30?'样本量较小，只作描述性线索。':'样本量本身不能证明代表性，仍需检查抽样框、覆盖和权重。'),evidence:['统计方式：'+x.aggregation,'总体定义：'+x.population,'抽样框：'+x.sample_frame,'缺失率：'+x.missing_rate+'%','来源：'+x.source_name],alternatives:['样本覆盖偏向某类企业','行业、规模或地区构成变化','真实经营态度或表现变化'],falsifier:'若抽样框、权重或缺失处理改变，结果可能发生变化；需与后续批次和公开指标对照。',nextStep:'按行业、规模和地区分层复核，检查缺失率与样本覆盖后再进入模型。',grade:'匿名调查汇总 · '+x.evidence_grade,source:x.source_name,destination:'survey'},storage));
 });
 return out;
}
function discover(ctx){
 ctx=ctx||{};const storage=ctx.storage,rows=ctx.observations||load(storage);
 return builtIn(ctx,storage).concat(importedIssues(rows,storage)).sort((a,b)=>({watch:0,review:1}[a.tier]??2)-({watch:0,review:1}[b.tier]??2));
}
const API={STORE,STATUS_STORE,ALLOWED,parseCsv,load,save,importCsv,clear,discover,median};
root.BoluoDiscovery=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
