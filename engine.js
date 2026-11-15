/* Boluo Internal Lab: deterministic browser-side conditional simulation.
   2025 macro baseline is published; all growth, micro relations and surveys are synthetic. */
(function (root) {
'use strict';
const DATA = Object.freeze({
  gdp:1005.45, p:107.44, s:549.01, t:349.00, year:2025,
  investment:-18.8, realEstate:-47.6, industrialValueGrowth:8.7,
  agricultureGrowth:7.8, electronicGrowth:23, retailGrowth:3.9,
  retail:296.99, tourism:1028.09, enterprises:1407,
  sources:[
    {name:'2025县域经济核算及产业结构',tag:'A｜公开统计',url:'https://www.xinhuanet.com/20260211/7a4680a74ae040fa9cb36d8e7839b8b2/c.html'},
    {name:'2025工业、投资与结构数据',tag:'B｜统计公报转载',url:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2'},
    {name:'十五五末力争超过1600亿元',tag:'B｜领导访谈',url:'https://epaper.nfnews.com/nfdaily/html/202605/13/content_10170180.html'},
    {name:'2026年预期GDP增速6.5%—7%',tag:'B｜政府报告转述',url:'https://epaper.nfnews.com/nfdaily/html/202602/06/content_10162500.html'}
  ]
});
const PRESETS = Object.freeze({
 balanced:{name:'三产协同',d:[0,0,0],note:'不额外偏向某一产业'},
 industrial:{name:'工业接续',d:[0,.017,.004],note:'制造扩能与配套服务同步'},
 services:{name:'服务补位',d:[.002,.007,.020],note:'本地专业服务承接增强'},
 agriculture:{name:'农业价值链',d:[.026,.004,.009],note:'农业加工流通提高'},
 stress:{name:'投资承压',d:[-.006,-.017,-.016],note:'项目延迟与配套约束'},
});
const EFFECTS = Object.freeze({
 agriculture:[.023,.002,.003],manufacturing:[.001,.016,.004],
 services:[.001,.004,.019],talent:[0,.008,.011],project_delay:[0,-.014,-.004]
});
const LABELS={agriculture:'农业提质',manufacturing:'工业升级',services:'专业服务',talent:'人才配套',project_delay:'项目延期'};
const BASE_RATE=[.060,.073,.105], SD=[.026,.035,.040];
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function saneNumber(x,def){return Number.isFinite(Number(x)) ? Number(x) : def;}
function normalize(input){
 const obj=input||{};
 const year=obj.year===2032?2032:2030;
 const target=clamp(saneNumber(obj.target,year===2032?1500:1600),900,2500);
 const knobs={};
 Object.keys(EFFECTS).forEach(k=>{knobs[k]=clamp(saneNumber((obj.knobs||{})[k],0),k==='project_delay'?0:-1,1);});
 return {year,target,scenario:PRESETS[obj.scenario]?obj.scenario:'balanced',knobs,
  seed:Math.floor(clamp(saneNumber(obj.seed,20321111),1,4294967294)),
  draws:Math.floor(clamp(saneNumber(obj.draws,2500),300,5000))};
}
function rng(seed){
 let a=(seed>>>0)||1;
 return function(){a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function gaussian(next){
 let spare=null;
 return function(){if(spare!==null){const x=spare;spare=null;return x;}
 const u=Math.max(1e-12,next()),v=next(),r=Math.sqrt(-2*Math.log(u));
 spare=r*Math.sin(2*Math.PI*v);return r*Math.cos(2*Math.PI*v);};
}
function quantile(values,q){if(!values.length)return NaN;const a=values.slice().sort((x,y)=>x-y),pos=(a.length-1)*q,j=Math.floor(pos),r=pos-j;return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*r;}
function dist(arr){return {p10:quantile(arr,.1),p50:quantile(arr,.5),p90:quantile(arr,.9)};}
function growth(input){
 const s=normalize(input),r=BASE_RATE.map((v,i)=>v+PRESETS[s.scenario].d[i]);
 Object.keys(EFFECTS).forEach(k=>EFFECTS[k].forEach((v,i)=>{r[i]+=v*s.knobs[k]}));
 return r;
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8);}
function run(input){
 const s=normalize(input),rates=growth(s),next=rng(s.seed),normal=gaussian(next),N=s.draws;
 let current=Array.from({length:N},()=>[DATA.p,DATA.s,DATA.t]);
 const history=[{year:2025,p:DATA.p,s:DATA.s,t:DATA.t,total:DATA.gdp,p10:DATA.gdp,p90:DATA.gdp}];
 for(let y=2026;y<=s.year;y++){
  for(let i=0;i<N;i++){
   const z0=normal(),z1=normal(),z2=normal();
   const shocks=[SD[0]*z0,SD[1]*(.20*z0+.979795897*z1),SD[2]*(.13*z0+.30*z1+.944*z2)];
   for(let k=0;k<3;k++)current[i][k]*=1+clamp(rates[k]+shocks[k],-.18,.30);
  }
  const a=current.map(row=>row[0]),b=current.map(row=>row[1]),c=current.map(row=>row[2]),sum=current.map(row=>row[0]+row[1]+row[2]);
  history.push({year:y,p:quantile(a,.5),s:quantile(b,.5),t:quantile(c,.5),
   total:quantile(sum,.5),p10:quantile(sum,.1),p90:quantile(sum,.9)});
 }
 const p=current.map(r=>r[0]),b=current.map(r=>r[1]),t=current.map(r=>r[2]);
 const totals=current.map(r=>r[0]+r[1]+r[2]),range=dist(totals);
 const hist=new Array(22).fill(0),min=Math.min(...totals),max=Math.max(...totals);
 totals.forEach(x=>hist[Math.min(21,Math.floor((x-min)/(max-min||1)*22))]++);
 const sector=[p,b,t].map(a=>dist(a));
 const shares=current.map(r=>r.map(v=>v/(r[0]+r[1]+r[2])));
 const share=[0,1,2].map(i=>quantile(shares.map(r=>r[i]),.5));
 const hit=totals.filter(x=>x>=s.target).length/N;
 const structural=shares.filter(r=>Math.max(Math.abs(r[0]-.1),Math.abs(r[1]-.5),Math.abs(r[2]-.4))<=.01).length/N;
 return {state:s,rate:rates,history,sector,share,total:range,hit,structural,
  gap:s.target-range.p50,histogram:{counts:hist,min,max},samples:N,
  runId:hash(JSON.stringify(s)),notes:'前台以真实2025年宏观基准及C级增长与扰动假设计算；并非统计预测或经验证的因果估计'};
}
function sensitivity(input){
 const s=normalize(input),seed=s.seed,base={...s,draws:850},v0=run(base).total.p50;
 return Object.keys(EFFECTS).map(k=>{
   const amount=k==='project_delay'? .5:.5;
   const plus=run({...base,knobs:{...s.knobs,[k]:clamp(s.knobs[k]+amount,k==='project_delay'?0:-1,1)}}).total.p50;
   const minus=run({...base,knobs:{...s.knobs,[k]:clamp(s.knobs[k]-amount,k==='project_delay'?0:-1,1)}}).total.p50;
   return {key:k,name:LABELS[k],minus:minus-v0,plus:plus-v0,span:Math.abs(plus-minus),base:v0,seed};
 }).sort((a,b)=>b.span-a.span);
}
function network(input){
 const s=normalize(input),next=rng(982140),types=['研发设计','检测认证','物流仓储','工业软件','商务服务'];
 const services=Array.from({length:120},(_,i)=>({id:'S'+(i+1),type:types[i%5],income:0,degree:0}));
 const edges=[];let amount=0;
 for(let i=0;i<300;i++)for(let k=0;k<2;k++){
  const id=(i*17+k*31)%120,price=.05+next()*3.95;
  services[id].income+=price;services[id].degree++;edges.push({source:'M'+(i+1),target:services[id].id,value:price,type:'service'});
  amount+=price;
 }
 for(let i=0;i<80;i++)edges.push({source:'A'+(i+1),target:'M'+((i*7)%300+1),value:.05+next()*1.95,type:'agri'});
 const sorted=services.slice().sort((a,b)=>b.income-a.income),totals=types.map(type=>({name:type,amount:services.filter(s=>s.type===type).reduce((a,b)=>a+b.income,0)}));
 const removed=new Set(sorted.slice(0,10).map(s=>s.id)),lost=edges.filter(e=>e.type==='service'&&removed.has(e.target));
 const capacity=clamp(1+s.knobs.services*.18+s.knobs.talent*.10-s.knobs.project_delay*.12,.60,1.35);
 const risk=clamp((1-capacity)*100,0,100);
 return {nodes:500,edges:edges.length,serviceEdges:600,agriEdges:80,syntheticMillion:amount,
  services:totals,leaders:sorted.slice(0,5),lostEdges:lost.length,
  lostDemand:lost.reduce((sum,e)=>sum+e.value,0),capacity,risk,
  note:'500主体与680条边均由固定随机种子合成；断点与交易额仅用于机制演示，不是实际企业名单'};
}
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function pearson(a,b){const ma=mean(a),mb=mean(b);let top=0,aa=0,bb=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;top+=x*y;aa+=x*x;bb+=y*y;}return top/Math.sqrt(aa*bb||1);}
function z(x){const m=mean(x),sd=Math.sqrt(mean(x.map(v=>(v-m)**2)))||1;return x.map(v=>(v-m)/sd);}
function alpha(block){const k=block[0].length,n=block.length;const vs=[];for(let j=0;j<k;j++)vs.push(block.map(r=>r[j]));const variance=a=>mean(a.map(v=>(v-mean(a))**2));const item=vs.reduce((a,b)=>a+variance(b),0),vTotal=variance(block.map(r=>r.reduce((a,b)=>a+b,0)));return k/(k-1)*(1-item/(vTotal||1));}
function sample(seed,n){
 const random=rng(seed),normal=gaussian(random),rows=[];
 for(let i=0;i<n;i++){
  const size=normal(),sa=normal()*.92+.2*size;
  const su=.61*sa+.13*size+normal()*.72,op=.37*su+.17*sa+.2*size+normal()*.78;
  const build=(latent,num)=>Array.from({length:num},()=>clamp(Math.round(4+latent*1.1+normal()*.7),1,7));
  rows.push({SA:build(sa,4),SU:build(su,3),OP:build(op,3)});
 }
 return rows;
}
function estimate(rows){
 /* Exploratory Mode-A PLS scores with centroid-scheme inner proxies.
    Not SmartPLS equivalence certified, not causal inference. */
 const names=['SA','SU','OP'],xs={},weights={};
 for(const name of names){
  const columns=rows[0][name].map((_,j)=>z(rows.map(r=>r[name][j])));
  xs[name]=rows.map((_,i)=>columns.map(c=>c[i]));
  weights[name]=columns.map(()=>1/Math.sqrt(columns.length));
 }
 let iteration=0,converged=false;
 function getScores(){
  const scores={};
  for(const name of names){
   const v=xs[name].map(row=>row.reduce((sum,value,j)=>sum+value*weights[name][j],0));
   scores[name]=z(v);
  }
  return scores;
 }
 for(iteration=0;iteration<90;iteration++){
  const scores=getScores(),updated={};let maxDelta=0;
  for(const name of names){
   const neighbors=names.filter(k=>k!==name);
   const signs=neighbors.map(k=>pearson(scores[name],scores[k])>=0?1:-1);
   const proxy=scores[name].map((_,i)=>neighbors.reduce((sum,k,j)=>sum+signs[j]*scores[k][i],0));
   let values=weights[name].map((_,j)=>xs[name].reduce((sum,row,i)=>sum+row[j]*proxy[i],0));
   const mag=Math.sqrt(values.reduce((sum,v)=>sum+v*v,0))||1;
   values=values.map(v=>v/mag);
   if(values.reduce((sum,v)=>sum+v,0)<0)values=values.map(v=>-v);
   const delta=Math.sqrt(values.reduce((sum,v,i)=>sum+(v-weights[name][i])**2,0));
   maxDelta=Math.max(delta,maxDelta);
   updated[name]=values;
  }
  for(const name of names)weights[name]=updated[name];
  if(maxDelta<1e-7){converged=true;break;}
 }
 const scores=getScores();
 const a=pearson(scores.SA,scores.SU),b=pearson(scores.SA,scores.OP),c=pearson(scores.SU,scores.OP);
 const den=Math.max(1e-5,1-a*a),direct=(b-a*c)/den,indirect=(c-a*b)/den;
 const ave={},loadings={},rhoC={};
 for(const name of names){
  const colCount=xs[name][0].length;
  const indicatorLoadings=Array.from({length:colCount},(_,j)=>pearson(xs[name].map(r=>r[j]),scores[name]));
  ave[name]=mean(indicatorLoadings.map(v=>v*v));
  loadings[name]=indicatorLoadings;
  const summed=indicatorLoadings.reduce((a,b)=>a+b,0);
  const error=indicatorLoadings.reduce((a,v)=>a+Math.max(0,1-v*v),0);
  rhoC[name]=(summed*summed)/(summed*summed+error||1);
 }
 const r2op=clamp(direct*b+indirect*c,0,1),denom=Math.max(1e-8,1-r2op);
 const f2={'SA→SU':(a*a)/(Math.max(1e-8,1-a*a)),
  'SA→OP':Math.max(0,(r2op-c*c)/denom),
  'SU→OP':Math.max(0,(r2op-b*b)/denom)};
 return {paths:{'SA→SU':a,'SA→OP':direct,'SU→OP':indirect},
  r2:{SU:a*a,OP:clamp(direct*b+indirect*c,0,1)},
  alpha:{SA:alpha(rows.map(r=>r.SA)),SU:alpha(rows.map(r=>r.SU)),OP:alpha(rows.map(r=>r.OP))},
  ave,loadings,rhoC,f2,converged,iterations:iteration+1};
}
function htmt(rows){
 const constructs=['SA','SU','OP'],columns={};
 for(const key of constructs)columns[key]=rows[0][key].map((_,j)=>rows.map(row=>row[key][j]));
 const within={};
 for(const key of constructs){
  const cols=columns[key],rs=[];
  for(let i=0;i<cols.length;i++)for(let j=i+1;j<cols.length;j++)rs.push(Math.abs(pearson(cols[i],cols[j])));
  within[key]=mean(rs);
 }
 const pairs=[['SA','SU'],['SA','OP'],['SU','OP']],result={};
 for(const [a,b] of pairs){
  const cross=[];for(const ca of columns[a])for(const cb of columns[b])cross.push(Math.abs(pearson(ca,cb)));
  const denom=Math.sqrt(within[a]*within[b]);
  result[a+'_'+b]=denom>1e-9?mean(cross)/denom:null;
 }
 return result;
}
function holdout(rows,seed){
 /* One reproducible 80/20 test for a simple construct-mean regression.
    It is NOT PLSpredict and does not reuse the PLS score estimator. */
 const next=rng(seed+491),arr=rows.map((row,i)=>({
  id:i,sa:mean(row.SA),su:mean(row.SU),op:mean(row.OP),order:next()}));
 arr.sort((a,b)=>a.order-b.order);
 const split=Math.floor(arr.length*.8),train=arr.slice(0,split),test=arr.slice(split);
 const meanOf=k=>mean(train.map(r=>r[k]));
 const ma=meanOf('sa'),mb=meanOf('su'),my=meanOf('op');
 const avg=(fn)=>mean(train.map(fn));
 const va=avg(r=>(r.sa-ma)**2),vb=avg(r=>(r.su-mb)**2),
  cov=avg(r=>(r.sa-ma)*(r.su-mb)),
  ca=avg(r=>(r.sa-ma)*(r.op-my)),cb=avg(r=>(r.su-mb)*(r.op-my));
 const den=Math.max(1e-8,va*vb-cov*cov);
 const ba=(ca*vb-cb*cov)/den,bb=(cb*va-ca*cov)/den;
 const prediction=r=>my+ba*(r.sa-ma)+bb*(r.su-mb);
 const errors=test.map(r=>(r.op-prediction(r))**2);
 const base=test.map(r=>(r.op-my)**2);
 const mse=mean(errors),mseBase=mean(base);
 return {train:train.length,test:test.length,rmse:Math.sqrt(mse),
  meanBaselineRMSE:Math.sqrt(mseBase),skill:mseBase>1e-9?1-mse/mseBase:null,
  method:'合成样本构念均分的80/20留出预测基准，非PLSpredict，也不构成PLS的样本外验证'};
}
function survey(input){
 const s=normalize(input),n=Math.floor(clamp(saneNumber((input||{}).sampleSize,300),100,500));
 const rows=sample(s.seed+42,n),fit=estimate(rows),next=rng(s.seed+201);
 const paths=Object.keys(fit.paths),results={};paths.forEach(k=>results[k]=[]);
 for(let k=0;k<120;k++){
  const bs=Array.from({length:n},()=>rows[Math.floor(next()*n)]);
  const x=estimate(bs);paths.forEach(name=>results[name].push(x.paths[name]));
 }
 const intervals={};paths.forEach(k=>intervals[k]=[quantile(results[k],.025),quantile(results[k],.975)]);
 return {...fit,n,intervals,htmt:htmt(rows),vifOP:1/(1-fit.paths['SA→SU']**2),holdout:holdout(rows,s.seed),bootstrap:120,source:'固定种子合成问卷；探索性Mode-A PLS内外权重估计 + 120次Bootstrap，未经SmartPLS逐项等价验证，非实测结论'};
}
function tea(receive=75,pay=12,daily=10){
 const gap=Math.max(0,receive-pay),money=gap*daily;
 return {receive,pay,gap,daily,money,note:'C级现金流机制演示，单位万元；不推断博罗实际企业融资缺口'};
}
const api={DATA,PRESETS,EFFECTS,LABELS,normalize,growth,run,sensitivity,network,survey,tea,quantile,hash};
root.BoluoEngine=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
