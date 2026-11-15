/* V3: empirical evidence, hypotheses, structural transmission and model risk.
   Public facts stay distinct from synthetic mechanisms and researcher-set parameters. */
(function(root){
'use strict';
const R=root.BoluoResearch;
const URL={
stat:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2',
plan:'https://www.boluo.gov.cn/blgk/qjmb/content/post_5504574.html',
news:'https://epaper.nfnews.com/nfdaily/html/202602/03/content_10162180.html',
revision:'https://static.nfnews.com/content/202601/31/c12129042.html',
jrc:'https://knowledge-for-policy.ec.europa.eu/composite-indicators/toolkit_en/navigation-page/10-step-guide_en/step-8-sensitivity-analysis_en'
};
const INDUSTRIES=[
 ['电子设备制造',23.2,23.0],['电气机械',14.2,13.7],['橡胶塑料',9.6,-4.2],
 ['金属制品',8.2,11.1],['电力热力',6.2,14.0]
].map(([name,share,growth],i)=>({id:i,name,share,growth,source:'stat'}));
const SIZES=[['大型企业',19.2,10.8],['中型企业',24,4.8],['小微型企业',56.8,9.7]]
 .map(([name,share,growth])=>({name,share,growth}));
const PRODUCTS=[
 ['中成药',-24.9,'吨',4893.2],['饮料',13.4,'万吨',374.2],['涂料',16.2,'万吨',8.52],
 ['锂离子电池',-4.3,'万千瓦时',457.3],['印制电路板',-.1,'万平方米',763.6],
 ['电子元件',5.0,'亿只',131.5],['自来水',-14.8,'万立方米',9596.8],
 ['服装',9.8,'万件',1642.6]
].map(([name,growth,unit,amount])=>({name,growth,unit,amount}));
const INDICATORS=[
 ['规上工业增加值','生产',8.7,'可比价增速'],['工业用电量','生产',6.8,'电量同比'],
 ['固定资产投资','投资',-18.8,'投资同比'],['工业投资','投资',-12.7,'投资同比'],
 ['房地产投资','投资',-47.6,'投资同比'],['社零总额','消费',3.9,'公报同比（有基期冲突）'],
 ['游客接待人次','服务',11.7,'人次同比'],['旅游综合收入','服务',19.1,'收入同比'],
 ['金融业增加值','金融',-3.7,'增加值实际增速'],['贷款余额','金融',-.1,'余额同比'],
 ['农村居民收入','民生',6.2,'名义同比'],['城镇居民收入','民生',3.5,'名义同比'],
 ['单位GDP能耗','绿色',-2.9,'能耗强度同比']
].map(([name,domain,value,basis],id)=>({id,name,domain,value,basis,source:'stat'}));
const TARGETS=[
 ['GDP实际增速',7,5.5,'目标7%','实际增速，使用不变价口径'],
 ['规上工业增速',9,8.7,'9%以上','目标为下限，不能把规模以上增速当GDP增长'],
 ['固定资产投资',5,-18.8,'目标+5%','增长率之差是-23.8个百分点，不是总投资缺口'],
 ['社会消费品零售',5,3.9,'5%以上','仅比较当年公布同比增速，绝对值基期冲突待核对'],
 ['一般公共预算收入',3,.2,'目标+3%','2025+0.2%注明可比口径，政策目标口径需核对']
].map(([name,goal,actual,plan,note])=>({name,goal,actual,plan,note,gap:actual-goal}));
const CONFLICTS=[
 {id:'retail',name:'社零基期不一致',state:'待查',priority:'P0',
  a:'2025年社零296.99亿元、公布同比增长3.9%',b:'2025年计划中引用2024年社零366.66亿元',
  math:'若机械相除，约为-19.0%，与公布同比+3.9%不一致',
  caveat:'不能断言哪一个数字错误；需查统计范围、基期修订、可比口径',
  verify:'向2024/2025统计公报与统计部门核对同一范围的2024可比基数',sources:['stat','plan']},
 {id:'fiscal',name:'财政绝对额与可比增长不同',state:'待查',priority:'P0',
  a:'2025一般公共预算收入95.27亿元，按可比口径增长0.2%',b:'2025计划中引用2024年78.02亿元',
  math:'未调整两期绝对额之比约+22.1%，并非+0.2%',
  caveat:'“按可比口径”提示存在范围或核算差异，不得用两个数直接算增长',
  verify:'核对两年财政决算、预算执行报告和可比口径调整表',sources:['stat','plan']},
 {id:'tech',name:'高新技术企业数量口径不一',state:'待查',priority:'P1',
  a:'2025统计公报：年末686家（含迁入）',b:'2026年2月媒体报道：710家',
  math:'公开数字差24家',
  caveat:'时点、统计定义、核查流程可能不同；不能推断企业数减少',
  verify:'核对科技部门企业认定口径及统计截止日期',sources:['stat','news']},
 {id:'revision',name:'GDP核实修订有明确证据',state:'已知修订/分项待核',priority:'P0',
  a:'2024 GDP初步值952.24亿元',b:'2024 GDP最终核实值970.87亿元',
  math:'GDP总量修订+18.63亿元',
  caveat:'不能将核算修订视为现实增长；2024最终三产业分项尚未在当前数据集中核实',
  verify:'查找2024三次产业最终核实分项以形成一致价格口径的时间序列',sources:['revision','stat']}
];
const HYPOTHESES=[
 {id:'H1',title:'投资下降但工业增长',facts:['固定资产投资-18.8%','规上工业+8.7%','工业用电+6.8%'],
  rival:['存量产能释放','外需/产品结构变化','项目投产时差','统计口径与价格差异'],
  test:'用按行业产能利用率、投产批次、实物产量、价格和订单数据区分竞争解释',
  falsifier:'即使控制行业周期和订单，产能释放仍不出现，则该机制受挑战',quality:'描述可核；因果未识别'},
 {id:'H2',title:'制造增长能否在本地留下服务价值',facts:['二产GDP占比54.6%','三产GDP占比34.7%'],
  rival:['采购向本地转移','跨县供应链外溢','企业注册地或结算地差异'],
  test:'调查企业服务采购地、研发检测物流结算地、企业生产与服务收入',
  falsifier:'若本地采购份额并未随产业升级改变，则本地承接机制缺乏支持',quality:'网络为合成，缺实测交易'},
 {id:'H3',title:'经济增长是否改善普通人收入',facts:['城镇居民收入+3.5%','农村居民收入+6.2%','居民实际收入+5.0%'],
  rival:['工资提高','就业结构迁移','统计人口构成变化','物价与生活成本变化'],
  test:'核对实际工资、收入中位数、通勤负担、城乡人口组成及CPI',
  falsifier:'收入增速差异若由样本人口组成变化完全解释，原机制不成立',quality:'仅描述，未识别福利效应'},
 {id:'H4',title:'工业扩张与绿色效率的张力',facts:['工业用电+6.8%','单位GDP能耗-2.9%'],
  rival:['技术效率改善','产业组成替换','生产外包或能源结构变化'],
  test:'逐行业分解用电和实物产量，比较行业内效率变化与结构效应',
  falsifier:'若同一行业同类企业能效未改善，效率型解释需要修正',quality:'缺企业级能耗面板'}
];
function priceBridge(){
 const revised2024=970.87,issued2025=1005.45,realGrowth=.055;
 const nominalRatio=issued2025/revised2024;
 const impliedPriceRatio=nominalRatio/(1+realGrowth);
 const target=1600;
 return {revised2024,issued2025,nominalGrowth:(nominalRatio-1)*100,realGrowth:realGrowth*100,
  impliedPriceGrowth:(impliedPriceRatio-1)*100,nominalTargetCAGR:((target/issued2025)**(1/5)-1)*100,
  note:'2025现价GDP除以2024核实总量得到近似名义增长；与公布5.5%实际增长相比可推导一个总量隐含价格变化近似。两期核算版本、链式价格指数与修订差异必须进一步核验，不能将该数当作官方GDP平减指数。'};
}
function summary(){
 const covered=INDUSTRIES.reduce((a,r)=>a+r.share,0);
 const u20=45832-8164,r20=32915-8671;
 return {covered,missing:100-covered,unresolved:CONFLICTS.filter(x=>x.state==='待查').length,
  income:{urbanNow:45832,ruralNow:32915,urbanBefore:u20,ruralBefore:r20,
    ratioNow:45832/32915,ratioBefore:u20/r20},
  signals:INDICATORS.length,industryCount:INDUSTRIES.length};
}
function select(domain){return INDICATORS.filter(x=>domain==='全部'||x.domain===domain);}
function projection(rates,year){return [107.44,549.01,349].reduce((sum,v,i)=>sum+v*Math.pow(1+rates[i],year-2025),0);}
function epistemic(engine,input){
 const state=engine.normalize(input),rates=engine.growth(state);
 const lines=[-.015,0,.015].map(shift=>({shift,rate:rates.map(v=>v+shift),value:projection(rates.map(v=>v+shift),state.year)}));
 return {lines,spread:lines[2].value-lines[0].value,note:'增长假设整体±1.5个百分点是明确指定的认知不确定性情景，不是经统计校准的区间，也没有发生概率。'};
}
function rand(seed){let x=(seed>>>0)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function morris(engine,input,n=32){
 const s=engine.normalize(input),keys=Object.keys(engine.EFFECTS),rnd=rand(s.seed+10041),step=.25;
 const groups=Object.fromEntries(keys.map(k=>[k,[]]));
 const f=k=>projection(engine.growth({...s,knobs:k}),s.year);
 for(let rep=0;rep<n;rep++){
  const state={};keys.forEach(k=>{const min=k==='project_delay'?0:-1;state[k]=min+Math.floor(rnd()*(Math.round((1-min)/step)+1))*step;});
  const seq=keys.slice();for(let i=seq.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[seq[i],seq[j]]=[seq[j],seq[i]];}
  for(const k of seq){
   const min=k==='project_delay'?0:-1;const dir=state[k]>=1?-1:state[k]<=min?1:rnd()<.5?1:-1;
   const after=Math.max(min,Math.min(1,state[k]+dir*step));
   const eff=(f({...state,[k]:after})-f(state))/(after-state[k]);
   groups[k].push(eff);state[k]=after;
  }
 }
 const stats=keys.map(k=>{const a=groups[k],mean=a.reduce((u,v)=>u+v,0)/a.length;
  return {key:k,label:engine.LABELS[k],mu:mean,muStar:a.reduce((u,v)=>u+Math.abs(v),0)/a.length,
    sigma:Math.sqrt(a.reduce((u,v)=>u+(v-mean)**2,0)/a.length),n:a.length};
 }).sort((a,b)=>b.muStar-a.muStar);
 return {stats,n,warning:'Morris型元素效应法基于32条合成参数轨迹与0.25步长，比较模型对输入假设的全球响应，不能解释为现实因果权重。'};
}
const GRAPH=R.networkStress({cut:0}).graph;
function cascade({cut=10,mode='targeted',threshold=2}={}){
 const n=R.networkStress({cut,mode}),gone=new Set(n.selected),lost=new Map();
 for(const edge of GRAPH.edges){if(edge.type==='service'&&gone.has(edge.target))lost.set(edge.source,(lost.get(edge.source)||0)+1);}
 const limit=threshold===1?1:2;
 const mfg=new Set([...lost].filter(([,x])=>x>=limit).map(([id])=>id));
 const farms=new Set();
 for(const edge of GRAPH.edges){if(edge.type==='agri'&&mfg.has(edge.target))farms.add(edge.source);}
 return {nodes:n.nodes,edges:n.edges,cut:n.cut,mode,threshold:limit,removed:n.selected,
   lostServiceEdges:n.cutEdges,lostServiceMoney:n.cutValue,manufacturersTouched:lost.size,
   manufacturersImpaired:mfg.size,farmsTouched:farms.size,share:n.impactPct,
   note:'二阶网络传播使用每家合成制造主体的服务供应损失阈值，农业节点只经供应关系标记。不是现实减产金额或GDP损失。'};
}
const API={priceBridge,URL,INDUSTRIES,SIZES,PRODUCTS,INDICATORS,TARGETS,CONFLICTS,HYPOTHESES,summary,select,epistemic,morris,cascade};
root.BoluoV3=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
