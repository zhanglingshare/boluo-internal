/* Research V5: auditable study designs, falsification gates, historic diagnostics,
   bounded feasibility and explicit uncertainty. Empirical facts / synthetic models
   are never silently combined into causal claims. */
(function(root){
'use strict';
const E=root.BoluoEngine,R=root.BoluoResearch,V3=root.BoluoV3,V4=root.BoluoV4;
if(!E||!R||!V3||!V4)return;
const STUDIES={
 home:{id:'00',name:'研究总览',question:'千亿博罗的产业结构究竟发生了什么？',unit:'县域×年度/行业',estimand:'已观察的份额变化与条件目标差',mechanism:'产业增速、内部组成、区域功能分工',rival:'统计修订和价格变动可能解释部分变化',falsify:'同口径历史重算若不支持趋势，则放弃结构转折叙事',gap:'更长的行业增加值、价格、就业与企业进出序列',tier:'描述性证据 + 条件模拟'},
 mission:{id:'01',name:'研究设计',question:'哪条机制可以被证伪，而非永远自圆其说？',unit:'产业、企业、县区及年度的明确观测单位',estimand:'预先指定的统计对象与竞争性机制',mechanism:'资本→投产→制造→本地服务→居民福利',rival:'共同冲击、选择偏差、跨行政边界采购',falsify:'在替代机制控制下，目标路径不出现对应时间顺序',gap:'项目批次、企业采购、就业价格与外部对照',tier:'可操作研究设计，未识别因果'},
 data:{id:'02',name:'数据中心',question:'哪些数字真实可比，哪些变化只是口径和结构差异？',unit:'年份×产业/县区×产业',estimand:'产业组成差异、年际波动、缺测与核算修订',mechanism:'现价增加值与份额构成',rival:'规上企业入库、现价/不变价与2024修订',falsify:'同口径数据更新后份额趋势和相对位置不再成立',gap:'核实版分行业数据、价格指数、全行业覆盖',tier:'公开数据描述'},
 survey:{id:'03',name:'社会调查',question:'测量构念真的可区分、稳定并可预测吗？',unit:'合成企业受访者×题项',estimand:'测量可靠性、构念效度、样本外预测误差',mechanism:'服务可得→使用→经营表现',rival:'共同方法偏差、样本选择、反向因果',falsify:'HTMT、载荷或留出预测不合格，不能继续解释路径',gap:'真实分层随机样本、题项效度与外部效标',tier:'完全合成演示'},
 models:{id:'04',name:'多模型与结构',question:'断开哪个连接，风险沿何种路径传播？',unit:'合成企业网络/县域模型参数',estimand:'网络断边率、二阶传导和参数敏感性',mechanism:'服务连接→制造约束→上游农业关系',rival:'替代供应商、冗余关系和实际交易权重未知',falsify:'真实网络不存在相应依赖或替代成本很低',gap:'匿名交易边、金额、方向、替代渠道与时间序列',tier:'结构算法可运行，主体关系合成'},
 wind0:{id:'05-0',name:'目标与现实',question:'1600亿元的门槛究竟由哪条产业路径承担？',unit:'2025—2030情景路径',estimand:'所需名义复合增速、分产业条件缺口',mechanism:'三个产业增加值的年度条件增长与聚合',rival:'价格变化、行业冲击与初始总量修订',falsify:'改变合理基线或模型后结论大幅反转',gap:'行业名义增长的真实时间序列与价格模型',tier:'2025事实基线 + 假设路径'},
 wind1:{id:'05-1',name:'工业',question:'工业增长来自新投产、存量扩能还是行业重配？',unit:'规上工业行业×年度',estimand:'行业份额变化、增速分歧和项目时滞线索',mechanism:'投资—建设—达产与行业周期',rival:'出口、价格、规上名录变化',falsify:'项目时滞与产出时序不匹配',gap:'逐项目进度、产能利用率、行业订单与价格',tier:'行业事实 + 情景压力'},
 wind2:{id:'05-2',name:'专业服务',question:'工业的服务采购在博罗真正留下多少价值？',unit:'每100假设采购单位/真实企业采购（待补）',estimand:'本地采购份额与供应商增加值率',mechanism:'本地采购→本地供应商增加值',rival:'总部结算、跨县服务、替代成本、统计属地',falsify:'企业采购核验显示本地份额或本地增加值极低',gap:'采购合同属地、服务增加值率、制造业服务预算',tier:'真实三产结构 + 规范化会计实验'},
 wind3:{id:'05-3',name:'农业',question:'农产品销售在涨，为什么账期仍可能拖垮加工厂？',unit:'春茶加工主体×经营周期',estimand:'渠道回款与农户付款时差下的周转占用',mechanism:'应收账款天数—应付天数—日垫付额',rival:'预付款、季节性、存货和实际信用政策不同',falsify:'核实账期或支付方式显示没有持续错配',gap:'采购/销售台账、授信与春茶25天窗口',tier:'宏观事实 + 茶季现金流合成实验'},
 wind4:{id:'05-4',name:'压力测试',question:'结论在哪组合理条件或模型选择下崩塌？',unit:'蒙特卡洛路径×情景参数网格',estimand:'模型内分位数、假设覆盖率、分歧与下尾',mechanism:'随机冲击与参数认知不确定性',rival:'参数选择、相关结构、模型形式',falsify:'若在广泛条件下正负结论翻转，不宣称稳健',gap:'历史校准、外部回测、真实参数分布',tier:'不等于现实命中概率'},
 wind5:{id:'05-5',name:'行动观察',question:'下一个最值得核验的事实是什么？',unit:'高敏感假设×验证任务',estimand:'改变结论的关键数据缺口',mechanism:'证据核验→重新运行→更新判断',rival:'可敏感不代表政策可控或高收益',falsify:'新证据否定假设则改变关注优先级',gap:'逐个证据的采集主体、更新频率和版本记录',tier:'核验优先级，不替人决策'},
 archive:{id:'06',name:'研究档案',question:'另一个研究者能否在同数据版本下复算并推翻我？',unit:'研究快照与代码版本',estimand:'完全确定性重跑、差异与限制声明',mechanism:'假设→代码→随机种子→结果',rival:'页面部署、统计数据修订和浏览器存储改变',falsify:'同输入重算不一致则不得声称可复现',gap:'云端不可篡改归档、数据版本哈希与独立复核',tier:'仅浏览器本地复现'}
};
const round=(x,d=2)=>Number(Number(x).toFixed(d));
const sum=a=>a.reduce((x,y)=>x+y,0);
const avg=a=>sum(a)/a.length;
function historyDiagnostics(){
 const d=R.HISTORY.map(x=>({year:x.year,p:x.p,s:x.s,t:x.t,
  shares:R.shares(x),gdp:x.gdp,stage:x.stage}));
 const entropy=v=>-v.reduce((a,x)=>a+(x>0?x*Math.log(x):0),0);
 const out=d.map((x,i)=>({year:x.year,entropy:entropy(x.shares),
  hhi:sum(x.shares.map(v=>v*v)),
  industrial:x.shares[1]*100,
  service:x.shares[2]*100,
  deltaIndustrial:i===0?null:(x.shares[1]-d[i-1].shares[1])*100,
  description:x.stage}));
 const inner=V4.YEARS.map(y=>{
  const observed=y.shares.filter(v=>v!==null);
  return {year:y.year,coverage:sum(observed),missing:5-observed.length,
   electronic:y.shares[0],industrialGrowth:y.growth};
 });
 const shifts=inner.slice(1).map((r,i)=>({from:inner[i].year,to:r.year,
  pp:r.electronic-inner[i].electronic}));
 const first=out[0],last=out[out.length-1];
 return {rows:out,inner,shifts,
  changeEntropy:last.entropy-first.entropy,
  changeHHI:last.hhi-first.hhi,
  industryPP:last.industrial-first.industrial,
  servicePP:last.service-first.service,
  peakDrop:Math.min(...shifts.map(x=>x.pp)),
  warning:'熵和三部门HHI仅是宽口径结构描述，不代表企业多样性、网络连通性或创新。历年规上行业份额来自变化的企业样本，不可直接视为固定企业动态。'};
}
function targetStudy(input){
 const s=E.normalize(input),rates=E.growth(s),horizon=s.year-2025;
 const bases=[107.44,549.01,349.0],names=['农业','第二产业','第三产业'];
 const path=bases.map((value,i)=>value*Math.pow(1+rates[i],horizon));
 const overall=sum(path),required=Math.pow(s.target/sum(bases),1/horizon)-1;
 const replace=bases.map((value,i)=>{
  const others=overall-path[i],needed=s.target-others;
  return {name:names[i],base:value,baselineRate:rates[i],
    baselineContribution:path[i]-value,requiredRate:needed>0?Math.pow(needed/value,1/horizon)-1:null,
    feasibleAtSimpleBounds:needed>0,why:'只调整该产业，其他两个按当前条件增长；这是数学反解，不是政策可行性结论'};
 });
 const cases=R.surface(E,s);
 const passed=cases.values.filter(x=>x.value>=s.target).length;
 const worst=cases.values.reduce((a,b)=>a.value<=b.value?a:b);
 const best=cases.values.reduce((a,b)=>a.value>=b.value?a:b);
 return {year:s.year,target:s.target,required,overall,path,baselineGap:overall-s.target,
  rows:replace,gridCells:cases.values.length,cellsPass:passed,gridCoverage:passed/cases.values.length,
  worst,best,caution:'81格均匀设点比例只是试验设计覆盖率，不是达标概率。单产业反解没有考虑一般均衡、价格变化、投入约束或可行上限。'};
}
function rivalCompare(state){
 const ss=E.normalize(state);
 const sc=R.compareModels(E.run({...ss,draws:350}));
 const m=sc.candidates;
 const targets=m.map(x=>({...x,above:x.value>=ss.target,margin:x.value-ss.target}));
 return {cases:targets,disagreement:targets.some(x=>x.above)!==targets.every(x=>x.above),
  spread:sc.spread,message:'不同机械机制可以给相反的目标判断，不能把四个模型当四个独立的实证预测器。'};
}
function networkTrial(cut=10){
 const a=R.networkStress({cut,mode:'targeted'}),b=R.networkStress({cut,mode:'random'});
 const c=V3.cascade({cut,mode:'targeted',threshold:2});
 const d=V3.cascade({cut,mode:'random',threshold:2});
 return {cut,targeted:a,random:b,cascadeTargeted:c,cascadeRandom:d,
  ratio:b.cutValue>0?a.cutValue/b.cutValue:null,
  deltaConnections:a.cutEdges-b.cutEdges,
  note:'受损服务采购额和二阶波及只由固定种子合成网络计算。两种移除策略对比属于实验设计，不提供博罗实际风险损失。'};
}
function teaTrial(receive=75,pay=12,daily=10){
 const baseline=E.tea(receive,pay,daily);
 const scenarios=[
  {name:'当前演示',receive,pay,daily},
  {name:'渠道提前15天回款',receive:Math.max(0,receive-15),pay,daily},
  {name:'向茶农延迟7天支付',receive,pay:pay+7,daily},
  {name:'渠道延后15天回款',receive:receive+15,pay,daily}
 ].map(x=>({...x,out:E.tea(x.receive,x.pay,x.daily)}));
 const shock=Math.max(...scenarios.map(x=>x.out.money))-Math.min(...scenarios.map(x=>x.out.money));
 return {baseline,scenarios,shock,harvestWindow:25,
  note:'模型将日均垫付额当作每日稳定流量；25天春茶季与63天账期错配是不同时间窗口。不能由63×日均金额直接证明25天春茶期的真实最高资金峰值。'};
}
function surveyReview(m){
 const thresholds=[
 {label:'HTMT最大值',value:Math.max(...Object.values(m.htmt)),guide:'<0.90',flag:Math.max(...Object.values(m.htmt))<.90,
   explanation:'构念差异的提示性筛查；正式论文应报告Bootstrap上限与测量类型'},
 {label:'VIF（经营表现两个解释项）',value:m.vifOP,guide:'≤3通常较理想',flag:m.vifOP<=3,
   explanation:'仅双预测构念的共线性，不等于指标或全部结构的VIF'},
 {label:'AVE最小值',value:Math.min(...Object.values(m.ave)),guide:'≥0.50',flag:Math.min(...Object.values(m.ave))>=.5,
   explanation:'反映式题项的汇聚效度提醒，仍须结合真实测量理论'},
 {label:'Alpha最小值',value:Math.min(...Object.values(m.alpha)),guide:'≥0.70',flag:Math.min(...Object.values(m.alpha))>=.7,
   explanation:'内部一致性而非构念或因果成立'},
 {label:'反映式题项载荷最小绝对值',value:Math.min(...Object.values(m.loadings).flat().map(Math.abs)),guide:'≥0.70（经验参考）',flag:Math.min(...Object.values(m.loadings).flat().map(Math.abs))>=.7,
   explanation:'单个题项能否充分代表构念，需结合内容效度判断'},
 {label:'复合信度ρc最小值',value:Math.min(...Object.values(m.rhoC)),guide:'≥0.70（经验参考）',flag:Math.min(...Object.values(m.rhoC))>=.7,
   explanation:'基于反映式指标载荷与误差方差的合成样本估计'},
 {label:'相对均值预测技能',value:m.holdout.skill,guide:'>0（演示阈值）',flag:m.holdout.skill>0,
   explanation:'仅合成构念均分回归对均值基准的测试，非PLSpredict'}
 ];
 return {thresholds,green:thresholds.filter(x=>x.flag).length,total:thresholds.length,
  warning:'启发性规则不能替代理论判断；所有阈值仅用于合成数据教学。未建立真实抽样、实验设计、共同方法偏差控制或SmartPLS等价性。'};
}
function sourceLedger(){
 const observations=[
  {id:'historic',name:'2020–2025宏观三产GDP',level:'公开统计',count:R.HISTORY.length,issue:'2024核实三产分项缺口',node:'02'},
  {id:'industry',name:'2020–2025规上行业占比',level:'公开统计',count:V4.YEARS.length,issue:'规上名单、缺测行业、价格与统计修约',node:'02'},
  {id:'peer',name:'2025惠州五地三产结构',level:'公开统计',count:V4.REGIONS.length,issue:'县/城区功能及规模不可强行匹配',node:'02'},
  {id:'survey',name:'企业服务使用题项',level:'合成样本',count:0,issue:'没有真实企业受访者数据',node:'03'},
  {id:'edges',name:'企业服务采购与供货边',level:'合成样本',count:0,issue:'没有核实的实际交易边',node:'04'},
  {id:'nominal',name:'2030年名义增长与波动参数',level:'研究者假设',count:0,issue:'缺统计校准与外部预测验证',node:'05'}
 ];
 return observations;
}
function assurance(){
 return [
 {name:'真实统计与模拟数值分层',status:'已编码',test:'标签、公开宏观基线、合成节点与C级参数有不同记录'},
 {name:'历史修订标记',status:'已编码',test:'2024GDP核实修订且保持三产初步口径'},
 {name:'缺失值不被自动补零',status:'已编码',test:'2020/2021部分工业行业null保留并渲染缺测'},
 {name:'相同模型条件下可复算',status:'已编码',test:'固定随机种子、浏览器快照与CI单测'},
 {name:'多模型机制对照',status:'已编码',test:'机械外推、条件MC、无冲击基准比较'},
 {name:'真实企业网络采购额校准',status:'尚缺实证',test:'需真实匿名企业采购边与属地'},
 {name:'测量模型外部效度',status:'尚缺实证',test:'需真样本、问卷框架、分层抽样、测量等价'},
 {name:'识别因果的外生变动',status:'尚缺实证',test:'需可信对照设计、识别假设及安慰剂检验'},
 {name:'跨软件独立实现复核',status:'尚缺实证',test:'需与标准统计软件/SmartPLS比较并记录差异'},
 {name:'不可篡改研究数据版本及档案',status:'尚未实现',test:'目前只有浏览器本地存储，需正式版本归档'}
 ];
}
const API={STUDIES,historyDiagnostics,targetStudy,rivalCompare,networkTrial,teaTrial,surveyReview,sourceLedger,assurance};
root.BoluoV5=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
