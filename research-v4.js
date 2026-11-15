/* Boluo Research V4. Official statistical-report snapshots; no fabricated supplier contracts.
   All comparisons are descriptive, not causal matched controls. */
(function(root){
'use strict';
const S={
 b2020:'https://zgrkk.com/reports/12321.html',
 b2021:'https://tjgb.hongheiku.com/xjtjgb/xj2020/27206.html',
 b2022:'https://tjgb.hongheiku.com/xjtjgb/xj2020/38495.html',
 b2023:'https://www.quyushuju.com/forum.php?mod=viewthread&tid=80477',
 b2024:'https://tjgb.hongheiku.com/xjtjgb/xj2020/65264.html',
 b2025:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2',
 huicheng:'https://tjgb.hongheiku.com/xjtjgb/xj2020/73497.html',
 huiyang:'https://tjgb.hongheiku.com/xjtjgb/xj2020/74268.html',
 huidong:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E6%83%A0%E4%B8%9C%E5%8E%BF/report/hui-zhou-shi-2025-nian-hui-dong-xian-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao',
 longmen:'https://tjgb.hongheiku.com/xjtjgb/xj2020/74106.html',
 industryNews:'https://epaper.nfnews.com/nfdaily/html/202601/27/content_10161537.html'
};
const YEARS=[
 {year:2020,shares:[24.2,13,6.2,null,null],sizes:[31,24.2,44.8],growth:1.9,source:'b2020',note:'小型44.0%+微型0.8%归为小微；未披露的行业保留缺失'},
 {year:2021,shares:[21.9,15.3,7.7,7.1,null],sizes:[27.3,24.2,48.5],growth:16.3,source:'b2021',note:'公报列示前五行业未包含电力热力，不能填零'},
 {year:2022,shares:[20.8,15.9,8.6,7.6,4.1],sizes:[27.4,23.5,49],growth:4.0,source:'b2022',note:'2022规模结构总和99.9%，属于公报修约'},
 {year:2023,shares:[18.6,14,9.5,8.1,5.1],sizes:[20.9,24.4,54.7],growth:8.1,source:'b2023',note:'公报公布的年末行业占比，不推导未公布的企业级关系'},
 {year:2024,shares:[20.2,14,10.5,8.2,6.3],sizes:[19.8,24.9,55.4],growth:7.9,source:'b2024',note:'2024规模结构合计100.1%，按原公报保留修约'},
 {year:2025,shares:[23.2,14.2,9.6,8.2,6.2],sizes:[19.2,24,56.8],growth:8.7,source:'b2025',note:'2025已披露五行业约61.4%，其他行业不自动补值'}
];
const INDUSTRIES=[
 {id:'electronics',name:'电子设备制造',type:'规上工业增加值份额',taxonomy:'计算机、通信和其他电子设备制造业'},
 {id:'electrical',name:'电气机械',type:'规上工业增加值份额',taxonomy:'电气机械和器材制造业'},
 {id:'rubber',name:'橡胶塑料',type:'规上工业增加值份额',taxonomy:'橡胶和塑料制品业'},
 {id:'metal',name:'金属制品',type:'规上工业增加值份额',taxonomy:'金属制品业'},
 {id:'power',name:'电力热力',type:'规上工业增加值份额',taxonomy:'电力、热力生产和供应业'}
];
const REGIONS=[
 {id:'boluo',name:'博罗',kind:'县',gdp:1005.45,parts:[107.44,549.01,349.00],realGrowth:5.5,industrialGrowth:8.7,investGrowth:-18.8,source:'b2025',role:'制造业占比较高的县域'},
 {id:'huicheng',name:'惠城',kind:'城区',gdp:1203.33,parts:[40.57,332.87,829.89],realGrowth:4.3,industrialGrowth:10.8,investGrowth:-37.1,source:'huicheng',role:'第三产业占主导的市中心城区'},
 {id:'huiyang',name:'惠阳',kind:'城区',gdp:878.04,parts:[29.40,570.43,278.21],realGrowth:3.3,industrialGrowth:7.2,investGrowth:-23.1,source:'huiyang',role:'制造业比重更高的城区'},
 {id:'huidong',name:'惠东',kind:'县',gdp:861.25,parts:[99.00,305.39,456.86],realGrowth:4.0,industrialGrowth:12.1,investGrowth:null,source:'huidong',role:'农业与服务业比重较大的县域'},
 {id:'longmen',name:'龙门',kind:'县',gdp:217.62,parts:[44.43,63.20,109.98],realGrowth:7.4,industrialGrowth:11.5,investGrowth:8.3,source:'longmen',role:'农业和服务业占比较高的小规模县域'}
];
const ENTITY_CLUES=[
 {name:'欣旺达',kind:'企业',observed:'公开媒体报道点名的百亿级企业',link:'industryNews',missing:'与博罗本地供应商的真实采购关系、研发物流本地化、实际结算地'},
 {name:'华通',kind:'企业',observed:'公开媒体报道点名的百亿级企业',link:'industryNews',missing:'供应商名单、订单流向、服务采购和价值增加值的交叉核验'}
];
const dim=['第一产业','第二产业','第三产业'];
const norm=a=>{const sum=a.reduce((x,y)=>x+y,0);return a.map(x=>x/sum);};
function safeId(value,list){return list.includes(value)?value:list[0];}
function history(industry='electronics',kind='industry'){
 const selected=safeId(industry,INDUSTRIES.map(x=>x.id)),i=INDUSTRIES.findIndex(x=>x.id===selected);
 const data=YEARS.map(y=>({year:y.year,share:kind==='size'?null:y.shares[i],large:y.sizes[0],medium:y.sizes[1],small:y.sizes[2],industrialGrowth:y.growth,
 source:S[y.source],available:kind==='size'||y.shares[i]!==null,note:y.note}));
 const withValue=data.filter(r=>r.available&&r.share!==null);
 const first=withValue[0],last=withValue[withValue.length-1];
 return {data,selected,name:INDUSTRIES[i].name,type:kind,
 delta:kind==='size'?null:last.share-first.share,firstYear:first?.year,lastYear:last?.year,
 warning:'年末占比（增加值现价结构）与各年同比增速（可比价）不能相乘后求贡献；企业样本及规上统计范围可能改变。断档年份不插值。'};
}
function percent(region){return norm(region.parts).map(x=>100*x);}
function divergence(a,b){
 const p=norm(a),q=norm(b),m=p.map((v,i)=>(v+q[i])/2);
 const kl=(x,y)=>x.reduce((sum,v,i)=>sum+(v>0?v*Math.log2(v/y[i]):0),0);
 return Math.sqrt(Math.max(0,(kl(p,m)+kl(q,m))/2));
}
function compare(peerId='huiyang'){
 const peer=REGIONS.find(r=>r.id===peerId&&r.id!=='boluo')||REGIONS[2],bo=REGIONS[0],other=REGIONS.filter(r=>r.id!=='boluo');
 const summed=[0,1,2].map(i=>other.reduce((sum,r)=>sum+r.parts[i],0));
 const weights=norm(summed),boluo=norm(bo.parts),p=norm(peer.parts);
 const loc=boluo.map((v,i)=>v/weights[i]);
 const dist=REGIONS.filter(r=>r.id!=='boluo').map(r=>({id:r.id,name:r.name,distance:divergence(bo.parts,r.parts)})).sort((a,b)=>a.distance-b.distance);
 return {peer,boluo:bo,all:REGIONS,benchShares:weights,shares:boluo,peerShares:p,
  lq:loc,jsDistance:divergence(bo.parts,peer.parts),distances:dist,subtotals:summed,
  caveat:'2025惠州市五县区横向结构快照，非准实验对照组。县与城区功能定位不同，二产包含建筑业；三产高比例不等于产业升级更高级。产业结构距离不能代表经济相似性的全部维度。'};
}
function retention(opts={}){
 const local=Math.max(0,Math.min(100,Number.isFinite(Number(opts.local))?Number(opts.local):30));
 const va=Math.max(0,Math.min(100,Number.isFinite(Number(opts.va))?Number(opts.va):35));
 const improvement=Math.max(0,Math.min(100-local,Number.isFinite(Number(opts.improve))?Number(opts.improve):20));
 const localPay=local,external=100-local,added=localPay*va/100,intermediate=localPay-added;
 const improvedVA=(local+improvement)*va/100;
 return {local,va,improvement,localPay,external,added,intermediate,improvedVA,
  delta:improvedVA-added,
  trivialBounds:[0,va],
  analytic:'假设每100单位专业服务采购支出，按本地采购份额和供应商增加值率将支出做会计示意分解。这里没有观测到博罗真实采购总额、本地采购率与增加值率。',
  caution:'该图不是博罗实际GDP留存测量。服务支出、县域增加值、利润与税收是不同概念；不能将图中每100单位结果乘工业GDP计算政策净收益。'};
}
function retentionSurface(){
 const rows=[];
 for(let local=0;local<=100;local+=10)for(let va=0;va<=100;va+=10)rows.push({local,va,result:local*va/100});
 return rows;
}
function evidenceReadiness(){
 return [
  {id:'manufacturing',title:'2020–2025制造业内部结构',status:'有部分观测',observable:'5类重点行业的公开增加值比重与规模类型',need:'行业完整覆盖、可比行业价格及企业进出样本',reason:'可分析份额变化，不能用份额变化直接识别技术跃迁'},
  {id:'crossRegion',title:'同市五地结构对照',status:'有部分观测',observable:'2025年三产增加值、GDP实际增速、部分投资与工业增速',need:'人口、建成区、产业价格和功能区等匹配特征',reason:'功能性对照而非匹配因果对照'},
  {id:'procurement',title:'真实企业间采购关系',status:'关键数据缺失',observable:'公开报道仅有部分企业名称和行业集群',need:'匿名企业供应商关联、采购金额与所在地',reason:'不能凭同一工业园或新闻共现推断交易边'},
  {id:'localService',title:'本地价值捕获',status:'关键数据缺失',observable:'公开GDP三产与部分行业规模',need:'服务采购预算、本地采购份额、供应商增加值率、跨区结算地',reason:'缺分子和分母，没有可识别的本地采购比例'},
  {id:'projectTiming',title:'投资→投产兑现时滞',status:'关键数据缺失',observable:'年度投资同比和工业增加值同比',need:'逐项目合同、建设、投产、爬坡批次',reason:'年度相关不能推断实际时滞与净因果效应'}
 ];
}
const API={S,YEARS,INDUSTRIES,REGIONS,ENTITY_CLUES,dim,history,percent,divergence,compare,retention,retentionSurface,evidenceReadiness};
root.BoluoV4=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
