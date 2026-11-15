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
 '<p class="footnote">系数来自探索性Mode-A PLS路径估计，括号内为合成样本Bootstrap 95%区间。此实现未经SmartPLS逐项等价验证，不能据此判断政策因果或换算GDP。</p></article>'+
 '<article class="card"><h3>你可以改变研究样本</h3><div class="sliderrow"><label>模拟受访企业数量 <output data-live="sampleSize">'+sampleSize+' 份</output></label><input type="range" data-set="sampleSize" min="100" max="500" step="25" value="'+sampleSize+'"></div>'+
 '<div class="notice">刷新或调整样本后，全部问卷数据会按同一生成机制和固定种子重新生成，再重新估计系数与区间。</div>'+
 '<h3 class="gap">测量质量（合成样本）</h3>'+
 line('SA · 4个题项',decimal(m.alpha.SA,3),'')+
 line('SU · 3个题项',decimal(m.alpha.SU,3),'')+
 line('OP · 3个题项 Alpha',decimal(m.alpha.OP,3),'')+
 line('SA · 平均方差提取 AVE',decimal(m.ave.SA,3),'')+
 line('SU · 平均方差提取 AVE',decimal(m.ave.SU,3),'')+
 line('OP · 平均方差提取 AVE',decimal(m.ave.OP,3),'')+
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

