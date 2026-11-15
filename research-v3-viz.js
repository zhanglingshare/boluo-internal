/* V3 data-graphics: charts depict directly measured observations or marked model assumptions. */
(function(root){
'use strict';
const D=root.BoluoV3;if(!D)return;
const f=(x,d=1)=>Number(x).toFixed(d),p=(x)=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1});
const esc=s=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
function scatter(selected=0){
 const X=770,Y=345,l=122,r=52,t=37,b=290,x=share=>l+share/27*(X-l-r),y=g=>b-(g+9)/39*(b-t);
 let ticks='';for(const s of [0,5,10,15,20,25])ticks+='<line x1="'+x(s)+'" x2="'+x(s)+'" y1="'+t+'" y2="'+b+'" stroke="#34516f" opacity=".34"/><text x="'+x(s)+'" y="313" text-anchor="middle" fill="#a7bfd2" font-size="11">'+s+'%</text>';
 for(const g of [-5,0,10,20,30])ticks+='<line x1="'+l+'" x2="'+(X-r)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="#34516f" opacity=".32"/><text x="111" y="'+(y(g)+4)+'" text-anchor="end" fill="#a7bfd2" font-size="11">'+g+'%</text>';
 let circles='';
 D.INDUSTRIES.forEach(row=>{
  const cx=x(row.share),cy=y(row.growth),active=row.id===selected,rad=14+Math.sqrt(row.share)*3;
  circles+='<g data-v3-industry="'+row.id+'" class="research-node" tabindex="0" role="button" aria-label="'+esc(row.name)+'占比'+row.share+'%、增速'+row.growth+'%">'+
   '<circle cx="'+cx+'" cy="'+cy+'" r="'+rad+'" fill="'+(row.growth>=0?'#4a9ee7':'#e98d82')+'" fill-opacity="'+(active?'.75':'.40')+'" stroke="'+(active?'#ffffff':'#8bc0e7')+'" stroke-width="'+(active?'3':'1.5')+'"/>'+
   '<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">'+esc(row.name.slice(0,4))+'</text>'+
   '<title>'+esc(row.name)+'：2025规上工业增加值占比 '+row.share+'%，增速 '+row.growth+'%</title></g>';
 });
 return '<svg class="linechart" viewBox="0 0 770 345" role="img" aria-label="2025博罗五类已披露规上工业子行业的增加值占比和增长率。点选气泡查看">'+ticks+
 '<line x1="'+l+'" x2="'+(X-r)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="#ffc879" stroke-width="1.4" stroke-dasharray="6 5"/>'+
 circles+'<text x="450" y="337" text-anchor="middle" fill="#a7bed2" font-size="12">占规上工业增加值比重 →</text>'+
 '<text x="28" y="160" transform="rotate(-90 28 160)" text-anchor="middle" fill="#a7bed2" font-size="12">2025同比增长率 →</text></svg>';
}
function products(){
 const max=25;
 return '<div class="v3-differential">'+D.PRODUCTS.map(row=>{
  const neg=row.growth<0,w=Math.min(49,Math.abs(row.growth)/max*49);
  return '<div class="v3-divergent"><span>'+esc(row.name)+'</span><div class="v3-div-track"><em class="v3-axis"></em><i class="'+(neg?'negative':'positive')+'" style="width:'+w+'%"></i></div>'+
   '<strong class="'+(neg?'bad':'good')+'">'+(row.growth>0?'+':'')+f(row.growth,1)+'%</strong></div>';
 }).join('')+'</div><p class="footnote">实物产量单位不同，图上只比较各自同比变化率，不能相互加总；部分产品受分类、需求与产能调整影响。</p>';
}
function industrialSizes(){
 return '<div class="v3-size-comparison">'+D.SIZES.map(row=>'<div class="v3-size-row"><span>'+esc(row.name)+'</span>'+
 '<div class="v3-size-track"><i style="width:'+row.share+'%;background:linear-gradient(90deg,#4d82c9,#64bfdf)"></i></div><b>'+f(row.share)+'%</b>'+
 '<strong class="good">+'+f(row.growth)+'%</strong></div>').join('')+'</div><p class="footnote">占比是2025规上工业增加值规模结构；增长率是2025可比价同比，二者不能直接相乘当作官方增长贡献。</p>';
}
function plan(){
 const min=-53,max=15,x=v=>(v-min)/(max-min)*100;
 return '<div class="v3-plan">'+D.TARGETS.map(row=>'<div class="v3-plan-row"><div class="v3-plan-head"><b>'+esc(row.name)+'</b><span class="'+(row.gap<0?'bad':'good')+'">'+(row.gap>0?'+':'')+f(row.gap)+' pp</span></div>'+
 '<div class="v3-plan-track"><i class="v3-zero" style="left:'+x(0)+'%"></i><i class="v3-plan-target" style="left:'+x(row.goal)+'%"></i>'+
 '<i class="v3-plan-actual" style="left:'+x(row.actual)+'%"></i></div>'+
 '<div class="v3-plan-label"><span>'+esc(row.plan)+'</span><span>2025实绩 '+(row.actual>0?'+':'')+f(row.actual)+'%</span></div></div>').join('')+
 '<div class="chartkey"><span><b style="background:#f1c176"></b>计划增速</span><span><b style="background:#69c8ea"></b>公报实绩</span></div>'+
 '<p class="footnote">差额单位：百分点；计划指标有“以上”含义。预算收入增长存在“可比口径”条件，跨年度计划与实绩需再次复核。</p></div>';
}
function signals(domain='全部'){
 const rows=D.select(domain),max=50;
 return '<div class="v3-signal-grid">'+rows.map(row=>{
  const val=row.value,zero=50,width=Math.min(50,Math.abs(val)/max*49);
  return '<div class="v3-signal-row"><span>'+esc(row.name)+'</span><div class="v3-signal-track"><em></em>'+
  '<i class="'+(val<0?'negative':'positive')+'" style="width:'+width+'%"></i></div>'+
  '<b class="'+(val<0?'bad':'good')+'">'+(val>0?'+':'')+f(val)+'%</b><small>'+esc(row.basis)+'</small></div>';
 }).join('')+'</div>';
}
function morris(m){
 const max=Math.max(...m.stats.map(x=>x.muStar),1),sd=Math.max(...m.stats.map(x=>x.sigma),1),W=710,H=280;
 let ticks='';for(let i=0;i<=4;i++){const xx=60+i*145; ticks+='<line x1="'+xx+'" y1="20" x2="'+xx+'" y2="236" stroke="#344f6c" opacity=".4"/><text x="'+xx+'" y="258" text-anchor="middle" fill="#a2b4ca" font-size="10">'+f(max*i/4,0)+'</text>';}
 let dots='';
 m.stats.forEach((item,i)=>{
 const x=60+item.muStar/max*580,y=236-item.sigma/sd*205;
 dots+='<circle cx="'+x+'" cy="'+y+'" r="'+(10+(4-i)*2)+'" fill="'+['#62dfdf','#6bafff','#e5bb78','#a9a1f6','#f18e95'][i]+'" opacity=".86"><title>'+esc(item.label)+'，μ* '+f(item.muStar)+'，σ '+f(item.sigma)+'</title></circle>'+
 '<text x="'+Math.max(25,Math.min(W-20,x))+'" y="'+(y-21)+'" fill="#e6f5fc" text-anchor="middle" font-size="11">'+esc(item.label)+'</text>';
 });
 return '<svg class="linechart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Morris型假设参数全局筛查：横轴平均绝对元素效应，纵轴元素效应离散程度">'+ticks+dots+
 '<text x="340" y="277" text-anchor="middle" fill="#a1b7d0" font-size="11">平均绝对元素效应 μ*（亿元 / 参数单位）</text>'+
 '<text x="15" y="118" transform="rotate(-90,15,118)" text-anchor="middle" fill="#a1b7d0" font-size="11">σ</text></svg>'+
 '<div class="v3-rank">'+m.stats.map((v,i)=>'<div><span>'+('0'+(i+1))+' '+esc(v.label)+'</span><b>μ* '+f(v.muStar)+'</b><small>σ '+f(v.sigma)+'</small></div>').join('')+'</div>';
}
function cascade(d){
 const v=d;
 return '<svg class="linechart" viewBox="0 0 820 227" role="img" aria-label="合成网络失效传播，从服务节点移除到制造主体及农业供应主体"><defs><marker id="v3arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="#74b6e4"/></marker></defs>'+
 '<path d="M230 105 C265 105 292 105 325 105" stroke="#6ec8ee" stroke-width="3" fill="none" marker-end="url(#v3arrow)"/>'+
 '<path d="M490 105 C530 105 554 105 585 105" stroke="#e3be7c" stroke-width="3" fill="none" marker-end="url(#v3arrow)"/>'+
 [['服务节点移除',v.cut,25,'#3675ba'],['制造主体受影响',v.manufacturersImpaired,324,'#2b777b'],['农业供应关联',v.farmsTouched,584,'#886b4a']].map(a=>
 '<rect x="'+a[2]+'" y="60" width="196" height="98" rx="14" fill="'+a[3]+'" fill-opacity=".54" stroke="#5a90ae"/>'+
 '<text x="'+(a[2]+98)+'" y="92" fill="#bcd5ea" font-size="13" text-anchor="middle">'+a[0]+'</text>'+
 '<text x="'+(a[2]+98)+'" y="134" fill="#fff" font-weight="800" font-size="31" text-anchor="middle">'+a[1]+'</text>').join('')+
 '<text x="124" y="186" text-anchor="middle" fill="#a0b9d1" font-size="12">合成服务主体</text>'+
 '<text x="422" y="186" text-anchor="middle" fill="#a0b9d1" font-size="12">达到设定依赖阈值</text>'+
 '<text x="682" y="186" text-anchor="middle" fill="#a0b9d1" font-size="12">其供货关系被标记</text></svg>';
}
function uncertainty(e,mc,target){
 const vals=[e.lines[0].value,mc.total.p10,mc.total.p50,mc.total.p90,e.lines[2].value,target];
 const min=Math.min(...vals)*.95,max=Math.max(...vals)*1.05,pos=x=>8+84*(x-min)/(max-min);
 return '<div class="v3-uncertainty"><div class="v3-uncert-row"><span>随机扰动区间（P10–P90）</span><div class="v3-uncert-track">'+
 '<i class="v3-uncert-line" style="left:'+pos(mc.total.p10)+'%;width:'+(pos(mc.total.p90)-pos(mc.total.p10))+'%"></i>'+
 '<em class="v3-uncert-point" style="left:'+pos(mc.total.p50)+'%"></em><em class="v3-uncert-target" style="left:'+pos(target)+'%"></em></div>'+
 '<b>'+p(mc.total.p10)+'—'+p(mc.total.p90)+' 亿</b></div>'+
 '<div class="v3-uncert-row"><span>增长参数边界（±1.5pp）</span><div class="v3-uncert-track">'+
 '<i class="v3-uncert-range" style="left:'+pos(e.lines[0].value)+'%;width:'+(pos(e.lines[2].value)-pos(e.lines[0].value))+'%"></i>'+
 '<em class="v3-uncert-target" style="left:'+pos(target)+'%"></em></div>'+
 '<b>'+p(e.lines[0].value)+'—'+p(e.lines[2].value)+' 亿</b></div></div>'+
 '<div class="chartkey"><span><b style="background:#61c7ec"></b>随机冲击</span><span><b style="background:#edba75"></b>参数情景</span><span><b style="background:#f38c9b"></b>目标线</span></div>';
}
root.BoluoV3Viz={scatter,products,industrialSizes,plan,signals,morris,cascade,uncertainty};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BoluoV3Viz;
})(typeof window!=='undefined'?window:globalThis);
