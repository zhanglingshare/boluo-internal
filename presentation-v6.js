/* Visual-first presentation facade. It shows observable findings and safe controls;
   advanced material is secondary. This is UX, not a protection boundary for JS source. */
(function(root){
'use strict';
const E=root.BoluoEngine,V4=root.BoluoV4,V4V=root.BoluoV4Viz,V5=root.BoluoV5,V5V=root.BoluoV5Viz;
if(!E||!V4||!V5)return;
const esc=x=>String(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const n=(x,d=1)=>Number(x).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const plus=x=>(x>0?'+':'')+n(x);
const action=(name,label,kind='secondary')=>'<button type="button" data-action="'+name+'" class="'+(kind==='primary'?'primary':'secondary')+' v6-action">'+esc(label)+'</button>';
const chip=(text,kind='observed')=>'<span class="v6-chip '+kind+'">'+esc(text)+'</span>';
function head(kicker,title,subtitle){return '<div class="v6-lead"><span>'+esc(kicker)+'</span><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div>';}
function panel(title,content,aside=''){return '<article class="v6-panel">'+(title?'<h3>'+esc(title)+'</h3>':'')+content+aside+'</article>';}
function metric(label,value,comment='',status=''){
 return '<div class="v6-metric"><small>'+esc(label)+'</small><strong class="'+status+'">'+value+'</strong>'+(comment?'<span>'+esc(comment)+'</span>':'')+'</div>';
}
function factsLine(items){return '<div class="v6-facts">'+items.map(x=>metric(...x)).join('')+'</div>';}
function bars(data,maximum=null){
 const max=maximum||Math.max(...data.map(x=>Math.abs(x.value)),1);
 return '<div class="v6-barlist">'+data.map(x=>{
  const width=Math.max(2,Math.min(100,Math.abs(x.value)/max*100));
  const cls=x.value<0?'loss':'gain';
  return '<div class="v6-bar-row"><span>'+esc(x.name)+'</span><div class="v6-bartrack"><i class="'+cls+'" style="width:'+width+'%"></i></div>'+
   '<b class="'+cls+'">'+(x.unit==='pp'?(x.value>0?'+':'')+n(x.value)+'pp':(x.value>0?'+':'')+n(x.value)+'%')+'</b></div>';
 }).join('')+'</div>';
}
function steps(items){
 return '<div class="v6-steps">'+items.map((x,i)=>'<div><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></div>').join('')+'</div>';
}
function slider(key,label,value,opts={}){
 const min=opts.min??-1,max=opts.max??1,step=opts.step??.25,unit=opts.unit||'';
 return '<div class="sliderrow v6-slider"><label>'+esc(label)+' <output data-live="'+key+'">'+n(value,Number.isInteger(value)?0:2)+unit+'</output></label>'+
 '<input aria-label="'+esc(label)+'" type="range" data-set="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></div>';
}
function v4Slider(key,label,value,unit='%'){
 return '<div class="sliderrow v6-slider"><label>'+esc(label)+' <output>'+n(value,0)+unit+'</output></label>'+
 '<input aria-label="'+esc(label)+'" type="range" data-v4-control="'+key+'" min="0" max="100" step="5" value="'+value+'"></div>';
}
function headline(page,view=0){
 const titles={
 home:['看看博罗正在发生什么','一个重要变化，一个值得追问的问题'],
 mission:['变化地图','看得见的信号，能够选择的下一步'],
 data:['产业的真实变化','让年份与结构自己说话'],
 survey:['企业为什么会行动','关系图告诉你不同条件会怎样联动'],
 models:['产业连接会怎样变化','试着断开一环，看谁受到影响'],
 archive:['我的研究快照','比较改变前后，保留重要发现']
 };
 const w=[
 ['目标差距','哪些变化会改变目标的距离？'],['工业接力','不同产业为何会走向不同方向？'],
 ['服务价值','生产增长后，价值能留下多少？'],['农业周转','农产品卖出去，现金何时回来？'],
 ['压力测试','几个条件同时改变，哪里容易出问题？'],['下一步关注','哪些信号值得回到现实核实？']
 ];
 const t=page==='wind'?(w[view]||w[0]):titles[page]||titles.home;
 return '<header class="pagehead v6-pagehead"><div><div class="eyebrow">博罗 · 变化现场</div><h1>'+esc(t[0])+'</h1><p>'+esc(t[1])+'</p></div>'+
 (page==='wind'?'<button type="button" data-action="calibration" class="secondary v6-action">调整更多条件</button>':'')+'</header>';
}
function visual(page,ctx){
 const {state:s,r,view=0,cut=10,local=30,va=35,records=0,tea={receive:75,pay:12,daily:10},sampleSize=300}=ctx;
 if(page==='home'){
  const target=s.target,base=E.DATA,delta=r.total.p50-target;
  return head('现实变化 / SIMULATED OUTCOMES','两组反方向的数字，背后发生了什么？','先看变化，再动手试。无需理解模型的全部内部过程。')+
   '<div class="v6-feature"><div class="v6-pair">'+metric('2025固定资产投资','−18.8%','公开同比','loss')+
   metric('2025规上工业','+8.7%','公开同比','gain')+'</div>'+
   '<div class="v6-outcome">'+metric(s.year+'年条件中位数',n(r.total.p50,0)+'亿','演示情景，不是预测')+
   metric('相对目标', (delta>=0?'+':'')+n(delta,0)+'亿',s.year+'目标 '+n(target,0)+'亿',delta<0?'loss':'gain')+'</div></div>'+
   panel('2020至2025：规模在变，产业位置也在变',
     '<div class="v6-timeline">'+V4.YEARS.map(y=>'<div><span>'+y.year+'</span><i style="height:'+Math.max(9,y.shares[0]/25*100)+'%"></i><strong>'+n(y.shares[0])+'%</strong></div>').join('')+'</div>'+
     '<p class="v6-brief">电子设备制造占规上工业增加值的比重曾在2023年降到18.6%，2025年回升至23.2%。</p>')+
   '<div class="v6-actions">'+action('go-data','看看哪些行业在变化','primary')+action('go-wind','试一试未来条件')+'</div>'+
   '<div class="v6-disclaimer">'+chip('事实：2025同比')+chip('未来：条件演示','model')+'</div>';
 }
 if(page==='mission'){
  return head('从发现到行动','你需要知道的，不是研究者用了多少方法','这是一张可操作的观察路线图。')+
   steps([['看见变化','公开数据与历史对比'],['找到连接','谁影响谁，谁可能受益'],['改变条件','一次只动合理范围内的变量'],['发现盲区','优先核实可能改变判断的事实']])+
   panel('研究目前走到了哪里',
    factsLine([['真实年度历史','6年','2020–2025'],['2025同城比较','5地','不同功能结构'],['真实企业采购边','尚缺','不能冒充实证','loss']]))+
   '<div class="v6-actions">'+action('go-data','先看现实证据','primary')+action('go-models','再看关系传导')+'</div>';
 }
 if(page==='data'){
  return head('真实变化 / 公开统计','工业结构不是一条直线上升的曲线','图形显示已核实年份的变化，空白表示没有数据。')+
   panel('电子设备制造，六年结构变化',V4V.industryHistory('electronics')+
   '<div class="v6-disclaimer">'+chip('占规上工业比重')+chip('缺测不补零','model')+'</div>')+
   panel('五个地区，五种产业位置',V4V.ternary('huiyang')+
    '<p class="v6-brief">博罗、惠城、惠阳、惠东与龙门处在不同的产业结构位置，不代表谁更先进。</p>')+
   '<div class="v6-actions">'+action('go-models','看看产业连接','primary')+'</div>';
 }
 if(page==='survey')return root.BoluoSurveyBridgeUI.render(ctx);
 if(page==='models'){
  const x=V5.networkTrial(cut);
  return head('关系传导 / 情景实验','断掉一个关键连接，会影响多少环节？','调节受扰动的服务节点，观察同一组合成关系的响应。')+
    panel('同样移除'+cut+'个节点，两种断裂方式的差异',V5V.pairedNetworks(x))+
    '<div class="v6-controls"><label class="v6-small-label">断开多少个服务节点</label><select class="select v6-select" data-v5-cut>'+
    [0,3,5,10,20,30].map(z=>'<option value="'+z+'" '+(z===cut?'selected':'')+'>'+z+'个</option>').join('')+'</select></div>'+
    factsLine([['重点节点断裂',x.targeted.cutEdges+'条','合成关系'],['随机节点断裂',x.random.cutEdges+'条','合成关系'],
     ['制造主体受到连带影响',x.cascadeTargeted.manufacturersImpaired+'家','机制假设']])+
    '<div class="v6-disclaimer">'+chip('500个合成节点','model')+chip('未测量现实经济损失','model')+'</div>'+
    '<div class="v6-actions">'+action('go-wind','继续做压力测试','primary')+'</div>';
 }
 if(page==='wind'){
  const t=V5.targetStudy(s),h=E.DATA;
  const core='<div class="v6-wind-head">'+factsLine([
    ['2025真实GDP',n(h.gdp,1)+'亿','公开统计'],[s.year+'年目标',n(s.target,0)+'亿','对照条件'],
    ['情景P50',n(r.total.p50,0)+'亿','模型内部中位数']])+'</div>';
  if(view===0){
   return head('目标差距','差距有多大，哪条路能补上？','改动条件后结果随之重算。')+
   core+panel('三次产业条件结果','<div class="v6-sectors">'+r.sector.map((x,i)=>
    '<div><span>'+['农业','第二产业','第三产业'][i]+'</span><div class="v6-bartrack"><i style="width:'+Math.min(100,x.p50/Math.max(...r.sector.map(y=>y.p50))*100)+'%"></i></div>'+
    '<strong>'+n(x.p50,0)+'亿</strong></div>').join('')+'</div>')+
   '<div class="v6-controls">'+slider('manufacturing','工业接续',s.knobs.manufacturing)+slider('services','专业服务',s.knobs.services)+'</div>'+
   '<div class="v6-disclaimer">'+chip('现价对照')+chip('条件情景，不是官方预测','model')+'</div>';
  }
  if(view===1){
   return head('制造业','同在增长，为什么行业差异这么大？','2025年同一个县的行业，正在朝不同方向运行。')+
    panel('五类行业增速',bars(root.BoluoV3.INDUSTRIES.map(x=>({name:x.name,value:x.growth}))))+
    '<div class="v6-controls">'+slider('manufacturing','工业扩张条件',s.knobs.manufacturing)+slider('project_delay','项目进度压力',s.knobs.project_delay,{min:0,max:1})+'</div>'+
    factsLine([['第二产业情景中位数',n(r.sector[1].p50,0)+'亿','非工业增加值预测'],['2025规上工业增速','+8.7%','公开统计']]);
  }
  if(view===2){
   const x=V4.retention({local,va,improve:0});
   return head('专业服务','制造业忙起来，服务价值留在哪里？','用100个假设采购单位观察资金流向；这里不是博罗的实际采购数据。')+
    panel('本地与跨区流向',V4V.flow(x))+
    factsLine([['本地服务采购',n(x.localPay,0)+'单位','假设'],['对应本地增加值',n(x.added,1)+'单位','假设']])+
    '<div class="v6-controls">'+v4Slider('local','本地采购比例',local)+v4Slider('va','供应商增加值率',va)+'</div>'+
    '<div class="v6-disclaimer">'+chip('规范化模型','model')+chip('没有真实供应链采购数据','model')+'</div>';
  }
  if(view===3){
   const x=V5.teaTrial(tea.receive,tea.pay,tea.daily);
   return head('农业与现金流','春茶卖出去，钱为什么还可能卡住？','现金压力可以先于产业规模变化出现。')+
     panel('四种账期下的资金占用',V5V.teaDays(x))+
     '<div class="v6-controls">'+slider('receive','渠道回款',tea.receive,{min:20,max:120,step:5,unit:'天'})+
     slider('pay','农户付款',tea.pay,{min:5,max:40,step:1,unit:'天'})+
     slider('daily','日均演示垫资',tea.daily,{min:1,max:30,step:1,unit:'万元'})+'</div>'+
     factsLine([['两端账期错配',x.baseline.gap+'天','演示条件'],['账面占用',n(x.baseline.money,0)+'万元','不等于真实峰值']]);
  }
  if(view===4){
   const m=V5.rivalCompare(s),range=r.total.p90-r.total.p10;
   return head('未来压力','同一个目标，换一种条件，结论会翻转吗？','这里只显示条件范围，不给未经校准的真实成功概率。')+
    factsLine([['偏低情景P10',n(r.total.p10,0)+'亿','模型内分位'],['中位数P50',n(r.total.p50,0)+'亿','模型内分位'],
       ['偏高情景P90',n(r.total.p90,0)+'亿','模型内分位']])+
    panel('不同情景的方向差异',V5V.modelVotes(m))+
    '<div class="v6-controls">'+slider('manufacturing','工业',s.knobs.manufacturing)+slider('services','服务',s.knobs.services)+
      slider('project_delay','项目延期',s.knobs.project_delay,{min:0,max:1})+'</div>'+
    '<div class="v6-disclaimer">'+chip('不确定性来自假设','model')+'</div>';
  }
  const sensitivities=E.sensitivity({...s,draws:500});
  return head('下一步关注什么','哪个信号，最值得回到现实里核对？','这是待核验线索，不是系统替你做出的决策。')+
   panel('先核实这五个信号','<div class="v6-priorities">'+sensitivities.map((x,i)=>
    '<div><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(x.name)+'</strong>'+
    '<div class="v6-bartrack"><i style="width:'+Math.max(2,Math.min(100,x.span/Math.max(...sensitivities.map(y=>y.span))*100))+'%"></i></div></div>').join('')+'</div>')+
   '<div class="v6-disclaimer">'+chip('模型敏感度，不等于政策收益','model')+'</div>'+
   '<div class="v6-actions">'+action('save','保存当前实验','primary')+'</div>';
 }
 if(page==='archive'){
  const checks=V5.assurance(),done=checks.filter(x=>x.status==='已编码').length;
  return head('保留你的实验','改变条件之后，结果可以重现吗？','保存与比较当前设备上的情景。')+
   factsLine([['本机已存快照',records+'份','仅本设备'],['已编码质量检查',done+'/'+checks.length,'不代表实证认证'],
      ['当前实验编号',esc(r.runId),'条件指纹']])+
   panel('已完成与仍然缺失的检查','<div class="v6-gate-visual"><i style="width:'+(done/checks.length*100)+'%"></i></div>'+
    '<p class="v6-brief">真实企业交易、外部预测验证及正式研究归档仍需要补充，不能只靠本地保存代替。</p>')+
   '<div class="v6-actions">'+action('save','保存本轮条件','primary')+'</div>';
 }
 return '';
}
root.BoluoPresentationV6={headline,visual};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BoluoPresentationV6;
})(typeof window!=='undefined'?window:globalThis);
