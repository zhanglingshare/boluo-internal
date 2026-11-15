/* Research visual grammar: SVG data-shapes derived from the current data/model. */
(function(root){
'use strict';
const R=root.BoluoResearch;if(!R)return;
const label=(x)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(x,d=1)=>Number(x).toFixed(d);
const money=x=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1});
const palette=['#61ddbd','#53a8f8','#f3c080'];
function history(mode){
 const d=R.HISTORY,desc=R.describe(),W=800,H=300,L=56,top=25,bottom=256;
 const x=i=>L+i*(W-L-26)/5;
 const grid=(lo,hi,ticks=4)=>Array.from({length:ticks+1},(_,i)=>{
  let val=lo+(hi-lo)*i/ticks,y=bottom-(val-lo)/(hi-lo)*(bottom-top);
  return '<line x1="'+L+'" x2="770" y1="'+y+'" y2="'+y+'" stroke="#4a6887" stroke-opacity=".27" stroke-dasharray="3 6"/>'+
   '<text x="48" y="'+(y+4)+'" fill="#a0b5d0" text-anchor="end" font-size="11">'+(mode==='share'?n(val*100,0)+'%':n(val,0))+'</text>';
 }).join('');
 let shape='',lo=0,hi=1;
 if(mode==='share'){
  const ss=d.map(r=>R.shares(r));
  const y=val=>bottom-val*(bottom-top);
  for(let k=2;k>=0;k--){
   const bot=ss.map(v=>k===0?0:k===1?v[0]:v[0]+v[1]),upt=ss.map(v=>bot[ss.indexOf(v)]+v[k]); // handled below via index to avoid duplicate values
   const topPts=ss.map((v,i)=>x(i)+','+y(v.slice(0,k+1).reduce((a,b)=>a+b,0))).join(' ');
   const lowPts=ss.slice().reverse().map((v,ii)=>{const i=5-ii;return x(i)+','+y(v.slice(0,k).reduce((a,b)=>a+b,0));}).join(' ');
   shape+='<polygon points="'+topPts+' '+lowPts+'" fill="'+palette[k]+'" fill-opacity=".48" stroke="'+palette[k]+'" stroke-opacity=".9" stroke-width="1.2"/>';
  }
 }else if(mode==='levels'){
  hi=610;
  const y=val=>bottom-val/hi*(bottom-top);
  for(let k=0;k<3;k++){
   const name=['p','s','t'][k];
   const pts=d.map((row,i)=>x(i)+','+y(row[name])).join(' ');
   shape+='<polyline points="'+pts+'" fill="none" stroke="'+palette[k]+'" stroke-width="3" stroke-linecap="round"/>';
   d.forEach((row,i)=>shape+='<circle cx="'+x(i)+'" cy="'+y(row[name])+'" r="4" fill="'+palette[k]+'"><title>'+row.year+' '+['一产','二产','三产'][k]+'：'+row[name]+'亿元</title></circle>');
  }
 }else{
  hi=1100;
  const y=val=>bottom-val/hi*(bottom-top);
  const pts=d.map((row,i)=>x(i)+','+y(row.gdp)).join(' ');
  shape+='<polyline points="'+pts+'" fill="none" stroke="#66d8ff" stroke-width="3.5"/>';
  d.forEach((row,i)=>shape+='<circle cx="'+x(i)+'" cy="'+y(row.gdp)+'" r="5" fill="#66d8ff"><title>'+row.year+' '+row.gdp+'亿元，'+row.stage+'</title></circle>');
  shape+='<circle cx="'+x(4)+'" cy="'+y(970.87)+'" r="8" fill="#f5be73" fill-opacity=".3" stroke="#f5be73" stroke-width="2">'+
   '<title>2024年GDP最终核实970.87亿元，产业分项仍为初步数</title></circle>'+
   '<path d="M'+x(4)+' '+y(952.24)+' L'+x(4)+' '+y(970.87)+'" stroke="#f5be73" stroke-width="3"/>'+
   '<text x="'+(x(4)-6)+'" y="'+(y(970.87)-13)+'" text-anchor="end" fill="#f5be73" font-size="11">修订 +18.63</text>';
 }
 shape+='<path d="M'+x(4)+' '+top+' V'+bottom+'" stroke="#f9be78" stroke-dasharray="5 7" opacity=".55"/>';
 shape+='<text x="'+(x(4)+7)+'" y="17" fill="#f4c486" font-size="11">2024修订口径</text>';
 const ys=d.map((row,i)=>'<text x="'+x(i)+'" y="280" font-size="12" text-anchor="middle" fill="#a6bdd8">'+row.year+'</text>').join('');
 const gridSvg=mode==='share'?grid(0,1):grid(0,hi);
 return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="博罗2020至2025年真实统计分产业'+mode+'图" class="linechart">'+gridSvg+shape+ys+'</svg>';
}
function waterfall(){
 const d=R.describe(),a=d.delta,tot=d.nominalTotal,max=tot;
 let cum=0;
 return '<div class="research-waterfall">'+a.map((v,i)=>{
   const before=cum;cum+=v;
   return '<div class="research-water-row"><span>'+['第一产业','第二产业','第三产业'][i]+'</span>'+
    '<div class="research-water-track"><i style="left:'+(100*before/max)+'%;width:'+(100*v/max)+'%;background:'+palette[i]+'"></i></div>'+
    '<b>+'+money(v)+' 亿</b></div>';
 }).join('')+
 '<div class="research-water-row total"><span>现价GDP增量</span><div class="research-water-track"><i style="width:100%;background:linear-gradient(90deg,#58bdc9,#4c90ee)"></i></div><b>+'+money(tot)+' 亿</b></div></div>';
}
function shareBars(){
 const d=R.describe(),a=d.shareStart,b=d.shareEnd;
 return '<div class="research-share-change">'+a.map((v,i)=>'<div class="research-share-unit"><span>'+['第一产业','第二产业','第三产业'][i]+'</span><div class="research-two-bars">'+
  '<div style="width:'+(v*100*1.5)+'%;background:'+palette[i]+';opacity:.35"></div>'+
  '<div style="width:'+(b[i]*100*1.5)+'%;background:'+palette[i]+'"></div></div>'+
  '<strong class="'+(b[i]>=v?'cyan':'gold')+'">'+(d.shareChangePp[i]>=0?'+':'')+n(d.shareChangePp[i])+' pp</strong></div>').join('')+
 '<p class="micro">半透明：2020年｜实色：2025年。单位是百分点，不是增长率。</p></div>';
}
function dag(selected){
 const nodes=[
 {id:'outside',title:'外部需求',x:45,y:56},{id:'investment',title:'资本投入',x:45,y:164},
 {id:'project_delivery',title:'项目兑现',x:264,y:164},{id:'talent',title:'人才技能',x:264,y:268},
 {id:'industrial',title:'制造产出',x:462,y:124},{id:'local_service',title:'本地服务承接',x:653,y:64},
 {id:'price',title:'价格变动',x:653,y:202},{id:'gdp',title:'名义增加值',x:835,y:156}
 ];
 const edges=[['outside','industrial'],['outside','investment'],['investment','project_delivery'],['talent','project_delivery'],
 ['project_delivery','industrial'],['industrial','local_service'],['industrial','gdp'],['local_service','gdp'],['price','gdp']];
 const map=Object.fromEntries(nodes.map(n=>[n.id,n]));
 let paths='';
 edges.forEach(([a,b])=>{const A=map[a],B=map[b],y1=A.y+22,y2=B.y+22;
  const x1=A.x+112,x2=B.x;
  paths+='<path d="M'+x1+' '+y1+' C'+(x1+34)+' '+y1+' '+(x2-34)+' '+y2+' '+x2+' '+y2+'" stroke="'+(a==='price'?'#f8be75':'#5c9ed0')+'" stroke-width="2" stroke-opacity=".6" fill="none" marker-end="url(#r-arrow)"/>';
 });
 return '<svg viewBox="0 0 1000 340" role="img" aria-label="可点击查看变量的候选机制图，连线是研究假说并非已识别因果">'+
 '<defs><marker id="r-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#76b6db"/></marker></defs>'+
 paths+nodes.map(n=>'<g data-variable="'+n.id+'" role="button" tabindex="0" aria-label="查看变量'+n.title+'" class="research-node">'+
 '<rect x="'+n.x+'" y="'+n.y+'" width="126" height="44" rx="10" fill="'+(selected===n.id?'#255c91':'#162d46')+'" stroke="'+(selected===n.id?'#83e1ff':'#3c7196')+'" stroke-width="1.5"/>'+
 '<text x="'+(n.x+63)+'" y="'+(n.y+27)+'" text-anchor="middle" font-size="13" fill="#f0f8ff">'+n.title+'</text></g>').join('')+'</svg>';
}
function networkMap(stress,selected){
 const tops=stress.top,W=840,H=355,services=tops.slice(0,8);
 const nodes=[{x:120,y:164,name:'制造 300',color:'#57a8fa'}, {x:713,y:245,name:'农业 80',color:'#f2c277'}];
 let marks='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="合成网络中三组主体与服务节点的聚合视图，点击服务主体查看节点"><defs>'+
 '<marker id="nnarrow" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#57a8fa"/></marker></defs>';
 nodes.forEach(n=>{marks+='<circle cx="'+n.x+'" cy="'+n.y+'" r="52" fill="'+n.color+'" fill-opacity=".15" stroke="'+n.color+'" stroke-width="2"/>'+
 '<text x="'+n.x+'" y="'+(n.y+4)+'" text-anchor="middle" fill="white" font-weight="700" font-size="15">'+n.name+'</text>';});
 services.forEach((n,i)=>{
  const x=370+(i%4)*88,y=76+Math.floor(i/4)*175;
  const picked=selected===n.id,removed=stress.selected.includes(n.id);
  marks+='<path d="M171 164 Q'+(200+i*11)+' '+(y+22)+' '+x+' '+(y+22)+'" fill="none" stroke="#5288bb" stroke-width="'+Math.max(.8,Math.min(4,n.weight/30))+'" opacity=".5"/>'+
   '<g data-service-node="'+n.id+'" role="button" tabindex="0" class="research-node">'+
   '<rect x="'+(x-26)+'" y="'+(y-13)+'" width="69" height="44" rx="9" fill="'+(removed?'#70404f':picked?'#315b81':'#1c374e')+'" stroke="'+(picked?'#8ef1ff':removed?'#ff8a95':'#70b5dd')+'" stroke-width="'+(picked?3:1)+'"/>'+
   '<text x="'+(x+8)+'" y="'+(y+6)+'" text-anchor="middle" fill="white" font-size="12">'+n.id+'</text>'+
   '<text x="'+(x+8)+'" y="'+(y+21)+'" text-anchor="middle" fill="#b9cce0" font-size="10">'+n.indegree+'条入边</text></g>';
 });
 marks+='<path d="M713 193 Q670 140 612 120" stroke="#f2c277" fill="none" stroke-width="1.5" stroke-dasharray="6 5"/>'+
 '<text x="700" y="305" fill="#9db4c9" font-size="12" text-anchor="middle">供应链关系汇聚</text>'+
 '<text x="440" y="327" fill="#9db4c9" font-size="12" text-anchor="middle">按合成采购额挑选的8个服务节点 · 非全部500个主体逐点绘制</text></svg>';
 return marks;
}
function comparison(model,target){
 const max=Math.max(target,...model.candidates.map(x=>x.value))*1.12;
 return '<div class="research-comparison"><div class="research-target-line">对照目标：'+money(target)+' 亿</div>'+
 model.candidates.map(x=>'<div class="research-cmp-row"><span>'+x.name+'</span><div class="research-cmp-track"><i style="width:'+(100*x.value/max)+'%"></i><em style="left:'+(100*target/max)+'%"></em></div>'+
 '<b>'+money(x.value)+' 亿</b></div>').join('')+
 '</div><p class="micro">蓝线：各假设下的机械结果，黄竖线：对照目标。模型分歧不是可信区间，更不能当作现实发生概率。</p>';
}
function stressSurface(surf,state){
 const ax=surf.axis,left=72,top=30,cw=57,ch=34,rows=ax.length;
 let parts='<svg viewBox="0 0 705 400" class="linechart" role="img" aria-label="制造业升级与服务承接两条件同时变化的2030或2032目标差额热力图。点击单元格即可更新两条件">';
 parts+='<text x="330" y="18" fill="#aac6df" text-anchor="middle" font-size="12">工业升级情景强度 →</text>';
 parts+='<text x="23" y="213" transform="rotate(-90,23,213)" fill="#aac6df" text-anchor="middle" font-size="12">专业服务情景强度 →</text>';
 ax.forEach((v,j)=>{parts+='<text x="'+(left+j*cw+cw/2)+'" y="360" fill="#9cb5cc" text-anchor="middle" font-size="11">'+v.toFixed(2)+'</text>';});
 ax.forEach((v,i)=>{parts+='<text x="62" y="'+(top+i*ch+21)+'" fill="#9cb5cc" text-anchor="end" font-size="11">'+v.toFixed(2)+'</text>';});
 surf.values.forEach((p,i)=>{
  const row=Math.floor(i/9),col=i%9;
  const norm=(p.value-surf.minimum)/(surf.maximum-surf.minimum||1);
  const rr=Math.round(128-72*norm),gg=Math.round(73+130*norm),bb=Math.round(83+130*norm);
  const isActive=Math.abs(p.manufacturing-state.knobs.manufacturing)<.01&&Math.abs(p.services-state.knobs.services)<.01;
  const x=left+col*cw,y=top+row*ch,fill='rgb('+rr+','+gg+','+bb+')';
  parts+='<g data-heat="'+p.manufacturing+','+p.services+'" class="research-node" role="button" tabindex="0" aria-label="工业条件'+p.manufacturing+'，服务条件'+p.services+'，无冲击总量'+p.value.toFixed(0)+'亿元">'+
  '<rect x="'+(x+2)+'" y="'+(y+2)+'" width="'+(cw-4)+'" height="'+(ch-4)+'" rx="5" fill="'+fill+'" fill-opacity=".8" stroke="'+(isActive?'#ffffff':'#193149')+'" stroke-width="'+(isActive?3:1)+'">'+
  '<title>工业 '+p.manufacturing+' / 服务 '+p.services+'；确定性总量 '+p.value.toFixed(1)+'亿元；距目标 '+p.gap.toFixed(1)+'亿元</title></rect>'+
  '<text x="'+(x+cw/2)+'" y="'+(y+23)+'" text-anchor="middle" font-size="11" fill="white">'+Math.round(p.value)+'</text></g>';
 });
 parts+='<text x="615" y="71" fill="#90a9c6" font-size="11">合成情景</text>'+
 '<rect x="596" y="90" width="27" height="18" rx="5" fill="rgb(128,73,83)"/><text x="634" y="104" fill="#d0dce9" font-size="11">较低</text>'+
 '<rect x="596" y="126" width="27" height="18" rx="5" fill="rgb(56,203,213)"/><text x="634" y="140" fill="#d0dce9" font-size="11">较高</text>'+
 '<text x="598" y="190" fill="#b2cce3" font-size="11">点击单元格</text><text x="598" y="210" fill="#b2cce3" font-size="11">重新运行风洞</text>'+
 '<text x="75" y="386" fill="#8fa6c2" font-size="11">同一模型的确定性联合响应；无随机扰动，无因果交互项估计</text></svg>';
 return parts;
}
function backtestTable(backtest){
 return '<table class="research-backtest"><thead><tr><th>留出年</th><th>实际GDP</th><th>历史外推误差</th><th>7.3%基准误差</th></tr></thead><tbody>'+
 backtest.tests.map(r=>'<tr><td>'+r.year+'</td><td>'+money(r.actual)+' 亿</td><td>'+n(r.histAbsError*100)+'%</td><td>'+n(r.constantAbsError*100)+'%</td></tr>').join('')+
 '</tbody></table>';
}

root.BoluoResearchViz={history,waterfall,shareBars,dag,networkMap,comparison,stressSurface,backtestTable};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BoluoResearchViz;
})(typeof window!=='undefined'?window:globalThis);
