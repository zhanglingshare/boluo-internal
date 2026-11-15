/* Interactive, offline-capable research lab. No imports, exports, remote APIs, or accounts. */
(function(){
'use strict';
const E=window.BoluoEngine;
if(!E){document.getElementById('stage').textContent='计算模块加载失败，请刷新页面。';return;}
const KEY='boluo-internal-lab-v1',ARCHIVE='boluo-internal-snapshots-v1';
const DEFAULT={year:2030,target:1600,scenario:'balanced',seed:20321111,draws:2500,knobs:{}};
function safeRead(k,fallback){try{return JSON.parse(localStorage.getItem(k))||fallback;}catch(e){return fallback;}}
function safeWrite(k,val){try{localStorage.setItem(k,JSON.stringify(val));return true;}catch(e){return false;}}
let state=E.normalize(safeRead(KEY,DEFAULT));
let records=safeRead(ARCHIVE,[]);if(!Array.isArray(records))records=[];
let page='home',view=0,sampleSize=300,recv=75,pay=12,daily=10,activeService='',compareId=null;
let current=null;
const stage=document.getElementById('stage'),overlay=document.getElementById('calibrationOverlay');
const money=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1,minimumFractionDigits:0});
const decimal=(n,d=1)=>Number(n).toFixed(d);
const perc=(n,d=1)=>decimal(n*100,d)+'%';
const sign=n=>(n>0?'+':'')+decimal(n);
const html=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,text,cls)=>'<button type="button" class="'+(cls||'secondary')+'" data-action="'+action+'">'+text+'</button>';
function badge(text,type){return '<span class="tag '+(type||'')+'">'+text+'</span>';}
function heading(eyebrow,title,subtitle,action){
 return '<header class="pagehead"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+(action||'')+'</header>';
}
function stat(label,num,desc,kind){
 return '<div class="tile"><small>'+label+'</small><div class="big-num '+(kind||'')+'">'+num+'</div><p>'+desc+'</p></div>';
}
function line(label,value,klass){
 return '<div class="metric-line"><span>'+label+'</span><b class="'+(klass||'')+'">'+value+'</b></div>';
}
function stack(vals){
 const sum=vals.reduce((a,b)=>a+b,0);
 return '<div class="stack" aria-label="一二三产业结构"><span class="p" style="width:'+(100*vals[0]/sum)+'%"></span><span class="s" style="width:'+(100*vals[1]/sum)+'%"></span><span class="t" style="width:'+(100*vals[2]/sum)+'%"></span></div>';
}
function chart(r){
 const h=r.history,W=850,H=255,l=58,right=15,top=15,base=218;
 const ymin=Math.min(E.DATA.gdp*.93,...h.map(x=>x.p10))*.93;
 const ymax=Math.max(state.target*1.04,...h.map(x=>x.p90))*1.045;
 const x=i=>l+i*(W-l-right)/(h.length-1),y=n=>base-(n-ymin)/(ymax-ymin)*(base-top);
 const points=(col)=>h.map((v,i)=>decimal(x(i),1)+','+decimal(y(v[col]),1)).join(' ');
 const band=h.map((v,i)=>decimal(x(i),1)+','+decimal(y(v.p90),1)).concat(h.slice().reverse().map((v,i)=>decimal(x(h.length-1-i),1)+','+decimal(y(v.p10),1))).join(' ');
 let ticks='';
 for(let j=0;j<4;j++){const val=ymin+(ymax-ymin)*j/3,yy=y(val);ticks+='<line x1="'+l+'" y1="'+yy+'" x2="'+(W-right)+'" y2="'+yy+'" stroke="#385372" opacity=".3" stroke-dasharray="4 5"/><text x="0" y="'+(yy+4)+'" class="svg-label">'+Math.round(val)+' 亿</text>';}
 let years=h.map((v,i)=>'<text x="'+x(i)+'" y="244" text-anchor="middle" class="svg-year">'+v.year+'</text>').join('');
 return '<svg class="linechart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="2025年到'+state.year+'年的情景分位带、P50曲线与目标线">'+ticks+
 '<polygon points="'+band+'" fill="#398fe1" opacity=".16"/>'+
 '<polyline points="'+points('total')+'" fill="none" stroke="#5bd2ff" stroke-width="3.5" stroke-linejoin="round"/>'+
 '<line x1="'+l+'" x2="'+(W-right)+'" y1="'+y(state.target)+'" y2="'+y(state.target)+'" stroke="#f6b96e" stroke-width="2" stroke-dasharray="8 7"/>'+
 '<text x="'+(W-right-5)+'" y="'+(y(state.target)-9)+'" text-anchor="end" fill="#ffc17a" font-size="12">'+state.target+' 对照线</text>'+
 '<circle cx="'+x(h.length-1)+'" cy="'+y(h[h.length-1].total)+'" r="5" fill="#77ebff" stroke="#11324c" stroke-width="2"/>'+
 years+'</svg>';
}
function hist(r){
 const max=Math.max(...r.histogram.counts,1);
 return '<div class="water" role="img" aria-label="情景总量分布，22个分箱">'+r.histogram.counts.map((v,i)=>'<span title="'+Math.round(r.histogram.min+(r.histogram.max-r.histogram.min)*(i+.5)/22)+'亿元附近，'+v+'条轨迹" style="height:'+(Math.max(2,v/max*100))+'%"></span>').join('')+'</div>';
}
function barchart(data,suffix,limit){
 const max=limit||Math.max(...data.map(x=>Math.abs(x.value)),1);
 return data.map(x=>'<div class="bar-line"><span>'+x.name+'</span><div class="barbg"><i style="width:'+Math.max(1,Math.abs(x.value)/max*100)+'%"></i></div><strong>'+money(x.value)+(suffix||'')+'</strong></div>').join('');
}
function layoutControls(){
 const meta='<p class="footnote">条件发生变化后将执行全新的固定种子抽样。所有数值均为情景参数，不代表实际政策效应。</p>';
 return '<div class="row wrap"><div class="pill-select">'+Object.keys(E.PRESETS).map(k=>'<button type="button" class="'+(state.scenario===k?'selected':'')+'" data-preset="'+k+'">'+E.PRESETS[k].name+'</button>').join('')+'</div>'+btn('calibration','⚙ 全部校准条件','tiny-btn')+'</div>'+meta;
}
function insight(r){
 let msg='';
 if(r.gap>0)msg='在当前假设下，2030目标仍有缺口。先识别哪条链能够接续，再谈口号。';
 else msg='当前中位数越过对照线，但并不等于现实目标已经有把握实现。';
 if(state.year===2032)msg='2032和1500亿元属于内部自设对照，不能称为官方十五五目标。'+msg;
 return msg;
}
function home(r){
 const d=E.DATA,rate=((state.target/d.gdp)**(1/(state.year-2025))-1)*100;
 return heading('00 / THE BIG QUESTION','投资在降，工业在涨。<br>下一棒，谁来接？',
 '从公开的2025年基准出发，用可改变的条件测试产业接力。不是“预测博罗”，而是逼出最值得追问的结构问题。',
 btn('go-wind','进入可运行风洞 ↗','primary'))+
 '<section class="hero"><div class="hero-panel"><div class="eyebrow">THE STRUCTURAL CONTRADICTION</div><h2><span class="bad">-18.8%</span> <strong>+8.7%</strong></h2><p>2025年固定资产投资下降、规上工业增加值却增长。两者口径不同，也不能直接推断因果关系。这是值得进一步检查的信号。</p>'+badge('A/B｜公开统计','real')+' '+badge('不等于结构性断裂已获证实','model')+'</div><div class="hero-panel"><div class="eyebrow">'+state.year+' / CONDITIONAL TEST</div><h2>'+money(r.total.p50)+' <strong>亿</strong></h2><p>当前情景中位数，P10–P90：'+money(r.total.p10)+'–'+money(r.total.p90)+' 亿元。<br>对照 '+money(state.target)+' 亿，差距 <b class="'+(r.gap>0?'bad':'good')+'">'+sign(-r.gap)+' 亿元</b>。</p><div class="actions">'+btn('go-wind','改变假设 ↗','primary')+btn('save','保存此刻研究','secondary')+'</div></div></section>'+
 '<section class="stats">'+stat('2025 GDP / 公开统计',money(d.gdp)+' 亿','一产 '+d.p+' · 二产 '+d.s+' · 三产 '+d.t,'cyan')+
 stat(state.year+'目标差额',money(state.target-d.gdp)+' 亿','对照目标减去2025基数','gold')+
 stat('所需五年复合增幅',decimal(rate)+'%','名义口径的算术门槛，非官方增速','')+
 stat('当前条件达标比例',perc(r.hit),'只代表模型条件内的样本占比','')+'</section>'+
 '<section class="grid2"><article class="card"><h3>一张结构图：博罗的发动机在哪里？</h3><p class="micro">2025年已公布的三次产业增加值份额</p>'+stack([d.p,d.s,d.t])+
 '<div class="chartkey"><span><b style="background:var(--p)"></b>第一产业 10.7%</span><span><b style="background:var(--s)"></b>第二产业 54.6%</span><span><b style="background:var(--t)"></b>第三产业 34.7%</span></div>'+
 '<div class="line-sep"></div><h3>结构变化能传到谁？</h3><p class="small muted">产业协同不是GDP单点提速，而是制造、专业服务、农业加工和人力条件能否互相承接。</p>'+btn('go-models','拆开产业网络 ↗','secondary')+'</article>'+
 '<article class="card"><h3>从问题发现到行动检验</h3><div class="logic"><div><b>01</b><span>提出问题</span></div><div><b>02</b><span>核对证据</span></div><div><b>03</b><span>跑结构</span></div><div><b>04</b><span>改条件</span></div><div><b>05</b><span>盯断点</span></div></div><div class="dangerbox gap">'+insight(r)+'</div><p class="footnote">注意：2030年1600亿元是公开报道中的努力目标。模型年增长率属于名义增长假设，不能与政府公布的不变价GDP增长率直接比较。</p></article></section>';
}
function mission(r){
 const h=(state.target/E.DATA.gdp)**(1/(state.year-2025))-1;
 return heading('01 / QUESTION & FALSIFICATION','这次，我们究竟要证伪什么？',
 '先区分目标、证据、机制和未知量。每个研究假说都应能被现实数据推翻，而不是让模型永远给出漂亮答案。',
 btn('go-data','下一站：看证据 ↗','primary'))+
 '<div class="grid2"><article class="card"><h3>问题 A · 产业接力能否跨越目标门槛？</h3>'+line('2025公开基准',money(E.DATA.gdp)+' 亿元','')+
 line(state.year+'对照目标',money(state.target)+' 亿元','gold')+
 line('所需年均名义增幅',perc(h),'cyan')+
 line('当前模拟中位数',money(r.total.p50)+' 亿元','')+
 line('当前条件目标达标样本占比',perc(r.hit),'')+
 '<div class="dangerbox gap">可证伪条件：当公开统计的新一轮数据、项目兑现率或工业扩能数据超出假设区间，原情景失效，需要改参数重跑。</div></article>'+
 '<article class="card"><h3>问题 B · 哪一个增长叙事最容易失真？</h3>'+
 '<div class="hypothesis"><span class="tag warn">待证</span><div><b>投资下降 = 工业必然衰退？</b><p>2025年相反方向已经出现。需要分解存量产能、项目投产时差与价格因素。</p></div></div>'+
 '<div class="hypothesis"><span class="tag model">待证</span><div><b>工业快增长 = 本地专业服务自然增长？</b><p>需要核对交易关系、服务外溢与本地承接；此处关系网络仍是合成样本。</p></div></div>'+
 '<div class="hypothesis"><span class="tag model">待证</span><div><b>农业提质 = 自动突破现金流断点？</b><p>农产品销售、加工与回款可能不同步，需逐环查证。</p></div></div></article></div>'+
 '<div class="card gap"><h3>研究约束 · 四道门</h3><div class="grid2">'+
 '<div class="notice">① 事实：2025年宏观统计。与模型设定分开。</div>'+
 '<div class="notice">② 机制：关系图、调查和参数系数均先用合成样本探索。</div>'+
 '<div class="notice">③ 推演：目标达标比例是条件模拟频率，不是现实成功概率。</div>'+
 '<div class="notice">④ 复核：不同随机种子、不同冲击幅度都要重跑；结论不稳健就标记。</div></div></div>';
}
function dataPage(r){
 const d=E.DATA;
 return heading('02 / EVIDENCE DESK','事实先钉牢，未知才好推演。',
 '数据划成 A/B/C 层，宏观基数不与合成企业关系混称。导入与导出本阶段不做，使用仓库既有公开信息和可复现合成样本。',
 btn('go-survey','继续：看模拟调查 ↗','primary'))+
 '<section class="stats">'+stat('2025 GDP',money(d.gdp)+' 亿','公开地区生产总值','cyan')+
 stat('2025规上工业增加值增幅','+8.7%','增幅，不是产业增加值占GDP的比例','good')+
 stat('2025固定资产投资','-18.8%','与工业增长方向相反','bad')+
 stat('2025房地产开发投资','-47.6%','仅为投资分项的增速','bad')+'</section>'+
 '<div class="grid2"><article class="card"><h3>三次产业：已核对的宏观基数</h3>'+barchart([{name:'第一产业',value:d.p},{name:'第二产业',value:d.s},{name:'第三产业',value:d.t}],' 亿',d.s)+
 '<p class="footnote">三者相加 = '+decimal(d.p+d.s+d.t,2)+' 亿元。现价GDP总量可用作模型起点；公布的同比实际增长率与名义增长假设不可混用。</p></article>'+
 '<article class="card"><h3>反常识信号：不能互相代替的指标</h3>'+line('规上工业增加值增长','+8.7%','good')+
 line('电子信息制造增加值增长','+23.0%','good')+
 line('固定资产投资增长','-18.8%','bad')+
 line('社会消费品零售总额',money(d.retail)+' 亿','')+
 line('2025年游客接待',money(d.tourism)+' 万人次','')+
 '<p class="footnote">工业增加值增速、固定资产投资增速、社零总额、游客人次互不构成可直接加总的GDP贡献。</p></article></div>'+
 '<div class="grid2 gap"><article class="card"><h3>真实与合成的边界</h3>'+
 line('A/B · 2025宏观事实','GDP、三产构成、投资、工业','good')+
 line('B · 2030努力目标','1600亿元，公开访谈','gold')+
 line('C · 条件增长率','模型设定，未标定','gold')+
 line('C · 企业网络','500主体 / 680关系，合成','gold')+
 line('C · 问卷路径','300企业样本，合成','gold')+
 line('C · 茶季现金流','参数演示，非实地采集','gold')+'</article>'+
 '<article class="card"><h3>直接查看来源</h3>'+d.sources.map(s=>'<div class="source-item"><a href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+html(s.name)+' ↗</a>'+badge(html(s.tag),s.tag.startsWith('A')?'real':'')+'</div>').join('')+
 '<p class="footnote">有数字未验证、年份或口径变更时，应优先改事实基准，而不是用调整模型来掩盖冲突。</p></article></div>';
}
function surveyPage(r){
 const m=E.survey({...state,sampleSize});
 const path=(n)=>'<div class="metric-line"><span>'+n+'</span><b class="cyan">'+decimal(m.paths[n],3)+' <small class="muted">['+decimal(m.intervals[n][0],2)+', '+decimal(m.intervals[n][1],2)+']</small></b></div>';
 return heading('03 / SYNTHETIC FIELD SURVEY','真正算一次路径，而不是画几根箭头。',
 '固定随机种子合成问卷，改变样本规模并重新估计。演示的是“有调查数据后可以怎样检验机制”，不是博罗企业实测结论。',
 btn('go-models','下一站：多模型 ↗','primary'))+
 '<section class="stats">'+stat('合成企业问卷',m.n+' 份','可调样本数 · C级','cyan')+
 stat('重抽样','120 次','Bootstrap 百分位区间','')+
 stat('服务使用解释度',perc(m.r2.SU),'合成样本内 R²','')+
 stat('经营表现解释度',perc(m.r2.OP),'合成样本内 R²','')+'</section>'+
 '<div class="grid2"><article class="card"><h3>调查模型 · 双链关系</h3><div class="logic" style="grid-template-columns:repeat(3,1fr)"><div><b>SA</b><span>服务可得</span></div><div><b>SU</b><span>服务使用</span></div><div><b>OP</b><span>经营表现</span></div></div>'+
 '<div class="line-sep"></div>'+path('SA→SU')+path('SA→OP')+path('SU→OP')+
 '<p class="footnote">系数来自构念均分的标准化回归，括号内是合成样本Bootstrap 95%区间。不是SmartPLS执行结果，不能据此判断政策因果或换算GDP。</p></article>'+
 '<article class="card"><h3>你可以改变研究样本</h3><div class="sliderrow"><label>模拟受访企业数量 <output data-live="sampleSize">'+sampleSize+' 份</output></label><input type="range" data-set="sampleSize" min="100" max="500" step="25" value="'+sampleSize+'"></div>'+
 '<div class="notice">刷新或调整样本后，全部问卷数据会按同一生成机制和固定种子重新生成，再重新估计系数与区间。</div>'+
 '<h3 class="gap">量表内部一致性（合成样本）</h3>'+
 line('SA · 4个题项',decimal(m.alpha.SA,3),'')+
 line('SU · 3个题项',decimal(m.alpha.SU,3),'')+
 line('OP · 3个题项',decimal(m.alpha.OP,3),'')+
 '<div class="actions">'+btn('resample','换一个随机种子，再研究','secondary')+'</div></article></div>';
}
function networkSvg(net){
 const w=660,h=330;
 const colors=['#56b8ff','#72e6de','#e8b978','#8b9ffc','#ff8e9f'];
 const labels=['电子/装备','专业服务','农业/加工'];
 const centers=[[95,165],[333,165],[562,165]];
 let output='<svg class="network-svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="合成产业链节点与专业服务网络">';
 const arcs=[[0,1],[2,0],[2,1]];
 arcs.forEach((ln,i)=>{const a=centers[ln[0]],b=centers[ln[1]];output+='<path d="M'+a[0]+' '+a[1]+' Q330 '+(i===0?42:i===1?275:350)+' '+b[0]+' '+b[1]+'" fill="none" stroke="'+colors[i]+'" stroke-width="'+(i===0?5:2)+'" stroke-opacity=".5" stroke-dasharray="'+(i===0?'0':'7 7')+'"/>';});
 centers.forEach((c,i)=>{output+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+(i===1?61:48)+'" fill="'+colors[i]+'" fill-opacity=".13" stroke="'+colors[i]+'" stroke-width="1.3"/><circle cx="'+c[0]+'" cy="'+c[1]+'" r="29" fill="'+colors[i]+'" fill-opacity=".20"/><text x="'+c[0]+'" y="'+(c[1]+5)+'" fill="#e8f7ff" text-anchor="middle" font-size="13" font-weight="700">'+labels[i]+'</text>';});
 for(let j=0;j<12;j++){const ang=(j/12)*Math.PI*2,xx=centers[1][0]+Math.cos(ang)*104,yy=centers[1][1]+Math.sin(ang)*108;output+='<line x1="'+centers[1][0]+'" y1="'+centers[1][1]+'" x2="'+xx+'" y2="'+yy+'" stroke="#58b2ef" opacity=".22"/><circle cx="'+xx+'" cy="'+yy+'" r="'+(j%3+4)+'" fill="'+colors[j%5]+'" opacity=".85"/>';}
 return output+'</svg>';
}
function modelsPage(r){
 const net=E.network(state),m=E.survey({...state,sampleSize});
 const tornado=E.sensitivity({...state,draws:850});
 return heading('04 / STRUCTURAL RESEARCH','不同的算法，回答不同的问题。',
 '产业连通、问卷机制和宏观情景并列运行。不能把三者的输出简单加权成“博罗成功概率”。',
 btn('go-wind','进入第05工作区 ↗','primary'))+
 '<section class="grid3"><div class="tile"><small>合成产业关系网络</small><strong class="big">'+net.nodes+' 节点</strong><p>'+net.edges+' 条合成关系，检验断点与承接</p></div>'+
 '<div class="tile"><small>合成问卷关系检验</small><strong class="big">'+m.n+' 份</strong><p>3条路径 + 120次重抽样</p></div>'+
 '<div class="tile"><small>宏观条件推演</small><strong class="big">'+r.samples+' 条</strong><p>'+state.year+'年分布与敏感性实际计算</p></div></section>'+
 '<section class="grid2 gap"><article class="card"><h3>产业关系网络 · 真正遍历合成边</h3>'+networkSvg(net)+
 '<div class="three-gauge"><div><small class="muted">服务采购边</small><b>'+net.serviceEdges+'</b></div><div><small class="muted">农业供货边</small><b>'+net.agriEdges+'</b></div><div><small class="muted">前10节点断开</small><b class="bad">'+net.lostEdges+' 边</b></div></div>'+
 '<div class="line-sep"></div><h3>模拟专业服务需求构成</h3>'+barchart(net.services.map(x=>({name:x.name,value:x.amount})),' 百万元')+
 '<p class="footnote">'+net.note+'。交易额不能直接折算增加值。</p></article>'+
 '<article class="card"><h3>断点实验 · 哪里更脆弱？</h3>'+
 '<div class="tile" style="padding:17px;background:rgba(255,255,255,.02)"><small>如果合成网络中交易额最高的10个服务主体突然退出</small><div class="big-num bad">'+money(net.lostDemand)+' <span style="font-size:15px">百万元</span></div><p>关联交易额失联，不是经济损失估计，亦非真实企业。</p></div>'+
 '<h3 class="gap">当前条件与服务承接能力</h3>'+line('服务承接能力指数',decimal(net.capacity,2),'cyan')+
 line('资源不足的演示风险指数',decimal(net.risk)+' / 100','gold')+
 '<div class="dangerbox gap">红队问题：工业增长，如果本地研发、检测、软件和物流供给跟不上，产业增加值可能继续增长，但本地收益与就业传导未必同步。</div>'+
 '<h3 class="gap">跨模型一致性闸门</h3>'+
 line('网络：哪里存在断点？','合成图上可检验','good')+
 line('问卷：服务可得与经营表现相关吗？','合成路径可检验','good')+
 line('产业：目标附近的样本有多少？',perc(r.hit),'')+
 '<p class="footnote">以上三个回答的统计单位和估计对象不同。路径系数不可直接转为GDP贡献。真实关系需要调查校准。</p></article></section>'+
 '<article class="card gap"><h3>五个条件的单变量扰动敏感性</h3>'+sensitivityBars(tornado)+
 '<p class="footnote">每次单独把一个标准化参数上下移动0.5，使用同一随机种子、850条轨迹分别重新计算。排序是模型中的局部敏感度，不是现实因果重要性。</p></article>';
}
function sensitivityBars(s){
 const top=Math.max(...s.map(x=>Math.max(Math.abs(x.plus),Math.abs(x.minus))),1);
 return '<div class="tornado">'+s.map(x=>'<div class="torn-row"><span class="micro">'+x.name+'</span><div class="track"><div class="minus" style="width:'+(Math.max(0,-Math.min(x.minus,x.plus))/top*47)+'%"></div><div class="plus" style="width:'+(Math.max(0,Math.max(x.minus,x.plus))/top*47)+'%"></div></div><b>'+decimal(x.span)+' 亿</b></div>').join('')+'</div>';
}
