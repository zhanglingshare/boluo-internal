/* V5 graphics: empirical structure versus explicitly assumed mechanisms. */
(function(root){
'use strict';
const A=root.BoluoV5;if(!A)return;
const esc=x=>String(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const fmt=(x,d=1)=>Number(x).toFixed(d);
function entropy(history){
 const xs=history.rows,W=740,H=255,L=58,R=27,T=26,B=215,maxE=1.1,
  x=i=>L+i*(W-L-R)/(xs.length-1),y=v=>B-v/maxE*(B-T);
 let out='<svg class="linechart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="博罗三次产业组成的香农熵与HHI方向诊断。熵越大表示三大类份额越均衡，非产业多样性全貌">';
 for(let i=0;i<=5;i++){const v=i*.2;out+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#6080a0" opacity=".25"/><text x="45" y="'+(y(v)+4)+'" text-anchor="end" fill="#a4bfd5" font-size="11">'+fmt(v,1)+'</text>';}
 for(const [key,color] of [['entropy','#68d8ec'],['hhi','#ecc27c']]){
  out+='<polyline points="'+xs.map((a,i)=>x(i)+','+y(a[key])).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3.3" stroke-linejoin="round"/>';
  xs.forEach((a,i)=>out+='<circle cx="'+x(i)+'" cy="'+y(a[key])+'" r="4.2" fill="'+color+'"><title>'+a.year+' '+(key==='entropy'?'H熵':'HHI')+' '+fmt(a[key],4)+'</title></circle>');
 }
 xs.forEach((a,i)=>out+='<text x="'+x(i)+'" y="238" text-anchor="middle" fill="#b4cbdb" font-size="11">'+a.year+'</text>');
 out+='<text x="62" y="17" fill="#9fb8d2" font-size="11">三次产业宽口径集中/均衡度</text></svg>';
 return out+'<div class="chartkey"><span><b style="background:#68d8ec"></b>香农熵H</span><span><b style="background:#ecc27c"></b>HHI</span></div>';
}
function feasibility(m){
 const vals=m.rows,max=Math.max(...vals.map(x=>Math.max(x.requiredRate===null?0:x.requiredRate,.01)),m.required,.25);
 return '<div class="v5-feasibility">'+vals.map(row=>'<div class="v5-feas-row"><span>'+esc(row.name)+'</span><div class="v5-feas-track"><i style="width:'+Math.max(0,Math.min(100,row.baselineRate/max*100))+'%"></i>'+
 (row.requiredRate!==null?'<em style="left:'+Math.max(0,Math.min(100,row.requiredRate/max*100))+'%"></em>':'')+'</div>'+
 '<b>'+(row.requiredRate===null?'无正值解':fmt(row.requiredRate*100,1)+'%')+'</b></div>').join('')+
 '<div class="chartkey"><span><b style="background:#59b9dc"></b>当前名义增长假设</span><span><b style="background:#edc079"></b>仅此产业承担目标后的反解点</span></div></div>';
}
function pairedNetworks(result){
 const max=Math.max(result.targeted.cutValue,result.random.cutValue,.001);
 return '<div class="v5-compare-net">'+[
 ['攻击高交易额服务节点',result.targeted.cutValue,result.targeted.cutEdges,'#efba75'],
 ['固定种子随机移除',result.random.cutValue,result.random.cutEdges,'#66bfe0']
 ].map(([name,value,edges,color])=>
 '<div><span>'+name+'</span><div class="v5-net-track"><i style="width:'+(100*value/max)+'%;background:'+color+'"></i></div>'+
 '<b>'+fmt(value,1)+' <small>百万元</small></b><small>'+edges+'条边断开</small></div>'
 ).join('')+'</div>';
}
function modelVotes(compare){
 return '<div class="v5-model-votes">'+compare.cases.map(x=>'<div><b>'+esc(x.name)+'</b>'+
 '<strong class="'+(x.above?'good':'bad')+'">'+(x.above?'高于':'低于')+'门槛</strong>'+
 '<span>'+(x.margin>0?'+':'')+fmt(x.margin,1)+'亿元</span></div>').join('')+'</div>';
}
function teaDays(trial){
 const s=trial.scenarios,max=Math.max(1,...s.map(x=>x.out.money));
 return '<div class="v5-tea-scenarios">'+s.map(x=>
 '<div><span>'+esc(x.name)+'</span><div class="v5-tea-track"><i style="width:'+(x.out.money/max*100)+'%"></i></div>'+
 '<strong>'+fmt(x.out.money,0)+'万元</strong><small>'+x.out.gap+'天错配</small></div>').join('')+'</div>';
}
function quality(review){
 const max=review.total;
 return '<div class="v5-quality">'+review.thresholds.map(x=>
 '<div><div class="row wrap"><span>'+esc(x.label)+'</span><b class="'+(x.flag?'good':'bad')+'">'+fmt(x.value,3)+'</b></div>'+
 '<div class="micro">'+esc(x.guide)+' · '+esc(x.explanation)+'</div></div>').join('')+'</div>';
}
function gateMap(assurance){
 return '<div class="v5-gate-grid">'+assurance.map((x,i)=>
 '<div class="v5-gate '+(x.status==='已编码'?'implemented':'blocked')+'"><span class="v5-gate-number">'+String(i+1).padStart(2,'0')+'</span>'+
 '<div><b>'+esc(x.name)+'</b><small>'+esc(x.test)+'</small></div>'+
 '<strong>'+esc(x.status)+'</strong></div>').join('')+'</div>';
}
root.BoluoV5Viz={entropy,feasibility,pairedNetworks,modelVotes,teaDays,quality,gateMap};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BoluoV5Viz;
})(typeof window!=='undefined'?window:globalThis);