function windNav(){
 const names=['05-0 目标与现实','05-1 工业','05-2 专业服务','05-3 农业','05-4 情景与压力','05-5 行动跟踪'];
 return '<div class="view-tabs" role="tablist" aria-label="风洞六个视图">'+names.map((name,i)=>'<button role="tab" aria-selected="'+(view===i)+'" class="'+(view===i?'active':'')+'" type="button" data-view="'+i+'">'+name+'</button>').join('')+'</div>';
}
function windPage(r){
 const titles=['目标与现实，差了多少？','工业能接住下一棒吗？','增长留下来，还是流走？','农业的价值链，哪里可能堵？','给未来施加一点压力。','最后一棒，是人和行动。'];
 const explain=['从2025年公开基数出发，模拟每年的三产增加值，画出分位带与目标差距。','只改变工业条件，观察二产增加值、服务与总量如何同步响应。','专业服务与制造扩能相互关联，但目前关系边均为合成。','农业增加值与现金流断点是不同层面的观察，不能直接相加。','在合理区间内改变五个条件，显示局部敏感度和条件分布。','把模拟中暴露的薄弱环节，转成可核实的观察清单。'];
 return heading('05 / LIVE CONDITIONAL WIND TUNNEL',titles[view],explain[view],btn('calibration','⚙ 校准全部参数','primary'))+
 windNav()+'<section class="card" style="margin-bottom:17px">'+layoutControls()+'</section>'+
 (view===0?wind0(r):view===1?wind1(r):view===2?wind2(r):view===3?wind3(r):view===4?wind4(r):wind5(r));
}
function wind0(r){
 const base=E.DATA,sector=r.sector;
 return '<section class="stats">'+
 stat(state.year+' GDP 中位数',money(r.total.p50)+' 亿','模型计算，不是官方预测','cyan')+
 stat('目标差额',sign(-r.gap)+' 亿','中位数减去对照目标',r.gap>0?'bad':'good')+
 stat('模型样本达标占比',perc(r.hit),'取决于增长与波动假设','')+
 stat('结构接近1:5:4占比',perc(r.structural),'内部假设结构线，并非硬性指标','')+'</section>'+
 '<section class="grid2"><article class="card"><h3>从 2025 走向 '+state.year+'：不是一条预测直线</h3>'+chart(r)+
 '<div class="chartkey"><span><b style="background:var(--cyan)"></b>条件中位数</span><span><b style="background:var(--blue)"></b>P10–P90范围</span><span><b style="background:var(--gold)"></b>对照目标</span></div>'+
 '<div class="three-gauge"><div><small class="muted">P10</small><b>'+money(r.total.p10)+'</b></div><div><small class="muted">P50</small><b class="cyan">'+money(r.total.p50)+'</b></div><div><small class="muted">P90</small><b>'+money(r.total.p90)+'</b></div></div></article>'+
 '<article class="card"><h3>同一个经济体，三次产业如何移位？</h3><p class="micro">2025年已公布事实</p>'+stack([base.p,base.s,base.t])+
 '<div class="chartkey"><span>一产 10.7%</span><span>二产 54.6%</span><span>三产 34.7%</span></div>'+
 '<p class="micro gap">'+state.year+'年条件中位数</p>'+stack(sector.map(x=>x.p50))+
 '<div class="line-sep"></div>'+line('第一产业中位数',money(sector[0].p50)+' 亿','')+
 line('第二产业中位数',money(sector[1].p50)+' 亿','')+
 line('第三产业中位数',money(sector[2].p50)+' 亿','')+
 '<div class="dangerbox gap">'+insight(r)+'</div>'+
 '<div class="actions">'+btn('view-4','看看哪条条件最敏感 ↗','secondary')+'</div></article></section>'+
 '<article class="card gap"><h3>试着只改变一个条件</h3>'+quickSlider('manufacturing')+quickSlider('services')+quickSlider('project_delay')+
 '<p class="footnote">增量系数以既有 Python Demo 假设为基础移植至浏览器；所有滑杆范围为标准化情景强度。对不同参数采用同一随机种子，以便对照。</p></article>';
}
function quickSlider(key){
 const value=state.knobs[key];
 return '<div class="sliderrow"><label>'+E.LABELS[key]+' <output data-live="'+key+'">'+sign(value)+'</output></label><input type="range" data-set="'+key+'" min="'+(key==='project_delay'?0:-1)+'" max="1" step="0.25" value="'+value+'"></div>';
}
function sectorLine(r,key,index){
 const names=['第一产业','第二产业','第三产业'],v=r.sector[index];
 const shift=v.p50-[E.DATA.p,E.DATA.s,E.DATA.t][index];
 return '<div class="tile"><small>'+names[index]+' · '+key+'</small><div class="big-num">'+money(v.p50)+' 亿</div><p>相对2025年基准：'+sign(shift)+' 亿</p><div class="trend gap"><i style="width:'+Math.min(100,Math.max(1,v.p50/r.total.p50*150))+'%"></i></div><p class="micro">P10 '+money(v.p10)+' / P90 '+money(v.p90)+'</p></div>';
}
function wind1(r){
 return '<section class="stats">'+
 stat('2025第二产业增加值','549.01 亿','公开统计基准','cyan')+
 stat('2025规上工业增长','+8.7%','规上工业，不等于二产GDP','good')+
 stat('2025电子信息制造增长','+23%','行业增加值增速，非未来保证','good')+
 stat(state.year+'二产条件中位数',money(r.sector[1].p50)+' 亿','由当前假设重新计算','gold')+'</section>'+
 '<div class="grid2"><article class="card"><h3>工业条件强弱，会把结果推到哪里？</h3>'+quickSlider('manufacturing')+quickSlider('project_delay')+quickSlider('talent')+
 '<div class="line-sep"></div>'+sectorLine(r,'SECONDARY',1)+
 '<p class="footnote">二产不仅包括工业，也包括建筑业；不得用规上工业增幅直接替换二产增长。</p></article>'+
 '<article class="card"><h3>产能接续不是只看“工业涨了”</h3>'+
 '<div class="hypothesis"><span class="tag real">事实</span><div><b>制造业贡献的存量动力很强</b><p>2025年第二产业增加值549.01亿元，占GDP约54.6%。</p></div></div>'+
 '<div class="hypothesis"><span class="tag model">检验</span><div><b>新项目投产进度</b><p>项目延期滑杆越高，模型中对二产和三产假设的压力越大。</p></div></div>'+
 '<div class="hypothesis"><span class="tag model">检验</span><div><b>产业链配套是否本地承接</b><p>下一页专门显示合成服务关系与失联风险，不能从GDP图直接证明。</p></div></div>'+
 btn('view-2','再看专业服务怎么承接 ↗','primary')+'</article></div>';
}
function wind2(r){
 const n=E.network(state),services=r.sector[2];
 return '<section class="stats">'+stat('2025第三产业增加值','349.00 亿','已公布的现价增加值','cyan')+
 stat('模拟专业服务采购边',n.serviceEdges+' 条','合成关系图，C级','')+
 stat(state.year+'第三产业中位数',money(services.p50)+' 亿','由当前条件计算','gold')+
 stat('服务承接指数',decimal(n.capacity,2),'合成网络压力指标','')+'</section>'+
 '<section class="grid2"><article class="card"><h3>当专业服务能力改变</h3>'+quickSlider('services')+quickSlider('talent')+
 '<div class="line-sep"></div>'+sectorLine(r,'TERTIARY',2)+
 '<div class="dangerbox gap">增长不等于本地承接。即使二产增加值提高，本地研发、检测、物流、工业软件是否跟得上，仍需真实供应链证据。</div></article>'+
 '<article class="card"><h3>谁承接了合成工业服务需求？</h3>'+barchart(n.services.map(x=>({name:x.name,value:x.amount})),' 百万元')+
 '<div class="line-sep"></div>'+line('合成采购额',money(n.syntheticMillion)+' 百万元','')+
 line('前10节点断开后失联',money(n.lostDemand)+' 百万元','bad')+
 '<p class="footnote">这两项是同一合成关系网络的交易额，不可折算GDP，也不可称为博罗真实工业服务份额。</p>'+
 btn('go-models','查看网络断点详细机制 ↗','secondary')+'</article></section>';
}
function wind3(r){
 const cash=E.tea(recv,pay,daily);
 return '<section class="stats">'+stat('2025农业增加值','107.44 亿','公开宏观基数','cyan')+
 stat('2025农业增加值增速','+7.8%','不变价公开增幅','good')+
 stat(state.year+'一产中位数',money(r.sector[0].p50)+' 亿','条件模拟','')+
 stat('合成账期资金占用',money(cash.money)+' 万','C级机制假设，不是实际借款需求','gold')+'</section>'+
 '<div class="grid2"><article class="card"><h3>农业提质对增长轨迹的影响</h3>'+quickSlider('agriculture')+
 '<div class="line-sep"></div>'+sectorLine(r,'PRIMARY',0)+
 '<p class="footnote">农业增加值不能直接等于农产品销售额。产业链延伸的增值需要避免重复核算。</p></article>'+
 '<article class="card"><h3>柏塘茶季：回款链条会卡在哪里？</h3><p class="small muted">单独的经营现金流演示。基于研究假设，不反推全县GDP。</p>'+
 '<div class="duo"><div class="sliderrow"><label>渠道回款日 <output data-live="receive">'+recv+' 天</output></label><input type="range" data-set="receive" min="20" max="120" step="5" value="'+recv+'"></div>'+
 '<div class="sliderrow"><label>茶农回款日 <output data-live="pay">'+pay+' 天</output></label><input type="range" data-set="pay" min="5" max="40" step="1" value="'+pay+'"></div></div>'+
 '<div class="sliderrow"><label>演示日均垫资 <output data-live="daily">'+daily+' 万元</output></label><input type="range" data-set="daily" min="1" max="30" step="1" value="'+daily+'"></div>'+
 '<div class="line-sep"></div>'+line('回款错配',cash.gap+' 天','gold')+
 line('演示资金占用',money(cash.money)+' 万元','bad')+
 '<div class="dangerbox gap">这里值得现场打电话核验的不是“茶叶产值多少”，而是加工厂为谁垫资、垫多久、哪一环先断。现金流参数与GDP模拟相互独立，未经识别不自动传导。</div></article></div>';
}
function wind4(r){
 const sensitivity=E.sensitivity(state);
 return '<section class="stats">'+stat('条件抽样轨迹',money(r.samples)+' 条','固定随机种子可重现','cyan')+
 stat('P10 · 较低情景',money(r.total.p10)+' 亿','模型分布第10百分位','')+
 stat('P50 · 中位数',money(r.total.p50)+' 亿','不是点预测','')+
 stat('P90 · 较高情景',money(r.total.p90)+' 亿','模型分布第90百分位','')+'</section>'+
 '<div class="grid2"><article class="card"><h3>同一个目标，有多少条路径能接近？</h3>'+hist(r)+
 '<div class="row gap"><span class="micro">'+money(r.histogram.min)+' 亿</span><span class="micro">'+money(r.histogram.max)+' 亿</span></div>'+
 '<div class="line-sep"></div>'+line('达到 '+state.target+' 亿的模拟样本',perc(r.hit),'cyan')+
 line('允许的一次调整幅度','±0.5 标准强度','')+
 '<p class="footnote">直方图基于实际抽样总量绘制。达标比例不是经校准的现实发生概率；输入波动幅度与增长率均为演示假设。</p></article>'+
 '<article class="card"><h3>龙卷风 · 哪个条件最敏感？</h3>'+sensitivityBars(sensitivity)+
 '<p class="footnote">按单变量上下0.5的中位数区间排序。多变量同时调整时结果不能直接相加；“敏感”不等于“可干预”。</p>'+
 '<div class="dangerbox gap">当前最敏感的假设变量：<b>'+sensitivity[0].name+'</b>。要把它变成决策线索，需要进一步核对现实证据，而不是直接执行“提高这个数”。</div></article></div>'+
 '<div class="card gap"><h3>五个可控条件（改变即重新计算）</h3><div class="grid2">'+Object.keys(E.EFFECTS).map(quickSlider).join('')+'</div><div class="actions">'+btn('reset','恢复原始条件','secondary')+btn('save','保存这次压力实验','primary')+'</div></div>';
}
function wind5(r){
 const s=E.sensitivity(state);
 const observations=[
 {name:'重点项目是否按期转入产出',why:'投资与工业出现背离，需核对从投资到投产的时滞',condition:'如果项目延期强度持续上升，应重新测算中位数和下尾'},
 {name:'工业订单能否带动本地服务采购',why:'合成网络显示专业服务节点断点的传导路径',condition:'需要真实服务采购来源、流出率与供应商分布'},
 {name:'关键岗位能否留在产业集聚区',why:'人才约束同时影响二产与三产假设',condition:'补充工资、通勤、招聘与离职等公开或获授权指标'},
 {name:'春茶等农产品的回款链断点',why:'农产品产值和加工厂周转可能朝不同方向变化',condition:'用实际账期替换演示75天/12天口径'},
 {name:'2030目标和新增事实是否仍同一口径',why:'1600亿元努力目标与2025年现价基数须可比较',condition:'新统计修订必须先更新基准，才可复算'}
 ];
 return heading('05-5 / ACTION WATCHLIST','模型的终点不是一个分数。',
 '它应帮你发现一个新的核查对象：哪条关系可能断、哪份数据最值得补、一个条件变化会影响谁。')+
 '<section class="grid2"><article class="card"><h3>本轮计算的三个提醒</h3>'+
 '<div class="hero-panel" style="min-height:auto;padding:20px"><div class="eyebrow">TARGET GAP / CONDITIONAL</div><h2>'+sign(-r.gap)+' <strong>亿</strong></h2><p>与'+state.year+'年目标的中位数差额，仅在当前假设下成立。</p></div>'+
 '<div class="line-sep"></div>'+line('第一敏感条件',s[0].name,'gold')+
 line('该变量±0.5引起的差异',money(s[0].span)+' 亿元','')+
 line('当前样本达标频率',perc(r.hit),'cyan')+
 '<div class="dangerbox gap">优先核实那些“若被证伪，将让当前结论改变最多”的条件。当前排名来自模型敏感性，不代表已找到政策杠杆。</div>'+
 '<div class="actions">'+btn('save','保存这一轮研究','primary')+btn('go-archive','查看研究档案 ↗','secondary')+'</div></article>'+
 '<article class="card"><h3>下一步要盯什么？</h3>'+
 observations.map((o,i)=>'<div class="hypothesis"><span class="tag model">0'+(i+1)+'</span><div><b>'+o.name+'</b><p>'+o.why+'。'+o.condition+'。</p></div></div>').join('')+'</article></section>';
}
function archivePage(r){
 let compared='';
 const prev=records.find(x=>x.id===compareId);
 if(prev){
   const old=E.run(prev.state),delta=r.total.p50-old.total.p50;
   compared='<div class="card gap"><h3>对照：现在 vs 已保存的实验</h3><div class="grid2">'+
    '<div class="tile"><small>当前版本</small><div class="big-num cyan">'+money(r.total.p50)+'</div><p>'+E.PRESETS[state.scenario].name+' · '+r.runId+'</p></div>'+
    '<div class="tile"><small>已保存版本</small><div class="big-num">'+money(old.total.p50)+'</div><p>'+html(prev.title)+' · '+old.runId+'</p></div></div>'+
    '<div class="notice gap">中位数改变 <b class="'+(delta>=0?'good':'bad')+'">'+sign(delta)+' 亿元</b>。同样方法重新计算，不是拿两张静态图片对比。</div></div>';
 }
 return heading('06 / REPRODUCIBLE RESEARCH','每一次改动，都能再跑一遍。',
 '不使用导入、导出，也不假装云端协同。实验快照只存在当前浏览器中，保存条件、种子、目标与计算摘要，并可重新打开及对照。',
 btn('save','＋ 保存当前情景','primary'))+
 '<section class="stats">'+stat('当前实验 ID',r.runId,'由模型输入确定的简短指纹','cyan')+
 stat('抽样次数',money(state.draws),'改变后会重新计算','')+
 stat('保存的浏览器快照',records.length+' 份','只保存在此设备内','')+
 stat('当前对照年份',state.year+' 年','不是官方推演结果','')+'</section>'+
 '<div class="grid2"><article class="card"><h3>当前复现条件</h3>'+line('情景',E.PRESETS[state.scenario].name,'cyan')+
 line('目标',state.year+'年 · '+money(state.target)+'亿元','')+
 line('随机种子',state.seed,'')+
 line('抽样轨迹',state.draws,'')+
 Object.keys(E.EFFECTS).map(k=>line(E.LABELS[k],sign(state.knobs[k]),'')).join('')+
 '<p class="footnote">同一数据版本、输入条件与随机种子会给出完全相同的数值。数据源更新时，版本应另立，不可偷换已有实验。</p></article>'+
 '<article class="card"><h3>已保存的研究快照</h3>'+
 (records.length?records.map(x=>'<div class="record"><div><b>'+html(x.title)+'</b><small>'+html(x.date)+' · '+html(x.id)+' · '+x.state.year+'年目标</small></div><div class="actions"><button type="button" class="tiny-btn" data-action="restore" data-id="'+html(x.id)+'">重开</button><button type="button" class="tiny-btn" data-action="compare" data-id="'+html(x.id)+'">对比</button><button type="button" class="tiny-btn" data-action="remove" data-id="'+html(x.id)+'" aria-label="删除'+html(x.title)+'">删除</button></div></div>').join(''):'<div class="notice">还没有保存过实验。先打开风洞调整条件，再点击“保存”。</div>')+
 '<p class="footnote">当前阶段未接入云端存储；浏览器清理站点数据后，本地快照可能消失。正式研究归档需要后续后端支持。</p></article></div>'+compared;
}
function calibrationMarkup(){
 const s=state;
 return '<section class="column" style="padding-top:18px">'+
 '<div class="notice">所有调节只改变合成情景参数。2025年公开统计不跟着滑杆改变。每次参数调整都会按同一随机种子重新抽样。</div>'+
 '<div class="formfield"><label>情景类型</label><select class="select" data-set="scenario">'+Object.keys(E.PRESETS).map(k=>'<option value="'+k+'" '+(k===s.scenario?'selected':'')+'>'+E.PRESETS[k].name+'</option>').join('')+'</select></div>'+
 '<div class="duo"><div class="formfield"><label>对照年份</label><select class="select" data-set="year"><option value="2030" '+(s.year===2030?'selected':'')+'>2030 · 公开努力目标</option><option value="2032" '+(s.year===2032?'selected':'')+'>2032 · 内部假设</option></select></div>'+
 '<div class="formfield"><label>目标（亿元）</label><input type="number" min="900" max="2500" step="10" data-set="target" value="'+s.target+'"></div></div>'+
 '<div class="line-sep"></div><h3>五个产业传导条件</h3>'+Object.keys(E.EFFECTS).map(quickSlider).join('')+
 '<div class="line-sep"></div><h3>计算与复现</h3>'+
 '<div class="duo"><div class="formfield"><label>抽样轨迹</label><select class="select" data-set="draws">'+[500,1000,2500,5000].map(k=>'<option value="'+k+'" '+(s.draws===k?'selected':'')+'>'+k.toLocaleString('zh-CN')+' 条</option>').join('')+'</select></div>'+
 '<div class="formfield"><label>随机种子</label><input type="number" min="1" max="4294967294" step="1" data-set="seed" value="'+s.seed+'"></div></div>'+
 '<div class="actions">'+btn('reset','恢复默认条件','secondary')+btn('save','保存当前实验','primary')+'</div>'+
 '<p class="footnote">2032目标1,500亿元来自旧内部视觉设计，仅作自设研究参照；2030年1,600亿元来自公开努力目标。名义增长假设不可与官方不变价增长率直接等价。</p></section>';
}
function draw(){
 state=E.normalize(state);
 current=E.run(state);
 safeWrite(KEY,state);
 const hashpage=(location.hash||'#home').replace(/^#/,'').split('/')[0];
 if(['home','mission','data','survey','models','wind','archive'].includes(hashpage))page=hashpage;
 document.querySelectorAll('[data-page]').forEach(el=>{const active=el.getAttribute('data-page')===page;el.classList.toggle('active',active);if(el.matches('.navitem'))el.setAttribute('aria-current',active?'page':'false');});
 document.getElementById('topRun').textContent='LIVE · '+current.runId.toUpperCase()+' · '+state.draws.toLocaleString('zh-CN')+' 条';
 stage.innerHTML=page==='home'?home(current):page==='mission'?mission(current):page==='data'?dataPage(current):page==='survey'?surveyPage(current):page==='models'?modelsPage(current):page==='wind'?windPage(current):archivePage(current);
 document.getElementById('calibrationContent').innerHTML=calibrationMarkup();
}
function navigate(target,sub){
 page=target;
 if(sub!==undefined)view=sub;
 location.hash='#'+target+(target==='wind'?'/'+view:'');
 window.scrollTo({top:0,behavior:'smooth'});
 draw();
}
function save(){
 const item={id:'S'+Date.now().toString(36),title:'研究 '+(records.length+1)+' · '+E.PRESETS[state.scenario].name,
  date:new Date().toLocaleString('zh-CN'),state:JSON.parse(JSON.stringify(state)),
  runId:current.runId,p50:current.total.p50};
 records.unshift(item);records=records.slice(0,30);
 const ok=safeWrite(ARCHIVE,records);
 draw();
 if(!ok)alert('浏览器未允许本地存储。实验条件已计算，但快照无法持久保存。');
}
document.addEventListener('click',function(e){
 const viewButton=e.target.closest('[data-view]');if(viewButton){navigate('wind',Number(viewButton.dataset.view));return;}
 const p=e.target.closest('[data-page]');if(p){navigate(p.dataset.page);return;}
 const preset=e.target.closest('[data-preset]');if(preset){state.scenario=preset.dataset.preset;draw();return;}
 const action=e.target.closest('[data-action]');if(!action)return;
 const act=action.dataset.action,id=action.dataset.id;
 if(act==='calibration'){document.getElementById('calibrationContent').innerHTML=calibrationMarkup();overlay.hidden=false;document.body.style.overflow='hidden';return;}
 if(act==='close-calibration'){overlay.hidden=true;document.body.style.overflow='';return;}
 if(act==='go-wind'){navigate('wind',0);return;}
 if(act==='go-models'){navigate('models');return;}
 if(act==='go-data'){navigate('data');return;}
 if(act==='go-survey'){navigate('survey');return;}
 if(act==='go-archive'){navigate('archive');return;}
 if(act==='view-4'){navigate('wind',4);return;}
 if(act==='view-2'){navigate('wind',2);return;}
 if(act==='reset'){state=E.normalize(DEFAULT);draw();return;}
 if(act==='save'){save();return;}
 if(act==='resample'){state.seed=state.seed>=4294967293?100:state.seed+113;draw();return;}
 if(act==='restore'){const item=records.find(x=>x.id===id);if(item){state=E.normalize(item.state);compareId=null;navigate('wind',0);}return;}
 if(act==='compare'){compareId=id;navigate('archive');return;}
 if(act==='remove'){records=records.filter(x=>x.id!==id);if(compareId===id)compareId=null;safeWrite(ARCHIVE,records);draw();return;}
});
document.addEventListener('input',function(e){
 const control=e.target.closest('[data-set]');if(!control||control.type!=='range')return;
 const out=control.parentElement.querySelector('output[data-live]');if(out){
  const val=Number(control.value),k=control.dataset.set;
  out.textContent=['receive','pay'].includes(k)?val+' 天':k==='daily'?val+' 万元':k==='sampleSize'?val+' 份':sign(val);
 }
});
document.addEventListener('change',function(e){
 const control=e.target.closest('[data-set]');if(!control)return;
 const k=control.dataset.set,raw=control.value,val=Number(raw);
 if(k==='scenario'){state.scenario=raw;}
 else if(k==='year'){state.year=val;state.target=val===2032?1500:1600;}
 else if(k==='target'||k==='seed'||k==='draws'){state[k]=val;}
 else if(k==='sampleSize'){sampleSize=val;}
 else if(k==='receive'){recv=val;}
 else if(k==='pay'){pay=val;}
 else if(k==='daily'){daily=val;}
 else if(Object.prototype.hasOwnProperty.call(E.EFFECTS,k)){state.knobs[k]=val;}
 draw();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){overlay.hidden=true;document.body.style.overflow='';}});
window.addEventListener('hashchange',()=>{
 const p=(location.hash||'#home').slice(1).split('/');
 if(p[0]==='wind'&&p[1]!==undefined&&Number.isInteger(Number(p[1])))view=Math.max(0,Math.min(5,Number(p[1])));
 draw();
});
const first=location.hash.slice(1).split('/');
if(first[0]==='wind'&&first[1])view=Math.max(0,Math.min(5,Number(first[1])||0));
draw();
})();
