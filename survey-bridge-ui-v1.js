/* Survey/OSINT demonstration renderer: outputs front-stage observable facts,
   alternative readings and adjustable, clearly synthetic group scenarios.
   Real survey comparisons are activated only by a verified anonymous-aggregate feed. */
(function(root){
'use strict';
const Evidence=root.BoluoSurveyEvidence,Bridge=root.BoluoSurveyBridge;
if(!Evidence||!Bridge)return;
const esc=x=>String(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const f=x=>Number(x).toFixed(2);
const chip=(x)=>'<span class="v6-chip">'+esc(x)+'</span>';
function groupBars(x){
 return '<div class="sb-group-bars">'+x.groups.map(g=>{
  const percent=(g.mean-1)/4*100;
  return '<div class="sb-group-row"><div class="sb-group-head"><b>'+esc(g.name)+'</b>'+
   '<span>合成情景均值 '+f(g.mean)+' <small>/ 5</small></span></div>'+
   '<div class="sb-group-track"><i style="width:'+percent+'%"></i><em style="left:50%"></em></div>'+
   '<div class="sb-group-distribution">'+g.counts.map((c,i)=>'<span title="'+(i+1)+'分：'+c+'份合成回答" style="height:'+(c/g.n*95+5)+'%"></span>').join('')+'</div></div>';
 }).join('')+'</div>';
}
function observed(signal){
 if(!signal.observed.length)return '<div class="v6-empty-signals">目前尚无可核验的公开材料入库。<b>这不代表该群体不存在变化。</b></div>';
 return '<div class="sb-evidence-list">'+signal.observed.map(x=>
  '<div class="v6-evidence-card"><div><small>'+esc(x.date)+' · '+esc(x.source_type)+'</small>'+
  '<strong>'+esc(x.name)+'</strong><span>'+esc(x.description)+'</span></div>'+
  '<a href="'+esc(x.source)+'" rel="noopener noreferrer" target="_blank">查看资料 ↗</a></div>').join('')+'</div>';
}
function compareBox(result){
 if(!result.available)return '<div class="sb-survey-pending"><div class="sb-pending-symbol">◎</div>'+
 '<div><b>真实问卷尚未接入</b><p>'+esc(result.reason||'匿名汇总待提交')+
 '。已建立可验证的计算接口，未来可计算分群差异与冻结情景对照。</p></div></div>';
 return '<div class="sb-real-results"><div class="sb-real-badges"><span>真人问卷已核验</span><span>仅描述性比较，未认证校准</span></div>'+
 '<div class="v6-facts"><div class="v6-metric"><small>真实样本量</small><strong>'+result.nSurvey+'</strong></div>'+
 '<div class="v6-metric"><small>真实加权题项均值</small><strong>'+f(result.surveyMean)+'</strong></div>'+
 '<div class="v6-metric"><small>相对冻结合成情景</small><strong>'+(result.difference>0?'+':'')+f(result.difference)+'</strong></div></div>'+
 '<p class="v6-brief">'+esc(result.interpretation)+'</p>'+
 '<p class="micro">'+esc(result.caution)+'</p></div>';
}
function render(ctx={}){
 const topic=Object.prototype.hasOwnProperty.call(Bridge.DIMENSIONS,ctx.signalTopic)?ctx.signalTopic:'industry';
 const signal=Evidence.analyze(topic),exp=Bridge.simulate(topic,{pressure:ctx.surveyPressure??.4,
  mechanism:ctx.surveyMechanism||'expansion',seed:ctx.seed||Bridge.SEED,perGroup:120});
 const comparison=Bridge.compare(topic,ctx.realSurveyFeed||{schema_version:'1.0',status:'pending',datasets:[]});
 const tabs='<div class="v6-topic-tabs">'+Evidence.TOPICS.map(t=>'<button type="button" data-survey-topic="'+t.id+'" class="'+(t.id===topic?'active':'')+'">'+esc(t.label)+'</button>').join('')+'</div>';
 return '<section class="sb-research-lab"><div class="v6-lead"><span>两条证据链 · 一套可重跑的研究实验</span>'+
 '<h2>公开世界有什么迹象？假设改变后，会发生什么？</h2>'+
 '<p>现实证据和模拟回答分开展示。现在可以运行情景，未来真人问卷会用来检查这些假设。</p></div>'+tabs+
 '<div class="sb-top-stats">'+
 '<div><span>公开材料</span><strong>'+signal.evidenceCount+' <small>条</small></strong></div>'+
 '<div><span>独立原始来源</span><strong>'+signal.independentOrigins+' <small>组</small></strong></div>'+
 '<div><span>真实问卷</span><strong>'+ (comparison.available?comparison.nSurvey:0)+' <small>份</small></strong></div>'+
 '<div><span>群体真实倾向</span><strong class="sb-unknown">'+(comparison.available?'已观测':'未测量')+'</strong></div></div>'+
 '<div class="sb-two-columns"><article class="v6-panel"><div class="sb-panel-head"><h3>现实信号</h3>'+
 chip('已登记来源')+'</div>'+
 observed(signal)+
 '<details class="sb-explainer"><summary>这些迹象可能有哪些相反解释？</summary>'+
 '<div class="sb-alternatives">'+signal.interpretations.map((s,i)=>'<div><span>'+('0'+(i+1))+'</span>'+esc(s)+'</div>').join('')+'</div>'+
 '<p>还缺：'+esc(signal.gap)+'</p></details></article>'+
 '<article class="v6-panel"><div class="sb-panel-head"><h3>换个假设，观察群体差异</h3>'+chip('全合成实验')+'</div>'+
 '<div class="sb-mechanisms">'+Object.values(Bridge.MECHANISMS).map(m=>
 '<button type="button" class="'+(exp.mechanism.id===m.id?'active':'')+'" data-survey-mechanism="'+m.id+'">'+esc(m.label)+'</button>').join('')+'</div>'+
 '<div class="sliderrow"><label>情景冲击强度 <output>'+Number(exp.pressure).toFixed(2)+'</output></label>'+
 '<input type="range" data-survey-pressure min="-1" max="1" step="0.1" value="'+exp.pressure+'" aria-label="情景冲击强度"></div>'+
 groupBars(exp)+
 '<div class="sb-scenario-summary"><b>合成平均回应：'+f(exp.syntheticMean)+'/5</b>'+
 '<small>敏感性示意：'+f(exp.sensitivity.low)+'–'+f(exp.sensitivity.high)+'（不是置信区间）</small></div>'+
 '<button type="button" data-action="survey-to-wind" class="primary sb-wind-link">把此情景放进风洞，看看后果</button>'+
 '<p class="micro">模拟样本共'+exp.syntheticN+'份，由设定参数生成，并非从公开材料预测出的真实问卷。</p></article></div>'+
 '<article class="v6-panel sb-calibration"><div class="sb-panel-head"><h3>未来调查校验</h3>'+
 chip(comparison.available?'已接入匿名汇总':'等待真人问卷')+'</div>'+
 compareBox(comparison)+
 '<details class="sb-explainer"><summary>未来会调查什么，以及如何判断模型是否有用？</summary>'+
 '<p><b>'+esc(exp.dimension.concept)+'</b>：'+esc(exp.dimension.question)+'</p>'+
 '<p>调查对象：'+esc(exp.dimension.population)+'</p>'+
 '<p>入库后首先做同一题项、同一总体与调查时段的描述性对照；再使用未参与调参的真实样本，评估代理信号是否具有样本外预测能力。</p>'+
 '<p>既有合成情景永久保留，不用真人问卷倒改旧结果。</p></details></article>'+
 '<div class="v6-disclaimer">'+chip('可运行：情景与合成分群')+
 chip('尚未实现：真实代理校准')+chip('不把合成结果并入真实GDP预测')+'</div></section>';
}
const API={render,groupBars,compareBox};
root.BoluoSurveyBridgeUI=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
