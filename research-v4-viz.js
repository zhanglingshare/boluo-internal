/* V4 interactive visual grammar for traceable history, same-city structure and normalized service flows. */
(function(root){
'use strict';
const R=root.BoluoV4;if(!R)return;
const colors=['#68d8f2','#e5ba7b','#9f98f7','#6dd0a7','#f0879c'];
const esc=s=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const fmt=(n,d=1)=>Number(n).toFixed(d);
function industryHistory(selected='electronics',year=null){
 const W=850,H=310,L=62,RIGHT=90,T=20,B=257;
 const x=i=>L+(W-L-RIGHT)*i/5,y=v=>B-v/29*(B-T);
 let out='<svg class="linechart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="2020至2025五行业增加值份额变化，缺失年份不连线">';
 for(let i=0;i<=5;i++){const yy=y(i*5);out+='<line x1="'+L+'" x2="'+(W-RIGHT+15)+'" y1="'+yy+'" y2="'+yy+'" stroke="#426488" opacity=".3"/>'+
 '<text x="52" y="'+(yy+4)+'" text-anchor="end" fill="#acc3d6" font-size="11">'+i*5+'%</text>';
 }
 R.YEARS.forEach((item,i)=>{
  const activeY=item.year===year,half=(W-L-RIGHT)/10;
  if(activeY)out+='<rect x="'+(x(i)-half)+'" y="'+T+'" width="'+half*2+'" height="'+(B-T)+'" fill="#2b6f9e" opacity=".14"/>';
  out+='<g data-v4-year="'+item.year+'" role="button" tabindex="0" class="research-node">'+
  '<rect x="'+(x(i)-half+2)+'" y="272" width="'+(half*2-4)+'" height="36" fill="transparent"/>'+
  '<text x="'+x(i)+'" y="290" text-anchor="middle" fill="'+(activeY?'#fff':'#aabfd4')+'" font-size="'+(activeY?14:12)+'" font-weight="'+(activeY?800:400)+'">'+item.year+'</text></g>';
 });
 R.INDUSTRIES.forEach((industry,j)=>{
  const active=industry.id===selected,fill=colors[j];let group=[],segments=[];
  R.YEARS.forEach((row,i)=>{
    if(row.shares[j]===null){if(group.length>1)segments.push(group.join(' '));group=[];return;}
    group.push(x(i)+','+y(row.shares[j]));
  });
  if(group.length>1)segments.push(group.join(' '));
  segments.forEach(p=>out+='<polyline points="'+p+'" stroke="'+fill+'" stroke-width="'+(active?4.5:1.9)+'" opacity="'+(active?1:.43)+'" fill="none" stroke-linejoin="round"/>');
  R.YEARS.forEach((row,i)=>{const v=row.shares[j];if(v===null)return;
    const yActive=year!==null&&row.year===year;
    out+='<g data-v4-industry="'+industry.id+'" tabindex="0" role="button" class="research-node">'+
    '<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(active?(yActive?8:6):4)+'" fill="'+fill+'" opacity="'+(active?1:.60)+'" stroke="'+(yActive?'#fff':'none')+'" stroke-width="'+(yActive?2:0)+'"><title>'+row.year+' '+industry.name+'：'+v+'%</title></circle></g>';
  });
  const last=R.YEARS[5].shares[j];
  out+='<text x="'+(x(5)+10)+'" y="'+(y(last)+4)+'" font-size="'+(active?13:11)+'" fill="'+fill+'" opacity="'+(active?1:.8)+'">'+esc(industry.name.slice(0,4))+'</text>';
 });
 out+='<text x="58" y="12" fill="#a7c2d6" font-size="11">规上工业增加值份额 (%)</text></svg>';
 return out;
}
function industryHeatmap(selected='electronics',metric='shares',year=null){
 const W=780,H=290,L=132,T=30,CW=94,CH=37;
 let out='<svg class="linechart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="五类重点工业行业2020至2025按年份的'+(metric==='shares'?'份额':'同比增速')+'矩阵，缺失为虚线空白">';
 R.YEARS.forEach((row,i)=>{
  const activeY=row.year===year,half=CW/2;
  if(activeY)out+='<rect x="'+(L+CW*i)+'" y="'+T+'" width="'+(CW-1)+'" height="'+(CH*5-2)+'" fill="#2b6f9e" opacity=".13"/>';
  out+='<g data-v4-year="'+row.year+'" role="button" tabindex="0" class="research-node">'+
  '<rect x="'+(L+CW*i)+'" y="4" width="'+(CW-5)+'" height="22" fill="transparent"/>'+
  '<text x="'+(L+CW*i+CW/2)+'" y="19" text-anchor="middle" fill="'+(activeY?'#fff':'#adc9df')+'" font-size="'+(activeY?13:12)+'" font-weight="'+(activeY?800:400)+'" text-decoration="'+(activeY?'underline':'none')+'">'+row.year+'</text></g>';
 });
 R.INDUSTRIES.forEach((industry,j)=>{
  out+='<text x="124" y="'+(T+j*CH+24)+'" fill="'+(industry.id===selected?'#fff':'#aabed3')+'" text-anchor="end" font-size="11">'+esc(industry.name)+'</text>';
  R.YEARS.forEach((row,i)=>{
   const v=metric==='shares'?row.shares[j]:(row.rates||[])[j];
   let fill='#16263a';
   if(v!==null&&v!==undefined){
    if(metric==='shares'){const t=v/27;fill='rgb('+Math.round(32+t*32)+','+Math.round(71+t*118)+','+Math.round(94+t*120)+')';}
    else if(v<0){const k=Math.min(1,Math.abs(v)/30);fill='rgb('+Math.round(95+110*k)+','+Math.round(53+34*k)+','+Math.round(70+42*k)+')';}
    else{const k=Math.min(1,v/30);fill='rgb('+Math.round(33+34*k)+','+Math.round(79+117*k)+','+Math.round(102+103*k)+')';}
   }
   const xx=L+i*CW,yy=T+j*CH,ySel=year!==null&&row.year===year;
   out+='<g data-v4-industry="'+industry.id+'" role="button" tabindex="0" class="research-node">'+
    '<rect x="'+xx+'" y="'+yy+'" width="'+(CW-5)+'" height="'+(CH-5)+'" rx="7" fill="'+fill+'" stroke="'+(ySel?'#f6c453':industry.id===selected?'#eefbff':'#395875')+'" stroke-width="'+(ySel?3:industry.id===selected?2:1)+'" '+((v===null||v===undefined)?'stroke-dasharray="4 4"':'')+'/>'+
    '<text x="'+(xx+(CW-5)/2)+'" y="'+(yy+21)+'" fill="'+(v===null||v===undefined?'#8a9fb6':'#fff')+'" text-anchor="middle" font-size="12">'+(v===null||v===undefined?'缺测':(v>0&&metric!=='shares'?'+':'')+fmt(v)+'%')+'</text></g>';
  });
 });
 out+='<text x="137" y="256" fill="#9cafc6" font-size="11">每个数字均来自对应年份公布的规上工业口径；缺测不当作0。</text></svg>';
 return out;
}
function sizeHistory(year=null){
 let out='<div class="v4-size-timeline">';
 for(const row of R.YEARS){
  const total=row.sizes.reduce((a,b)=>a+b,0),activeY=row.year===year;
  out+='<div class="v4-size-year'+(activeY?' v4-year-active':'')+'" data-v4-year="'+row.year+'" role="button" tabindex="0"><span'+(activeY?' class="v4-year-label"':'')+'>'+row.year+'</span><div class="v4-size-stack">'+row.sizes.map((share,i)=>'<i title="'+['大型','中型','小微'][i]+share+'%" style="background:'+['#689ce7','#64cbbf','#f1bf80'][i]+';width:'+(share/total*100)+'%"></i>').join('')+'</div>'+
  '<span class="v4-mini">'+fmt(row.sizes[0])+' / '+fmt(row.sizes[1])+' / '+fmt(row.sizes[2])+'</span></div>';
 }
 return out+'</div><div class="chartkey"><span><b style="background:#689ce7"></b>大型</span><span><b style="background:#64cbbf"></b>中型</span><span><b style="background:#f1bf80"></b>小微</span></div>';
}
function ternary(selected='huiyang'){
 const v=[[116,350],[410,46],[704,350]]; // agriculture, manufacturing, services
 const xy=r=>{const p=R.percent(r).map(x=>x/100);return {x:p[0]*v[0][0]+p[1]*v[1][0]+p[2]*v[2][0],y:p[0]*v[0][1]+p[1]*v[1][1]+p[2]*v[2][1]};};
 let out='<svg class="linechart" viewBox="0 0 820 405" role="img" aria-label="2025惠州五县区三次产业结构三元图：同一城市内部产业分工对照，不是强弱排名">';
 out+='<polygon points="116,350 410,46 704,350" fill="#0f2840" fill-opacity=".68" stroke="#6494b6" stroke-width="2"/>';
 for(let t=.2;t<1;t+=.2){
  const u=(a,b)=>a*(1-t)+b*t;
  [[0,1,2],[1,2,0],[2,0,1]].forEach(([a,b,c])=>{
    out+='<line x1="'+u(v[a][0],v[b][0])+'" y1="'+u(v[a][1],v[b][1])+'" x2="'+u(v[a][0],v[c][0])+'" y2="'+u(v[a][1],v[c][1])+'" stroke="#3f7395" opacity=".2"/>';
  });
 }
 out+='<text x="410" y="27" text-anchor="middle" fill="#75cbff" font-size="13">第二产业 100%</text><text x="90" y="371" text-anchor="start" fill="#74dcc2" font-size="13">第一产业 100%</text><text x="716" y="371" text-anchor="end" fill="#efbc80" font-size="13">第三产业 100%</text>';
 R.REGIONS.forEach(r=>{
  const {x,y}=xy(r),special=r.id==='boluo',active=r.id===selected;
  const color=special?'#66dafa':active?'#efbc80':'#839fce';
  out+='<g data-v4-region="'+r.id+'" role="button" tabindex="0" class="research-node">'+
    '<circle cx="'+x+'" cy="'+y+'" r="'+(special?14:active?12:9)+'" fill="'+color+'" fill-opacity="'+(special?'.85':'.67')+'" stroke="#e6f8ff" stroke-width="'+(special?2.7:1.1)+'"/>'+
    '<text x="'+(x+(special?-14:12))+'" y="'+(y-(special?15:12))+'" text-anchor="'+(special?'end':'start')+'" fill="'+color+'" font-size="'+(special?15:12)+'" font-weight="'+(special?750:500)+'">'+esc(r.name)+'</text>'+
    '<title>'+r.name+'：第一产业'+fmt(R.percent(r)[0])+'%，第二产业'+fmt(R.percent(r)[1])+'%，第三产业'+fmt(R.percent(r)[2])+'%</title></g>';
 });
 out+='</svg>';return out;
}
function compareBars(peerId='huiyang'){
 const comp=R.compare(peerId);
 return '<div class="v4-compare-bars">'+R.dim.map((x,i)=>{
  const b=comp.shares[i]*100,p=comp.peerShares[i]*100,d=b-p;
  return '<div class="v4-compare-metric"><div class="row"><strong>'+x+'</strong><b class="'+(d>0?'cyan':'gold')+'">'+(d>=0?'+':'')+fmt(d)+' pp</b></div>'+
   '<div class="v4-compare-bar"><span class="v4-boluo" style="width:'+b+'%"></span></div>'+
   '<div class="v4-compare-bar"><span class="v4-peer" style="width:'+p+'%"></span></div>'+
   '<div class="row micro"><span>博罗 '+fmt(b)+'%</span><span>'+comp.peer.name+' '+fmt(p)+'%</span></div></div>';
 }).join('')+'</div>';
}
function lq(comp){
 return '<div class="v4-lq">'+R.dim.map((x,i)=>{
  const t=comp.lq[i];
  return '<div><span>'+x+'</span><div class="v4-lq-track"><i style="width:'+Math.min(100,t/2*100)+'%"></i><em></em></div><b>'+fmt(t,2)+'</b></div>';
 }).join('')+'</div><p class="micro">相对专业化LQ=博罗三产份额÷其他四县区的合计产业份额。1是四地结构基准，超过1不等于效率更高。</p>';
}
function flow(model){
 const local=model.localPay,external=model.external,va=model.added,inputs=model.intermediate;
 const y0=45,h=185,ratio=v=>v/100*h;
 const rect=(x,y,w,h,c,labelTxt,value)=>'<g><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+Math.max(2,h)+'" rx="4" fill="'+c+'" opacity=".83"/>'+
 '<title>'+labelTxt+' '+fmt(value)+'个单位</title></g>';
 const localY=y0,externalY=y0+ratio(local)+8;
 const flow1=rect(190,localY,122,ratio(local),'#69d9cc','本地服务采购',local);
 const flow2=rect(190,externalY,122,ratio(external),'#7896ac','跨区服务采购',external);
 const flow3=rect(468,localY,126,ratio(va),'#6ec5fc','本地增加值',va);
 const flow4=rect(468,localY+ratio(va)+4,126,ratio(inputs),'#e6bd79','本地采购中间投入',inputs);
 return '<svg viewBox="0 0 780 340" class="linechart" role="img" aria-label="假设每100单位制造业专业服务采购的本地与跨区流向及增加值核算示意">'+
 '<path d="M132 135 L190 135" stroke="#72b6e4" stroke-width="34" opacity=".7"/>'+
 rect(26,67,110,136,'#315e8b','假设服务采购',100)+
 '<text x="81" y="121" fill="#fff" text-anchor="middle" font-size="15" font-weight="700">假设采购</text><text x="81" y="153" fill="#fff" text-anchor="middle" font-size="29" font-weight="800">100</text>'+
 flow1+flow2+flow3+flow4+
 '<path d="M312 '+(localY+ratio(local)/2)+' C375 '+(localY+ratio(local)/2)+' 402 '+(localY+ratio(local)/2)+' 468 '+(localY+ratio(local)/2)+'" stroke="#69bfda" opacity=".35" stroke-width="'+Math.max(2,ratio(local))+'" fill="none"/>'+
 '<text x="250" y="29" fill="#78dbcf" text-anchor="middle" font-size="14">本地采购 '+fmt(local)+'</text>'+
 '<text x="250" y="'+(Math.min(316,externalY+ratio(external)/2+4))+'" fill="#b6c6d7" text-anchor="middle" font-size="12">流向外地 '+fmt(external)+'</text>'+
 '<text x="530" y="29" fill="#7bcafb" text-anchor="middle" font-size="14">本地增加值 '+fmt(va)+'</text>'+
 '<text x="530" y="'+(Math.min(302,localY+ratio(va)+ratio(inputs)/2+13))+'" fill="#f1c784" text-anchor="middle" font-size="11">本地中间投入 '+fmt(inputs)+'</text>'+
 '<text x="19" y="291" fill="#a9c3d8" font-size="11">所有数量为规范化的模型假设单位，不是亿元，亦非实际采购数据</text></svg>';
}
function retentionHeat(model){
 let out='<svg class="linechart" viewBox="0 0 770 388" role="img" aria-label="不同假设本地采购比例和供应商增加值率下，每100假设采购单位产生的本地增加值11×11热力图">';
 const xs=118,ys=26,cw=48,ch=29,steps=[0,10,20,30,40,50,60,70,80,90,100];
 steps.forEach((x,j)=>out+='<text x="'+(xs+j*cw+cw/2)+'" y="16" text-anchor="middle" fill="#a8c7dc" font-size="11">'+x+'</text>');
 steps.forEach((x,i)=>{out+='<text x="103" y="'+(ys+i*ch+20)+'" text-anchor="end" fill="#a8c7dc" font-size="11">'+x+'%</text>';
  steps.forEach((local,j)=>{
   const v=local*x/100,active=Math.abs(model.local-local)<=5&&Math.abs(model.va-x)<=5,xx=xs+j*cw,yy=ys+i*ch;
   const t=v/100,fill='rgb('+Math.round(25+t*50)+','+Math.round(60+t*140)+','+Math.round(94+t*135)+')';
   out+='<g data-v4-heat="'+local+','+x+'" tabindex="0" role="button" class="research-node"><rect x="'+(xx+1)+'" y="'+(yy+1)+'" width="'+(cw-3)+'" height="'+(ch-2)+'" fill="'+fill+'" stroke="'+(active?'#fff':'#27415e')+'" stroke-width="'+(active?'2':'1')+'" rx="4"/>'+
    '<text x="'+(xx+cw/2)+'" y="'+(yy+20)+'" text-anchor="middle" fill="white" font-size="10">'+fmt(v,0)+'</text>'+
    '<title>本地采购'+local+'%，本地供应商增加值率'+x+'%，本地增加值'+fmt(v)+'单位</title></g>';
  });
 });
 return out+'<text x="392" y="371" text-anchor="middle" fill="#9db3c9" font-size="11">横轴：假设本地采购比例（%）｜纵轴：假设供应商增加值率（%）</text></svg>';
}
const API={industryHistory,industryHeatmap,sizeHistory,ternary,compareBars,lq,flow,retentionHeat};
root.BoluoV4Viz=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
