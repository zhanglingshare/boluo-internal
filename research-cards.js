/* Dynamic research-card engine.
   Cards are generated from the repository's existing evidence and model outputs.
   Workflow state is browser-local only; no department-wide sync or real alerting is implied. */
(function(root){
'use strict';
const STORE='boluo-research-card-workflow-v1';
const STATUS={
 new:{label:'新发现',next:'investigating',nextLabel:'开始核查'},
 investigating:{label:'核查中',next:'verified',nextLabel:'标记已核实'},
 verified:{label:'已核实',next:'new',nextLabel:'重新打开'},
 dismissed:{label:'已排除',next:'new',nextLabel:'重新打开'}
};
const FILTERS=[
 {id:'all',label:'全部'},
 {id:'alert',label:'观察预警'},
 {id:'signal',label:'结构信号'},
 {id:'target',label:'目标'},
 {id:'reminder',label:'提醒'},
 {id:'conflict',label:'证据冲突'},
 {id:'gap',label:'数据缺口'},
 {id:'lead',label:'机会线索'},
 {id:'model',label:'模型边界'},
 {id:'review',label:'复盘'}
];
function read(storage){
 try{return JSON.parse(storage&&storage.getItem(STORE)||'{}')||{};}catch(e){return {};}
}
function write(storage,value){
 try{if(storage)storage.setItem(STORE,JSON.stringify(value));return true;}catch(e){return false;}
}
function statusOf(id,storage){
 const map=read(storage),s=map[id];
 return STATUS[s]?s:'new';
}
function setStatus(id,status,storage){
 if(!id||!STATUS[status])return false;
 const map=read(storage);map[id]=status;return write(storage,map);
}
function card(data,storage){
 return Object.assign({},data,{status:statusOf(data.id,storage),statusLabel:STATUS[statusOf(data.id,storage)].label});
}
function build(ctx){
 ctx=ctx||{};
 const V3=ctx.v3||{},V4=ctx.v4||{},E=ctx.engine||{},run=ctx.run||{},state=run.state||{};
 const storage=ctx.storage;
 const d=E.DATA||{gdp:1005.45};
 const yearRows=V4.YEARS||[];
 const y25=yearRows.find(x=>x.year===2025)||{shares:[23.2,14.2,9.6],rates:[23,13.7,-4.2]};
 const conflicts=V3.CONFLICTS||[];
 const retail=conflicts.find(x=>x.id==='retail');
 const revision=conflicts.find(x=>x.id==='revision');
 const readiness=(V4.evidenceReadiness&&V4.evidenceReadiness())||[];
 const serviceGap=readiness.find(x=>x.id==='localService'||x.id==='procurement');
 const network=(ctx.research&&ctx.research.networkStress)?ctx.research.networkStress({cut:0}):{nodes:500,edges:680};
 const p50=Number(run.total&&run.total.p50),p10=Number(run.total&&run.total.p10),p90=Number(run.total&&run.total.p90);
 const target=Number(state.target)||1600,runYear=Number(state.year)||2030;
 const hit=Number(run.hit);
 const raw=[
  {
   id:'signal-industrial-investment',type:'alert',riskTier:'watch',area:'data',tone:'amber',priority:'观察级 · 需要核查',grade:'A/B · 公开统计',
   title:'工业增长与投资下行同时出现',
   metric:'+8.7%  /  -18.8%',
   summary:'2025年规上工业增加值增长8.7%，固定资产投资下降18.8%。这是方向背离，不等于工业危机，也不能直接推断因果。',
   evidence:'规上工业增加值与固定资产投资的公开年度同比数据。',
   caution:'两项指标统计对象和形成机制不同。存量产能、项目投产时滞、外需、价格和统计范围都可能解释背离。',
   nextStep:'按行业核对订单、产能利用率、项目投产批次和工业投资。',
   source:'2025博罗统计公报',destination:'data',action:'查看指标与证据'
  },
  {
   id:'target-2032-layout',type:'target',area:'mission',tone:'blue',priority:'目标口径待定义',grade:'部门方向 · 待建立指标',
   title:'2032年前后产业布局方向：1 : 5 : 4',
   metric:'1 : 5 : 4',
   summary:'按发改局提出的产业布局方向目标记录。它不是三次产业增加值占比，当前系统不据此计算达标率。',
   evidence:'目标方向来自本项目提供的部门目标信息；当前尚未接入部门正式指标定义表。',
   caution:'需明确三个数字分别对应的产业范围、统计单位、空间范围、目标时点和测量办法，才能建立进度卡。',
   nextStep:'在研究任务中把方向目标拆成可观测、可核验的产业布局指标。',
   source:'部门目标口径待确认',destination:'mission',action:'拆解目标定义'
  },
  {
   id:'target-gdp-simulation',type:'target',area:'wind',tone:'cyan',priority:'模型条件对照',grade:'C · 条件模拟',
   title:'当前风洞总量对照线',
   metric:Number.isFinite(p50)?('P50 '+p50.toFixed(1)+' 亿'):'等待模型计算',
   summary:'当前'+runYear+'年总量对照线为'+target.toLocaleString('zh-CN')+'亿元。'+(Number.isFinite(p50)?('模拟P10—P90为'+p10.toFixed(1)+'—'+p90.toFixed(1)+'亿元。'):''),
   evidence:'2025公开宏观基数 + 当前增长率、波动和随机种子设定。',
   caution:'模型样本命中频率'+(Number.isFinite(hit)?(hit*100).toFixed(1)+'%':'暂不可用')+'，只代表当前假设下的模拟样本比例，不是现实达标概率。2032年1500亿元是旧内部总量对照，与1:5:4产业布局方向不是同一个指标。',
   nextStep:'调整情景和参数，比较哪些条件会改变总量分布。',
   source:'浏览器本地条件模拟',destination:'wind',view:0,action:'进入目标与现实风洞'
  },
  {
   id:'conflict-retail-base',type:'conflict',area:'data',tone:'red',priority:'P0 · 待核',grade:'A/B · 版本冲突',
   title:retail?retail.name:'社零基期口径待核',
   metric:'+3.9%  ≠  机械倒算 -19.0%',
   summary:retail?retail.a+'；'+retail.b:'统计公报与计划文件中的基数暂未完成同口径核验。',
   evidence:retail?retail.math:'两个公开文件对基期的表述存在差异，需要回到原始统计口径。',
   caution:retail?retail.caveat:'不能直接判断哪个数字错误，也不能将机械倒算结果当作官方同比。',
   nextStep:retail?retail.verify:'核对两年原始统计公报与统计范围。',
   source:'统计公报 / 政府计划',destination:'data',action:'查看证据冲突'
  },
  {
   id:'reminder-gdp-revision',type:'reminder',area:'data',tone:'blue',priority:'分项待补',grade:'A/B · 核算修订',
   title:revision?revision.name:'2024 GDP修订提醒',
   metric:'952.24 → 970.87 亿',
   summary:'2024年GDP总量由初步值修订为最终核实值，增加18.63亿元；但当前三次产业分项仍需统一核实。',
   evidence:revision?revision.a+'；'+revision.b:'2024年GDP核算修订信息。',
   caution:revision?revision.caveat:'核算修订不是现实经济增长，不能把不同版本分项拼成一条时间序列。',
   nextStep:revision?revision.verify:'补齐2024年三次产业最终核实分项。',
   source:'2024 GDP核实修订',destination:'data',action:'查看历史口径'
  },
  {
   id:'gap-local-service-procurement',type:'gap',area:'models',tone:'red',priority:'关键数据缺失',grade:'缺口 · 不可识别',
   title:'制造企业本地服务采购关系尚不可测',
   metric:'真实采购边：未取得',
   summary:'目前没有足够的企业采购地、供应商所在地、结算地和实际服务提供地数据，不能计算本地服务价值留存比例。',
   evidence:serviceGap?serviceGap.need:'缺少企业级匿名采购关系与本地供应商增加值率。',
   caution:'第三产业增加值总量不能反推出制造企业本地采购率，更不能据此断言价值已经外流。',
   nextStep:'设计企业匿名采购调查，优先收集研发、检测、物流、工业软件和商务服务的采购地。',
   source:'V4可识别性矩阵',destination:'models',action:'查看变量与数据缺口'
  },
  {
   id:'lead-electronics-divergence',type:'lead',area:'data',tone:'amber',priority:'值得继续拆解',grade:'A/B · 行业公开数据',
   title:'电子设备与橡胶塑料表现分化',
   metric:'电子设备 +23.0%  /  橡胶塑料 -4.2%',
   summary:'2025年电子设备制造增加值份额23.2%、同比增长23.0%；橡胶塑料份额9.6%、同比下降4.2%。',
   evidence:'2025年规上工业分行业增加值份额与可比价增速。',
   caution:'份额与可比价增速不是同一口径，不能相乘推算行业对GDP的贡献；行业分化也不自动等于新机会。',
   nextStep:'核对产品结构、企业样本、订单、价格和本地配套需求，判断变化是否可持续。',
   source:'2025规上工业行业数据',destination:'data',action:'查看六年行业结构'
  },
  {
   id:'model-synthetic-network-boundary',type:'model',area:'models',tone:'gold',priority:'模型边界提醒',grade:'C · 合成演示',
   title:'产业网络目前是压力实验，不是真实企业关系图',
   metric:network.nodes+' 个主体 / '+network.edges+' 条关系',
   summary:'现有网络用于测试节点移除、服务依赖和二阶传播的计算流程。',
   evidence:'研究代码中的固定种子合成网络；制造、服务、农业主体和关系均为合成数据。',
   caution:'网络断边、失联金额和受影响主体数不能解释为现实企业损失、GDP损失或真实供应链风险。',
   nextStep:'取得合法授权的企业匿名主体ID、行业分类和实际交易关系后，再做实证网络分析。',
   source:'研究网络生成模块',destination:'models',action:'查看网络实验边界'
  },
  {
   id:'review-local-snapshots',type:'review',area:'archive',tone:'blue',priority:'复盘机制',grade:'本地档案 · 非云端',
   title:ctx.archiveCount>0?('已有 '+ctx.archiveCount+' 份本地实验快照待复核'):'建立第一份可复现研究快照',
   metric:ctx.archiveCount>0?(ctx.archiveCount+' 份快照'):'尚无快照',
   summary:'快照保存参数、随机种子和模型结果；它本身不包含后续现实结果，也不等于研究结论已被验证。',
   evidence:'当前研究档案保存在此浏览器的本地存储。',
   caution:'清理浏览器数据可能丢失；尚无跨设备同步、多人审阅和真实结果自动回填。',
   nextStep:'保存本轮实验，并在下一期统计数据或部门数据到位后回填观测结果。',
   source:'06研究档案',destination:'archive',action:'打开研究档案'
  }
 ];
 return raw.map(x=>card(x,storage));
}
function filter(cards,id){
 if(!id||id==='all')return cards;
 return cards.filter(x=>x.type===id);
}
function counts(cards){
 return {
  total:cards.length,
  active:cards.filter(x=>x.status==='new'||x.status==='investigating').length,
  investigating:cards.filter(x=>x.status==='investigating').length,
  verified:cards.filter(x=>x.status==='verified').length,
  dismissed:cards.filter(x=>x.status==='dismissed').length,
  verifiedAlerts:cards.filter(x=>x.type==='alert'&&x.riskTier==='high'&&x.status==='verified').length,
  targets:cards.filter(x=>x.type==='target').length,
  gaps:cards.filter(x=>x.type==='gap').length
 };
}
const API={STORE,STATUS,FILTERS,build,filter,counts,statusOf,setStatus};
root.BoluoCards=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
