/* 2026-11-15 research extension: observational vintages, falsifiable mechanisms,
   variable registry and synthetic network stress. No invented historical observations. */
(function(root){
'use strict';
const H=[
 {year:2020,gdp:619.04,p:69.20,s:309.80,t:240.04,stage:'初步',source:'https://tjgb.hongheiku.com/7782.html'},
 {year:2021,gdp:741.46,p:76.74,s:393.99,t:270.73,stage:'初步',source:'https://tjgb.hongheiku.com/xjtjgb/xj2020/27206.html'},
 {year:2022,gdp:801.39,p:88.50,s:436.48,t:276.41,stage:'初步',source:'https://www.hongheiku.com/qgxsqgdp/gdsgxsqgdppm/59295.html'},
 {year:2023,gdp:838.89,p:94.24,s:466.46,t:278.20,stage:'初步',source:'https://tjgb.hongheiku.com/xjtjgb/xj2020/50757.html'},
 {year:2024,gdp:952.24,p:104.41,s:513.08,t:334.76,stage:'三产初步',finalGdp:970.87,source:'https://tjgb.hongheiku.com/xjtjgb/xj2020/65264.html',revisionSource:'https://static.nfnews.com/content/202601/31/c12129042.html'},
 {year:2025,gdp:1005.45,p:107.44,s:549.01,t:349.00,stage:'当年公布',source:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2'}
];
const DATA=H.map(x=>Object.freeze(x));Object.freeze(DATA);
const VARIABLES=[
 {id:'gdp',name:'GDP总量',role:'结果变量',level:'A/B',unit:'亿元',period:'2020–2025',status:'可观测',theory:'县域总增加值',measure:'当年现价核算及历次修订',warning:'当年现价同比变化不是不变价实际增长'},
 {id:'sectorShare',name:'三次产业结构',role:'描述性结果',level:'A/B',unit:'百分比',period:'2020–2025',status:'可观测',theory:'结构变迁与经济专业化',measure:'三次产业增加值 / 同版本GDP',warning:'2024初步部门值不可直接配2024最终GDP'},
 {id:'industrial',name:'工业增加值增速',role:'状态信号',level:'B',unit:'%',period:'2025',status:'可观测',theory:'规模以上工业活动',measure:'规上工业增加值不变价增速',warning:'不能直接代替第二产业现价增加值增速'},
 {id:'investment',name:'固定资产投资增速',role:'外部状态',level:'B',unit:'%',period:'2025',status:'可观测',theory:'资本形成前置信号',measure:'固定资产投资年度同比',warning:'投资是支出流量，不能直接加总为增加值'},
 {id:'project_delivery',name:'项目投产兑现',role:'候选中介',level:'C',unit:'兑现率',period:'待补实测',status:'假设',theory:'投资到产出之间存在建设与投产时滞',measure:'项目清单逐项核实建设/试产/达产时间',warning:'当前只有项目延期滑杆，无全县真实兑现率样本'},
 {id:'local_service',name:'本地生产性服务承接',role:'候选中介',level:'C',unit:'本地采购比率',period:'待补实测',status:'假设',theory:'制造业外部经济与区域价值留存',measure:'企业服务采购与供应商属地交叉核验',warning:'合成采购边不能测量博罗现实留存'},
 {id:'talent',name:'技能岗位匹配',role:'调节候选',level:'C',unit:'岗位缺口率',period:'待补实测',status:'假设',theory:'技能约束影响产能兑现与服务承接',measure:'招聘/离职/岗位培训分行业匹配',warning:'合成劳动者记录不能推断实际就业变化'},
 {id:'price',name:'产业价格与折算指数',role:'混杂候选',level:'缺口',unit:'指数',period:'待补实测',status:'缺失',theory:'名义增加值与实际增长的差异',measure:'产业增加值平减指数或可核验替代指标',warning:'缺失该数据不能用名义增速说明真实产出变化'},
 {id:'outside',name:'外需及行业周期',role:'混杂候选',level:'B/C',unit:'增速/指数',period:'待补序列',status:'部分可观测',theory:'共同外部冲击导致产业间共同变动',measure:'外贸订单、产品景气指数、供货价格',warning:'不控制外需就无法识别本地政策净效应'},
 {id:'network',name:'供应链连接与集中度',role:'结构变量',level:'C',unit:'连接数/集中度',period:'合成样本',status:'合成',theory:'连接密度和桥接节点影响风险传播',measure:'采购边、主体标识及关系金额',warning:'目前500节点680边为实验网络'},
 {id:'survey',name:'服务可得→使用→表现',role:'路径假设',level:'C',unit:'标准化路径',period:'合成问卷',status:'合成',theory:'可得性通过实际使用关联经营表现',measure:'SA四题、SU三题、OP三题',warning:'演示PLS不能证明因果或换算GDP增量'},
 {id:'cash',name:'农业账期错配',role:'微观约束',level:'C',unit:'天/万元',period:'情景演示',status:'假设',theory:'加工企业的资金垫付压力',measure:'渠道回款天数、向农户支付天数、日均成本',warning:'现金流压力与县域GDP没有已识别的传导系数'}
];
const HYPOTHESES=[
 {id:'H1',name:'增长扩张≠结构升级',test:'2020–2025年产业占比变化、产业内部价值增加及劳动生产率是否同步',alternative:'名义价格变化和统计修订也可能改变占比',result:'可描述总体三产占比；无法仅凭三产识别内部升级'},
 {id:'H2',name:'投资下降≠当年工业必然下降',test:'对齐分项目投资、在建/投产时滞、工业产量并控制价格和外需',alternative:'存量产能释放、出口需求和价格因素',result:'2025年出现方向背离；机制尚未识别'},
 {id:'H3',name:'工业增长≠服务价值本地留存',test:'企业采购目的地和本地服务供应能力的配对观察',alternative:'本地服务统计口径、跨区企业结算地不同',result:'仅有合成网络压力展示，缺现实采购数据'},
 {id:'H4',name:'结构1:5:4不必然最优',test:'比较生产率、就业、收入与韧性在不同结构下的表现',alternative:'产业专业化可能长期维持较高制造业占比',result:'目标结构仅为自设对照，不是已证最优'}
];
const DAG=[
 {from:'外需/周期',to:'制造业产出',kind:'共同冲击'},
 {from:'外需/周期',to:'固定资产投资',kind:'混杂'},
 {from:'资本投入',to:'项目投产',kind:'假说'},
 {from:'项目投产',to:'制造业产出',kind:'假说'},
 {from:'技能匹配',to:'项目投产',kind:'候选约束'},
 {from:'制造业产出',to:'专业服务需求',kind:'假说'},
 {from:'本地服务能力',to:'服务本地承接',kind:'假说'},
 {from:'专业服务需求',to:'服务本地承接',kind:'假说'},
 {from:'价格因素',to:'名义增加值',kind:'计量口径'},
 {from:'制造业产出',to:'名义增加值',kind:'需价格折算'},
 {from:'服务本地承接',to:'名义增加值',kind:'未识别'}
];
function round(x,n=3){return Number(Number(x).toFixed(n));}
function shares(row){const sum=row.p+row.s+row.t;return [row.p/sum,row.s/sum,row.t/sum];}
function describe(){
 const first=DATA[0],last=DATA[DATA.length-1],s0=shares(first),s1=shares(last);
 const nominal=last.gdp-first.gdp,delta=['p','s','t'].map(k=>last[k]-first[k]);
 const hhi=(s)=>s.reduce((a,b)=>a+b*b,0);
 const growth=DATA.map((r,i)=>({year:r.year,preliminary:r.gdp,final:r.finalGdp||null,
  shares:shares(r),gdpNominalRate:i===0?null:(
    r.year===2025?(r.gdp/DATA[i-1].finalGdp-1):
    r.gdp/DATA[i-1].gdp-1),revisions:i>0&&r.year===2025,
  mismatch:round(r.p+r.s+r.t-r.gdp,2)}));
 const overallNominalCAGR=Math.pow(last.gdp/first.gdp,1/5)-1;
 return {rows:growth,delta,nominalTotal:nominal,nominalContribution:delta.map(x=>x/nominal),
  shareStart:s0,shareEnd:s1,shareChangePp:s1.map((v,i)=>(v-s0[i])*100),
  concentrationStart:hhi(s0),concentrationEnd:hhi(s1),
  nominalCAGR:overallNominalCAGR,revision:round(DATA[4].finalGdp-DATA[4].gdp,2),
  caution:'2024三产是初步核算，2024已披露GDP最终核实970.87亿元但三产最终分项不在本数据集；不跨版本混配。'
 };
}
function variable(id){return VARIABLES.find(v=>v.id===id)||VARIABLES[0];}
function compareModels(engineResult){
 const s=engineResult.state,years=s.year-2025,base=[107.44,549.01,349];
 const rates3=['p','s','t'].map(k=>Math.pow(DATA[3][k]/DATA[0][k],1/3)-1);
 const uniform=.073;
 const uniformTotal=base.reduce((a,v)=>a+v*Math.pow(1+uniform,years),0);
 const histTotal=base.reduce((a,v,i)=>a+v*Math.pow(1+rates3[i],years),0);
 const deterministic=base.reduce((a,v,i)=>a+v*Math.pow(1+engineResult.rate[i],years),0);
 const candidates=[
  {id:'mc',name:'情景蒙特卡洛',value:engineResult.total.p50,basis:'2025公开基准 + C级增长和波动假设',type:'模型条件'},
  {id:'constant',name:'共同增速对照',value:uniformTotal,basis:'三产均按7.3%名义假设增长，仅用于结构不变的反事实',type:'C级假设'},
  {id:'historical',name:'2020–2023趋势机械延续',value:histTotal,basis:'三产2020–2023现价复合增幅外推；样本短、跨期修订与冲击未建模',type:'极弱基准'},
  {id:'no-shock',name:'当前增长假设去除随机扰动',value:deterministic,basis:'固定增长率递推，无随机扰动的情景对照',type:'条件基准'}
 ];
 return {candidates,spread:Math.max(...candidates.map(x=>x.value))-Math.min(...candidates.map(x=>x.value)),
 rates3,caution:'模型分歧不是统计置信区间：这四个估计器对应不同假设/生成机制，不能对其概率加权或称为交叉验证。'};
}
function numberSeed(s){let a=(s>>>0)||1;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const serviceTypes=['研发设计','检测认证','物流仓储','工业软件','商务服务'];
function networkBase(){
 const rnd=numberSeed(982140), nodes=[],edges=[];
 for(let i=0;i<300;i++)nodes.push({id:'M'+(i+1),sector:'制造',label:'制造主体'+(i+1)});
 for(let i=0;i<120;i++)nodes.push({id:'S'+(i+1),sector:'服务',type:serviceTypes[i%5],label:'服务主体'+(i+1)});
 for(let i=0;i<80;i++)nodes.push({id:'A'+(i+1),sector:'农业',label:'农业主体'+(i+1)});
 for(let i=0;i<300;i++)for(let k=0;k<2;k++){
   const id=(i*17+k*31)%120,amount=.05+rnd()*3.95;
   edges.push({source:'M'+(i+1),target:'S'+(id+1),value:amount,type:'service'});
 }
 for(let i=0;i<80;i++)edges.push({source:'A'+(i+1),target:'M'+((i*7)%300+1),value:.05+rnd()*1.95,type:'agri'});
 return {nodes,edges};
}
const GRAPH=networkBase();
function networkStress(input){
 const opt=input||{},count=Math.max(0,Math.min(30,Math.floor(Number(opt.cut)||0))),mode=opt.mode==='random'?'random':'targeted';
 const inWeight=new Map(GRAPH.nodes.map(n=>[n.id,0]));const incoming=new Map(GRAPH.nodes.map(n=>[n.id,0]));
 GRAPH.edges.forEach(e=>{inWeight.set(e.target,inWeight.get(e.target)+e.value);incoming.set(e.target,incoming.get(e.target)+1);});
 const pool=GRAPH.nodes.filter(n=>n.sector==='服务').slice();
 if(mode==='targeted')pool.sort((a,b)=>inWeight.get(b.id)-inWeight.get(a.id)||a.id.localeCompare(b.id));
 else{const rnd=numberSeed(30931);pool.forEach(n=>n.random=rnd());pool.sort((a,b)=>a.random-b.random);}
 const removed=new Set(pool.slice(0,count).map(n=>n.id));
 let totalService=0,cutService=0,orphanedEdges=0;
 const byType=serviceTypes.map(type=>({type,amount:0,count:0}));
 GRAPH.edges.forEach(e=>{
  if(e.type!=='service')return;totalService+=e.value;
  const target=GRAPH.nodes.find(n=>n.id===e.target);
  const index=serviceTypes.indexOf(target.type);byType[index].amount+=e.value;byType[index].count++;
  if(removed.has(e.target)){cutService+=e.value;orphanedEdges++;}
 });
 const sorted=Array.from(inWeight.entries()).filter(x=>x[0].startsWith('S')).sort((a,b)=>b[1]-a[1]);
 const hhi=sorted.reduce((sum,x)=>sum+(x[1]/totalService)**2,0);
 const serviceNoSupplier=120-sorted.filter(x=>x[1]>0).length;
 return {nodes:GRAPH.nodes.length,edges:GRAPH.edges.length,serviceEdges:600,cut:count,mode,
  cutEdges:orphanedEdges,cutValue:cutService,totalService,
  impactPct:totalService?cutService/totalService:0,serviceHHI:hhi,
  serviceNoSupplier,selected:Array.from(removed),top:sorted.slice(0,8).map(x=>({id:x[0],weight:x[1],indegree:incoming.get(x[0])})),
  byType,graph:GRAPH,note:'基于固定种子的500个合成主体及680条有向关系。节点删除显示连接与金额失联，不等于实际GDP或真实损失。'};
}
const API={HISTORY:DATA,VARIABLES,HYPOTHESES,DAG,describe,variable,compareModels,networkStress,shares};
root.BoluoResearch=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
