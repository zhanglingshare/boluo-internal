/* Interactive, offline-capable research lab. No imports, exports, remote APIs, or accounts. */
(function(){
'use strict';
const E=window.BoluoEngine;
const R=window.BoluoResearch, RV=window.BoluoResearchViz;
const V3=window.BoluoV3, V3V=window.BoluoV3Viz;
const V4=window.BoluoV4, V4V=window.BoluoV4Viz;
const V5=window.BoluoV5, V5V=window.BoluoV5Viz, V5UI=window.BoluoV5UI;
const V6=window.BoluoPresentationV6;
const SurveyBridge=window.BoluoSurveyBridge;
if(!SurveyBridge||!window.BoluoSurveyBridgeUI){document.getElementById('stage').textContent='调查情景模块加载失败，请刷新页面。';return;}
if(!V6){document.getElementById('stage').textContent='页面视觉层加载失败，请刷新页面。';return;}
if(!V5||!V5V||!V5UI){document.getElementById('stage').textContent='V5研究论证模块加载失败，请刷新页面。';return;}
if(!V4||!V4V){document.getElementById('stage').textContent='产业结构V4模块加载失败，请刷新页面。';return;}
if(!V3||!V3V){document.getElementById('stage').textContent='研究V3模块加载失败，请刷新页面。';return;}
if(!R||!RV){document.getElementById('stage').textContent='结构研究模块加载失败，请刷新页面。';return;}
if(!E){document.getElementById('stage').textContent='计算模块加载失败，请刷新页面。';return;}
const KEY='boluo-internal-lab-v1',ARCHIVE='boluo-internal-snapshots-v1';
const DEFAULT={year:2030,target:1600,scenario:'balanced',seed:20321111,draws:2500,knobs:{}};
function safeRead(k,fallback){try{return JSON.parse(localStorage.getItem(k))||fallback;}catch(e){return fallback;}}
function safeWrite(k,val){try{localStorage.setItem(k,JSON.stringify(val));return true;}catch(e){return false;}}
let state=E.normalize(safeRead(KEY,DEFAULT));
let records=safeRead(ARCHIVE,[]);if(!Array.isArray(records))records=[];
let page='home',view=0,sampleSize=300,recv=75,pay=12,daily=10,activeService='',compareId=null;
let historyMode='share',selectedVariable='project_delivery',cutCount=10,cutMode='targeted',selectedNetworkNode='S1';
let methodFilter='全部';
let v5Tabs={},v5Focus='H1',v5Cut=10;
let v6Expanded={};
let surveySignalTopic='industry';
let surveyPressure=.4,surveyMechanism='expansion';
let realSurveyFeed={schema_version:'1.0',status:'pending',datasets:[]};
let v4Lens='history',v4Industry='electronics',v4Metric='shares',v4Peer='huiyang',v4Local=30,v4VA=35,v4Improve=20;
let dataLens='industry',v3Domain='全部',selectedIndustry=0,selectedConflict='retail',selectedQuestion='H1',selectedMechanism=0,cascadeCut=10,cascadeMode='targeted',cascadeThreshold=2;
let memoMorrisKey='',memoMorrisValue=null;
function v3Morris(){const key=JSON.stringify(state);if(key!==memoMorrisKey||!memoMorrisValue){memoMorrisValue=V3.morris(E,state);memoMorrisKey=key;}return memoMorrisValue;}
let current=null;
let memoSurveyKey='',memoSurveyResult=null;
function getSurvey(){
 const key=state.seed+':'+sampleSize;
 if(key!==memoSurveyKey||!memoSurveyResult){memoSurveyResult=E.survey({...state,sampleSize});memoSurveyKey=key;}
 return memoSurveyResult;
}
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
v4HomePanel()+
 '<section class="stats">'+stat('2025 GDP / 公开统计',money(d.gdp)+' 亿','一产 '+d.p+' · 二产 '+d.s+' · 三产 '+d.t,'cyan')+
 stat(state.year+'目标差额',money(state.target-d.gdp)+' 亿','对照目标减去2025基数','gold')+
 stat('所需五年复合增幅',decimal(rate)+'%','名义口径的算术门槛，非官方增速','')+
 stat('当前条件达标比例',perc(r.hit),'只代表模型条件内的样本占比','')+'</section>'+
 '<section class="grid2"><article class="card"><h3>一张结构图：博罗的发动机在哪里？</h3><p class="micro">2025年已公布的三次产业增加值份额</p>'+stack([d.p,d.s,d.t])+
 '<div class="chartkey"><span><b style="background:var(--p)"></b>第一产业 10.7%</span><span><b style="background:var(--s)"></b>第二产业 54.6%</span><span><b style="background:var(--t)"></b>第三产业 34.7%</span></div>'+
 '<div class="line-sep"></div><h3>结构变化能传到谁？</h3><p class="small muted">产业协同不是GDP单点提速，而是制造、专业服务、农业加工和人力条件能否互相承接。</p>'+btn('go-models','拆开产业网络 ↗','secondary')+'</article>'+
 '<article class="card"><h3>从问题发现到行动检验</h3><div class="logic"><div><b>01</b><span>提出问题</span></div><div><b>02</b><span>核对证据</span></div><div><b>03</b><span>跑结构</span></div><div><b>04</b><span>改条件</span></div><div><b>05</b><span>盯断点</span></div></div><div class="dangerbox gap">'+insight(r)+'</div><p class="footnote">注意：2030年1600亿元是公开报道中的努力目标。模型年增长率属于名义增长假设，不能与政府公布的不变价GDP增长率直接比较。</p></article></section>';
}
function v3MethodGatePanel(){
 const items=[
 ['历史结构与产业贡献描述','事实可描述','已有6年三产数据；2024核实分项有缺口'],
 ['规上工业内部异质性','事实可描述','2025只披露5行业，不能推出全行业分解'],
 ['名义与实际增长口径桥','事实可描述','已用2024核实GDP，隐含价格因子非官方'],
 ['2025计划实绩差异','事实可描述','需检查财政和社零数据可比范围'],
 ['合成供应链SNA','仅可演示','500节点680合成边；不能识别现实企业'],
 ['探索性Mode-A PLS','仅可演示','合成问卷；可测量HTMT与VIF但无专业软件认证'],
 ['蒙特卡洛压力','仅可演示','分位数依赖自设增长与扰动参数'],
 ['Morris全局筛查','仅可演示','参数空间敏感性并非现实政策净效应'],
 ['双重差分DiD','证据不足','缺少处理组、对照组与可核对的前趋势'],
 ['工具变量/准实验','证据不足','未找到可信外生工具与排除限制'],
 ['行业Shift-share','证据不足','缺可比地区同期细分行业基准和长面板'],
 ['投入产出与本地价值留存','证据不足','未获真实企业采购流和县域投入产出表'],
 ['效率前沿DEA','证据不足','缺可比决策单元投入和产出指标'],
 ['长期动态计量','证据不足','县域仅有6年且有修订，无法支持高维参数']
 ];
 const view=items.filter(x=>methodFilter==='全部'||x[1]===methodFilter);
 const color={'事实可描述':'real','仅可演示':'model','证据不足':'warn'};
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">METHOD ADMISSION GATE / ANTI-PSEUDOSCIENCE</div><h3>14种研究方法，不能因为会写代码就声称可以使用</h3></div>'+badge('方法准入 · 证据门槛优先','model')+'</div>'+
 '<div class="research-tabs">'+['全部','事实可描述','仅可演示','证据不足'].map(x=>'<button type="button" data-method-filter="'+x+'" class="'+(methodFilter===x?'active':'')+'">'+x+'</button>').join('')+'</div>'+
 '<div class="v3-method-grid">'+view.map((x,i)=>'<div class="v3-method"><div class="row wrap"><b>'+html(x[0])+'</b>'+badge(x[1],color[x[1]])+'</div><p>'+html(x[2])+'</p></div>').join('')+'</div>'+
 '<p class="footnote">准入基于证据与识别条件，而非方法是否高级。拿不到有代表性的样本时，应明示研究方案与数据缺口，不把演示结果包装成实证结论。</p></section>';
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
 '<div class="notice">④ 复核：不同随机种子、不同冲击幅度都要重跑；结论不稳健就标记。</div></div></div>'+v3MethodGatePanel();
}

/* Methods-workbench: actual observed vintages, diagnostic variable map and
   synthetic structural network. These diagrams do not assert causal identification. */
function historicalPanel(){
 const d=R.describe(),labels={share:'三产份额',levels:'三产增加值',gdp:'GDP与修订'};
 const tab='<div class="research-tabs">'+Object.keys(labels).map(k=>'<button type="button" data-history="'+k+'" class="'+(historyMode===k?'active':'')+'">'+labels[k]+'</button>').join('')+'</div>';
 const base='<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">2020—2025 · OBSERVED HISTORICAL SERIES</div><h3>从真实序列看产业结构变化</h3></div>'+badge('历年统计公报｜不同核算版本','real')+'</div>'+
 tab+'<div class="chartwrap">'+RV.history(historyMode)+'</div>'+
 '<div class="chartkey"><span><b style="background:#61ddbd"></b>第一产业</span><span><b style="background:#53a8f8"></b>第二产业</span><span><b style="background:#f3c080"></b>第三产业</span></div>'+
 '<div class="research-kpi">'+
 '<div><small>2020—2025 GDP现价增量</small><strong class="cyan">+'+money(d.nominalTotal)+' 亿</strong></div>'+
 '<div><small>第二产业份额变化</small><strong>'+sign(d.shareChangePp[1])+' pp</strong></div>'+
 '<div><small>第三产业份额变化</small><strong class="gold">'+sign(d.shareChangePp[2])+' pp</strong></div>'+
 '<div><small>2024 GDP核实修订</small><strong class="gold">+'+money(d.revision)+' 亿</strong></div></div>'+
 '<div class="research-vintage gap"><b>统计修订断点：</b>2024年原初步GDP 952.24亿元，2025年公布2024年最终核实为970.87亿元；当前可核查的2024三产分项仍属初步口径。图中的2024分项不能和970.87亿元强行配算结构，更不能把2025年实际增速5.5%误当现价增长率。</div>'+
 '</section>';
 const structural='<section class="grid2 gap"><article class="card"><h3>2020—2025现价增加值：谁贡献了算术增量？</h3>'+RV.waterfall()+
 '<p class="footnote">这个瀑布图是<strong>现价数值的会计差分</strong>，而非经价格调整后的实际GDP增长贡献率，也不是因果归因。2023和2024公告存在小额四舍五入差异。</p></article>'+
 '<article class="card"><h3>份额变化与结构集中度</h3>'+RV.shareBars()+
 line('三产粗颗粒 HHI（2020）',decimal(d.concentrationStart,3),'')+
 line('三产粗颗粒 HHI（2025）',decimal(d.concentrationEnd,3),'cyan')+
 '<p class="footnote">HHI仅针对三次产业三个大类，无法反映电子信息、装备等二产内部产业集中度；因此不能直接判定高新化程度或网络韧性。</p></article></section>';
 const sources='<details class="card gap"><summary><b>核验历史来源及分产业统计口径</b> <span class="micro">点击展开</span></summary>'+
 R.HISTORY.map(r=>'<div class="source-item"><a href="'+r.source+'" target="_blank" rel="noopener noreferrer">'+r.year+'年统计公报 ↗</a>'+
 '<span class="micro">'+r.stage+' · '+r.gdp+'亿元'+(r.finalGdp?' / GDP最终核实'+r.finalGdp+'亿元':'')+'</span></div>').join('')+
 '</details>';
 return base+structural+sources;
}
function surveyGraph(m){
 const coef=m.paths;
 function k(v){return decimal(v,2);}
 return '<svg class="linechart" viewBox="0 0 780 245" role="img" aria-label="合成问卷探索性路径模型系数图">'+
 '<defs><marker id="plsarr" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#66c9f1"/></marker></defs>'+
 '<path d="M204 117 L325 117" stroke="#67c9f0" stroke-width="3" marker-end="url(#plsarr)"/>'+
 '<path d="M455 117 L573 117" stroke="#67c9f0" stroke-width="3" marker-end="url(#plsarr)"/>'+
 '<path d="M204 88 Q385 -40 573 86" fill="none" stroke="#f0bd75" stroke-width="2.5" marker-end="url(#plsarr)"/>'+
 '<text x="270" y="100" fill="#b7eaff" text-anchor="middle" font-size="14">'+k(coef['SA→SU'])+'</text>'+
 '<text x="510" y="100" fill="#b7eaff" text-anchor="middle" font-size="14">'+k(coef['SU→OP'])+'</text>'+
 '<text x="385" y="35" fill="#ffe0aa" text-anchor="middle" font-size="14">'+k(coef['SA→OP'])+'</text>'+
 [['SA','服务可得',80],['SU','服务使用',326],['OP','经营表现',573]].map(x=>'<rect x="'+x[2]+'" y="90" width="130" height="57" rx="12" fill="#234466" stroke="#71b5e7"/>'+
 '<text x="'+(x[2]+65)+'" y="112" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">'+x[0]+'</text>'+
 '<text x="'+(x[2]+65)+'" y="132" text-anchor="middle" fill="#d0e0ed" font-size="12">'+x[1]+'</text>').join('')+
 '<text x="385" y="220" text-anchor="middle" font-size="12" fill="#9ab0c9">仅合成问卷 · Mode-A路径系数不是GDP贡献或政策因果效应</text></svg>';
}
function variableDetail(){
 const v=R.variable(selectedVariable);
 return '<div class="research-detail"><div class="row wrap"><div><div class="eyebrow">'+html(v.role)+' / '+html(v.level)+'</div><h3>'+html(v.name)+'</h3></div>'+badge(html(v.status),v.level==='C'?'model':v.status==='缺失'?'warn':'real')+'</div>'+
 line('研究用途',html(v.theory),'')+
 line('单位与时期',html(v.unit)+' · '+html(v.period),'')+
 '<p><b>测量路径：</b>'+html(v.measure)+'</p>'+
 '<div class="research-vintage"><b>识别警告：</b>'+html(v.warning)+'</div></div>';
}
function variablePanel(){
 return '<section class="card gap research-feature"><div class="row wrap"><div><div class="eyebrow">THEORY → VARIABLE → MEASUREMENT</div><h3>点击变量：它为什么存在，证据在哪里？</h3></div>'+badge('箭头为候选机制，不是已识别因果','model')+'</div>'+
 RV.dag(selectedVariable)+
 '<div class="research-variables">'+R.VARIABLES.map(v=>'<button type="button" class="'+(selectedVariable===v.id?'active':'')+'" data-variable="'+v.id+'">'+html(v.name)+' · '+html(v.level)+'</button>').join('')+'</div>'+
 variableDetail()+
 '<details class="gap"><summary class="small">查看完整变量筛选规则与研究红线</summary><p class="footnote">每个变量先经：理论必要性 → 观测单位及口径 → 时间位置 → 测量误差 → 混杂与可识别性 → 替代解释 → 预测检验。缺乏真实序列不能以模型重要性排序当成因果变量选择结果。当前只有2020—2025年六个宏观点位，不足以估计包含十多个参数的县域经济结构模型。</p></details></section>';
}
function hypothesisPanel(){
 return '<section class="card gap"><h3>四条竞争性研究假说：可被证伪，才值得运行</h3><div class="research-hypotheses">'+
 R.HYPOTHESES.map(h=>'<details><summary><span class="cyan">'+h.id+'</span> '+html(h.name)+'</summary>'+
 '<p><strong>检验：</strong>'+html(h.test)+'</p>'+
 '<p><strong>替代解释：</strong>'+html(h.alternative)+'</p>'+
 '<p><strong>现阶段：</strong>'+html(h.result)+'</p></details>').join('')+
 '</div><p class="footnote">假说是理论组织工具，不代表模型已识别真实原因。单县短年度序列不允许据此宣称博士论文级因果证据。</p></section>';
}
function networkResearchPanel(){
 const result=R.networkStress({cut:cutCount,mode:cutMode});
 const target=result.top.find(x=>x.id===selectedNetworkNode)||result.top[0];
 selectedNetworkNode=target.id;
 return '<section class="card gap research-feature"><div class="row wrap"><div><div class="eyebrow">STRUCTURAL NETWORK ANALYSIS / SYNTHETIC</div><h3>断开服务节点，谁的连接会消失？</h3></div>'+badge('500节点 / 680边 · C级合成','model')+'</div>'+
 '<div class="research-switch"><label for="cutCount">移除节点数</label>'+
 '<select id="cutCount" class="select" data-research="cut">'+[0,3,5,10,20,30].map(x=>'<option value="'+x+'" '+(x===cutCount?'selected':'')+'>'+x+' 个</option>').join('')+'</select>'+
 '<label for="cutMode">攻击策略</label>'+
 '<select id="cutMode" class="select" data-research="mode"><option value="targeted" '+(cutMode==='targeted'?'selected':'')+'>高交易额优先</option><option value="random" '+(cutMode==='random'?'selected':'')+'>固定种子随机</option></select></div>'+
 RV.networkMap(result,selectedNetworkNode)+
 '<div class="research-kpi">'+
 '<div><small>断开服务关系</small><strong class="bad">'+result.cutEdges+' 条</strong></div>'+
 '<div><small>合成采购额失联</small><strong>'+money(result.cutValue)+' <span style="font-size:12px">百万元</span></strong></div>'+
 '<div><small>受影响的服务采购份额</small><strong class="gold">'+perc(result.impactPct)+'</strong></div>'+
 '<div><small>服务交易集中HHI</small><strong>'+decimal(result.serviceHHI,3)+'</strong></div></div>'+
 '<div class="grid2 gap"><div class="panel"><h3>选中节点：'+html(target.id)+'</h3>'+line('合成入边数',target.indegree+' 条','')+
 line('合成入向交易额',money(target.weight)+' 百万元','cyan')+
 '<p class="footnote">节点位置为聚合可视化，点击图上S编号可查看。指标来自合成网络实际边集，而不是凭文本编造。</p></div>'+
 '<div class="panel"><h3>机制解释</h3><p class="research-summary">'+(cutMode==='targeted'?'优先移除高采购额服务节点，用于检查集中依赖风险。':'随机移除同样数量的服务节点，用于构造简单对照。')+'这里的“失联”是被删除的合成边及交易金额，不能推导真实经济损失，跨区供应商也未被观测。</p></div></div></section>';
}
function modelComparisonPanel(r){
 const m=R.compareModels(r);
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">MODEL PLURALISM / ASSUMPTION DISAGREEMENT</div><h3>同一个2030目标，不同机制假设能差多远？</h3></div>'+badge('不合成单一“成功概率”','model')+'</div>'+
 RV.comparison(m,state.target)+
 '<div class="research-kpi"><div><small>最高与最低模型输出差距</small><strong>'+money(m.spread)+' 亿</strong></div>'+
 '<div><small>蒙特卡洛条件P50</small><strong>'+money(r.total.p50)+' 亿</strong></div>'+
 '<div><small>历史外推使用年份</small><strong>2020–23</strong></div></div>'+
 '<details class="gap"><summary class="small"><b>各模型假设与局限</b> · 点击展开</summary>'+
 m.candidates.map(x=>'<div class="source-item"><div><b>'+html(x.name)+'</b><p class="micro">'+html(x.basis)+'</p></div>'+badge(html(x.type),'model')+'</div>').join('')+
 '</details><div class="research-vintage gap"><b>建模纪律：</b>'+html(m.caution)+' 2020—2023年现价复合增速跨统计版本且样本很短，不能当正式长期趋势估计。</div></section>';
}

function backtestPanel(){
 const b=R.backtest();
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">HOLDOUT CHECK / SMALL-SAMPLE WARNING</div><h3>历史回测：先看模型在哪些年份容易出错</h3></div>'+badge('仅两个留出年 · 不构成认证','warn')+'</div>'+
 RV.backtestTable(b)+
 '<div class="research-kpi gap"><div><small>2022—23历史外推平均绝对百分比误差</small><strong class="gold">'+perc(b.histMAPE)+'</strong></div>'+
 '<div><small>7.3%共同名义增速基准误差</small><strong>'+perc(b.constantMAPE)+'</strong></div></div>'+
 '<div class="research-vintage gap">'+html(b.caution)+' 价格基准、修订与样本量不足时，错误率不应用于宣布“模型通过验证”。</div></section>';
}
function surfacePanel(){
 const surf=R.surface(E,state);
 return '<section class="card gap research-feature"><div class="row wrap"><div><div class="eyebrow">JOINT PERTURBATION / RESPONSE SURFACE</div><h3>工业与专业服务同时变化，结果在哪个角落翻转？</h3></div>'+badge('可点击的双变量压力面','model')+'</div>'+
 RV.stressSurface(surf,state)+
 '<div class="research-kpi"><div><small>最低确定性总量</small><strong>'+money(surf.minimum)+' 亿</strong></div>'+
 '<div><small>最高确定性总量</small><strong>'+money(surf.maximum)+' 亿</strong></div>'+
 '<div><small>当前对照目标</small><strong>'+money(surf.target)+' 亿</strong></div></div>'+
 '<p class="footnote">'+html(surf.caution)+' 图中81个格子的差异来自设定的两个增长条件及复利响应，不是实证估计出的政策协同增益。</p></section>';
}

function v3Sources(keys){
 return '<div class="v3-provenance">'+keys.map(key=>'<a href="'+V3.URL[key]+'" target="_blank" rel="noopener noreferrer">↗ '+({stat:'2025统计公报',plan:'政府计划',news:'南方日报',revision:'GDP修订公告',jrc:'欧盟JRC方法'}[key]||key)+'</a>').join('')+'</div>';
}
function v3PriceBridgePanel(){
 const b=V3.priceBridge();
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">NOMINAL VS REAL / REVISION-AWARE DIAGNOSTIC</div><h3>为什么“千亿突破”不等于同等幅度的真实产出增长？</h3></div>'+badge('价格桥为近似推导','model')+'</div>'+
 '<div class="research-kpi"><div><small>2025 GDP近似现价增长</small><strong>'+decimal(b.nominalGrowth,2)+'%</strong></div>'+
 '<div><small>2025 GDP官方实际增速</small><strong class="cyan">'+decimal(b.realGrowth,1)+'%</strong></div>'+
 '<div><small>隐含总量价格变化（近似）</small><strong class="gold">'+decimal(b.impliedPriceGrowth,2)+'%</strong></div>'+
 '<div><small>1600亿目标所需五年名义复合增速</small><strong>'+decimal(b.nominalTargetCAGR,2)+'%</strong></div></div>'+
 '<div class="v3-price-equation"><span>2024核实GDP <b>970.87亿元</b></span>'+
 '<span class="v3-arrow">→</span><span>2025公布GDP <b>1005.45亿元</b></span>'+
 '<span class="v3-arrow">→</span><span>不变价实际增幅 <b>5.5%</b></span></div>'+
 '<div class="research-vintage gap">'+html(b.note)+' 2030年1600亿元为现价总量目标，所需名义复合增幅不得直接和实际GDP增长率比较。</div>'+
 v3Sources(['revision','stat'])+'</section>';
}
function v3DataPanel(){
 const summary=V3.summary(),selected=V3.INDUSTRIES[selectedIndustry],conflict=V3.CONFLICTS.find(x=>x.id===selectedConflict)||V3.CONFLICTS[0];
 const nav='<div class="research-tabs v3-tabs">'+[
 ['industry','产业穿透'],['targets','预期与现实'],['signals','跨系统信号'],['audit','证据冲突']
 ].map(([id,name])=>'<button type="button" data-v3-lens="'+id+'" class="'+(dataLens===id?'active':'')+'">'+name+'</button>').join('')+'</div>';
 let body='';
 if(dataLens==='industry')body=
 '<div class="research-kpi"><div><small>五个公开细分行业覆盖率</small><strong>'+decimal(summary.covered)+'%</strong></div>'+
 '<div><small>未列示行业比重</small><strong class="gold">'+decimal(summary.missing)+'%</strong></div>'+
 '<div><small>电子设备增加值增速</small><strong class="cyan">+23%</strong></div>'+
 '<div><small>橡胶塑料增加值增速</small><strong class="bad">-4.2%</strong></div></div>'+
 '<div class="grid2 gap"><article class="panel"><h3>增长速度 × 产业体量</h3>'+V3V.scatter(selectedIndustry)+
 '<div class="v3-selected"><b>'+html(selected.name)+'</b><span>占规上工业 '+selected.share+'% · 增速 <strong class="'+(selected.growth<0?'bad':'good')+'">'+sign(selected.growth)+'%</strong></span></div>'+
 '<p class="footnote">每个气泡代表已披露的规上工业行业，不包含其余38.6%。占比与增长来自同一公报，但没有行业全量面板；不能据此推出精确增长贡献。</p></article>'+
 '<article class="panel"><h3>不同企业规模的增长差异</h3>'+V3V.industrialSizes()+
 '<div class="line-sep"></div><h3>实物产品：不是所有生产都在上升</h3>'+V3V.products()+'</article></div>'+v3Sources(['stat']);
 else if(dataLens==='targets')body=
 '<div class="grid2"><article class="panel"><h3>2025计划 vs 实际：同为增速，差了多少？</h3>'+V3V.plan()+'</article>'+
 '<article class="panel"><h3>值得核验的四个落差</h3>'+
 '<div class="v3-signal-hero"><span>固定资产投资目标差异</span><strong class="bad">-23.8 <small>百分点</small></strong></div>'+
 '<div class="hypothesis"><span class="tag model">不能直接推因果</span><div><b>为什么规上工业仍增长8.7%？</b><p>存量产能、项目投产时差、市场订单变化和价格/核算差异都可能参与解释。</p></div></div>'+
 '<div class="hypothesis"><span class="tag warn">需要核查</span><div><b>财政增长0.2%是否低于计划3%？</b><p>可比口径需要进一步确认；绝不能将不同版本绝对值直接相除。</p></div></div>'+
 '<div class="hypothesis"><span class="tag model">回到结构</span><div><b>目标未实现不等于政策无效</b><p>计划指标是决策基准，完成度用于定位需要解释的差异，不足以推导单项行动的净效应。</p></div></div></article></div>'+v3Sources(['plan','stat']);
 else if(dataLens==='signals')body=
 '<div class="research-kpi"><div><small>2025年跨系统公开信号</small><strong>'+summary.signals+' 项</strong></div>'+
 '<div><small>农村人均收入增速</small><strong class="good">+6.2%</strong></div>'+
 '<div><small>城镇人均收入增速</small><strong>+3.5%</strong></div>'+
 '<div><small>城乡收入比（2025）</small><strong>'+decimal(summary.income.ratioNow,2)+'</strong></div></div>'+
 '<div class="research-switch gap"><label>只看哪类信号？</label><select class="select" data-v3-control="domain">'+
 ['全部','生产','投资','消费','服务','金融','民生','绿色'].map(k=>'<option value="'+k+'" '+(v3Domain===k?'selected':'')+'>'+k+'</option>').join('')+'</select></div>'+
 '<div class="grid2"><article class="panel"><h3>公开指标的方向与幅度</h3>'+V3V.signals(v3Domain)+'</article>'+
 '<article class="panel"><h3>城乡收入是否真的在收敛？</h3>'+
 line('2020城镇/农村收入比（由公报差额倒推）',decimal(summary.income.ratioBefore,3),'')+
 line('2025城镇/农村收入比',decimal(summary.income.ratioNow,3),'cyan')+
 line('2025城镇人均可支配收入','45,832元','')+
 line('2025农村人均可支配收入','32,915元','')+
 '<div class="dangerbox gap">收入差距比值变化是描述统计，不足以证明某产业或项目推动了居民福利。还要检验价格、人口构成、岗位质量及中位数收入。</div>'+
 '<h3 class="gap">几个无法互相抵消的信号</h3>'+line('金融业增加值实际增速','-3.7%','bad')+
 line('旅游综合收入增长','+19.1%','good')+line('单位GDP能耗变动','-2.9%','good')+'</article></div>'+v3Sources(['stat']);
 else body=
 '<div class="research-kpi"><div><small>需要复核的公开口径冲突</small><strong class="bad">'+summary.unresolved+' 项</strong></div>'+
 '<div><small>已经明确核实的历史修订</small><strong>1 项</strong></div>'+
 '<div><small>禁止的操作</small><strong style="font-size:16px">自动修正数据</strong></div></div>'+
 '<div class="v3-conflict-list">'+V3.CONFLICTS.map(x=>'<button type="button" class="'+(x.id===conflict.id?'active':'')+'" data-v3-conflict="'+x.id+'"><span>'+html(x.name)+'</span><b>'+html(x.state)+'</b></button>').join('')+'</div>'+
 '<div class="v3-evidence-detail"><div class="row wrap"><h3>'+html(conflict.name)+'</h3>'+badge(html(conflict.priority),conflict.priority==='P0'?'warn':'')+'</div>'+
 '<div class="grid2"><div class="notice"><b>材料 A</b><p>'+html(conflict.a)+'</p></div>'+
 '<div class="notice"><b>材料 B</b><p>'+html(conflict.b)+'</p></div></div>'+
 '<div class="v3-conflict-stat">'+html(conflict.math)+'</div>'+
 '<div class="research-vintage"><b>不能推断：</b>'+html(conflict.caveat)+'</div>'+
 '<div class="notice gap"><b>下一项验证动作：</b>'+html(conflict.verify)+'</div>'+
 v3Sources(conflict.sources)+'</div>';
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">EMPIRICAL DEPTH / 2025</div><h3>从“三产占比”穿透到行业、目标和证据矛盾</h3></div>'+badge('真实公开证据｜区别于合成模型','real')+'</div>'+
 nav+body+'</section>';
}
function v3QuestionPanel(){
 const q=V3.HYPOTHESES.find(x=>x.id===selectedQuestion)||V3.HYPOTHESES[0];
 const mechanism=q.rival[Math.min(selectedMechanism,q.rival.length-1)];
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">FALSIFICATION LAB / COMPETING EXPLANATIONS</div><h3>不是问“模型支持什么”，而是问“哪条解释可能被推翻”</h3></div>'+badge('待检验的竞争机制','model')+'</div>'+
 '<div class="research-tabs">'+V3.HYPOTHESES.map(x=>'<button type="button" data-v3-question="'+x.id+'" class="'+(q.id===x.id?'active':'')+'">'+x.id+' '+x.title+'</button>').join('')+'</div>'+
 '<div class="grid2"><div class="panel"><h3>已观察到的信号</h3>'+q.facts.map(x=>'<div class="v3-fact">'+badge('事实','real')+' '+html(x)+'</div>').join('')+
 '<h3 class="gap">解释竞争</h3>'+q.rival.map((x,i)=>'<button type="button" class="v3-mechanism '+(i===selectedMechanism?'active':'')+'" data-v3-mechanism="'+i+'"><span>'+('0'+(i+1))+'</span>'+html(x)+'</button>').join('')+'</div>'+
 '<div class="panel"><div class="eyebrow">SELECTED RIVAL MECHANISM</div><h3>'+html(mechanism)+'</h3>'+
 '<div class="dangerbox">现有信号与此解释可能相容，但相容性不构成因果证明。没有对照、时间顺序和混杂控制，就不能排除其他解释。</div>'+
 '<h3 class="gap">怎样才能推翻它？</h3><p class="research-summary">'+html(q.falsifier)+'</p>'+
 '<h3 class="gap">最值得补充的证据</h3><div class="notice">'+html(q.test)+'</div>'+
 '<div class="line-sep"></div>'+badge(html(q.quality),'model')+'</div></div>'+
 '<p class="footnote">研究逻辑：竞争性机制 → 可观察的不同预期 → 测量与对照 → 证据排除。此处仅建立待验证的研究设计，不声称已有因果识别。</p></section>';
}
function v3CascadePanel(){
 const v=V3.cascade({cut:cascadeCut,mode:cascadeMode,threshold:cascadeThreshold});
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">SECOND-ORDER NETWORK SHOCK / SYNTHETIC</div><h3>服务供应链断开后，会不会再传到制造业和农业？</h3></div>'+badge('二阶机制实验 · 全部合成','model')+'</div>'+
 '<div class="research-switch">'+
 '<label>移除服务主体</label><select class="select" data-v3-control="cut">'+[0,3,5,10,20,30].map(x=>'<option value="'+x+'" '+(x===cascadeCut?'selected':'')+'>'+x+'个</option>').join('')+'</select>'+
 '<label>失效顺序</label><select class="select" data-v3-control="mode"><option value="targeted" '+(cascadeMode==='targeted'?'selected':'')+'>交易额最高优先</option><option value="random" '+(cascadeMode==='random'?'selected':'')+'>固定随机移除</option></select>'+
 '<label>制造主体失效阈值</label><select class="select" data-v3-control="threshold"><option value="1" '+(cascadeThreshold===1?'selected':'')+'>失去1项服务</option><option value="2" '+(cascadeThreshold===2?'selected':'')+'>失去2项服务</option></select></div>'+
 V3V.cascade(v)+
 '<div class="research-kpi"><div><small>失去服务采购边</small><strong class="bad">'+v.lostServiceEdges+'条</strong></div>'+
 '<div><small>制造业有关系受影响</small><strong>'+v.manufacturersTouched+'家</strong></div>'+
 '<div><small>达到设定失效阈值</small><strong class="gold">'+v.manufacturersImpaired+'家</strong></div>'+
 '<div><small>关联农业供应节点</small><strong>'+v.farmsTouched+'家</strong></div></div>'+
 '<div class="research-vintage gap">'+html(v.note)+' 不提供金额因果损失或停产概率。</div></section>';
}
function v3MorrisPanel(){
 const m=v3Morris();
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">GLOBAL SCREENING / MORRIS-TYPE DESIGN</div><h3>变量有多敏感？先在整个允许区间内抽查</h3></div>'+badge('32组轨迹 × 五参数','model')+'</div>'+
 V3V.morris(m)+
 '<div class="research-vintage gap">'+html(m.warning)+' 高μ*表示设定模型敏感，不代表现实中政策可控性或因果重要性。高σ可能来自非线性和参数交互，需另行区分。</div>'+
 v3Sources(['jrc'])+'</section>';
}
function v3UncertaintyPanel(r){
 const e=V3.epistemic(E,state);
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">ALEATORY VS EPISTEMIC</div><h3>同一个风洞，两种完全不同的不确定性</h3></div>'+badge('不把两种区间混成概率','model')+'</div>'+
 V3V.uncertainty(e,r,state.target)+
 '<div class="grid2"><div class="notice"><b>模型内随机性</b><p>在给定增长、波动和相关系数假设下，固定随机种子模拟出的P10—P90。不是现实置信区间。</p></div>'+
 '<div class="notice"><b>参数知识不足</b><p>将每年三产增长率统一上下调整1.5个百分点的三组假设边界。没有可靠概率权重，不做随机概率声明。</p></div></div>'+
 '<div class="research-kpi gap"><div><small>当前假设的蒙特卡洛P10—P90宽度</small><strong>'+money(r.total.p90-r.total.p10)+'亿</strong></div>'+
 '<div><small>假设整体±1.5pp形成的确定性边界宽度</small><strong>'+money(e.spread)+'亿</strong></div></div>'+
 '<p class="footnote">'+html(e.note)+' 二者不能相加当作“95%概率区间”。</p></section>';
}
function v3ServicePanel(){
 return '<section class="card gap"><h3>服务业内部不是一种速度</h3>'+
 '<div class="grid3"><div class="tile"><small>旅游综合收入</small><div class="big-num good">+19.1%</div><p>2025收入51.88亿元</p></div>'+
 '<div class="tile"><small>交通仓储邮政增加值</small><div class="big-num good">+5.1%</div><p>2025增加值13.14亿元</p></div>'+
 '<div class="tile"><small>金融业增加值</small><div class="big-num bad">-3.7%</div><p>2025增加值38.97亿元</p></div></div>'+
 '<div class="research-vintage gap">旅游综合收入是营业统计口径，不能与交通、金融的增加值直接求和；这些数字只能说明不同服务活动的方向不一。</div>'+v3Sources(['stat'])+'</section>';
}
function v3AgriculturePanel(){
 return '<section class="card gap"><h3>农业的真实生产量与价格/价值链，不是一回事</h3>'+
 '<div class="grid3"><div class="tile"><small>2025蔬菜产量</small><div class="big-num">118.07 <span style="font-size:13px">万吨</span></div><p>同比+2.7%</p></div>'+
 '<div class="tile"><small>2025肉类总产量</small><div class="big-num">9.46 <span style="font-size:13px">万吨</span></div><p>同比+2.8%</p></div>'+
 '<div class="tile"><small>2025粮食产量</small><div class="big-num">15.53 <span style="font-size:13px">万吨</span></div><p>基本持平</p></div></div>'+
 '<p class="footnote">2025农业增加值同比增长7.8%（不变价）。产量、价格、加工和销售分别有不同核算单位，不能据单个产品产量推算一产增加值或茶农净收入。</p>'+
 v3Sources(['stat'])+'</section>';
}


/* V4 evidence-structured analysis. Public observations are never equated to
   supplier purchases, and cross-county snapshots are not matched controls. */
function v4EvidenceLinks(keys){
 return '<div class="v3-provenance">'+keys.map(key=>'<a href="'+V4.S[key]+'" target="_blank" rel="noopener noreferrer">↗ '+
 html(({b2020:'2020博罗公报',b2021:'2021博罗公报',b2022:'2022博罗公报',b2023:'2023博罗公报',b2024:'2024博罗公报',b2025:'2025博罗公报',huicheng:'惠城公报',huiyang:'惠阳公报',huidong:'惠东公报',longmen:'龙门公报',industryNews:'产业主体公开报道'}[key]||key))+'</a>').join('')+'</div>';
}
function v4HistoryPanel(){
 const h=V4.history(v4Industry),selected=V4.INDUSTRIES.find(x=>x.id===v4Industry),first=h.data.find(x=>x.share!==null),last=h.data.slice().reverse().find(x=>x.share!==null);
 const metrics='<div class="research-tabs">'+[['shares','份额变化'],['rates','增速冷暖']].map(([key,name])=>'<button type="button" data-v4-metric="'+key+'" class="'+(v4Metric===key?'active':'')+'">'+name+'</button>').join('')+'</div>';
 const tabs='<div class="v4-industry-pills">'+V4.INDUSTRIES.map(x=>'<button type="button" data-v4-industry="'+x.id+'" class="'+(v4Industry===x.id?'active':'')+'">'+html(x.name)+'</button>').join('')+'</div>';
 const body=v4Metric==='shares'?V4V.industryHistory(v4Industry):V4V.industryHeatmap(v4Industry,'rates');
 return '<div class="grid2"><article class="panel"><h3>六年行业内部史，谁先退后进？</h3>'+tabs+metrics+body+
 '<div class="v4-selected-story"><div><span>选中行业</span><strong>'+html(selected.name)+'</strong></div>'+
 '<div><span>最早可核实份额</span><strong>'+first.year+' · '+decimal(first.share)+'%</strong></div>'+
 '<div><span>2025份额</span><strong>'+decimal(last.share)+'%</strong></div>'+
 '<div><span>份额净差异</span><strong class="'+(last.share-first.share>=0?'good':'gold')+'">'+sign(last.share-first.share)+' pp</strong></div></div>'+
 '<p class="footnote">'+html(h.warning)+'</p></article>'+
 '<article class="panel"><h3>行业×年份：不是缺一个数就补一个</h3>'+
 V4V.industryHeatmap(v4Industry,'shares')+
 '<h3 class="gap">企业规模结构：大型份额下降，小微份额上升</h3>'+V4V.sizeHistory()+
 '<div class="research-vintage gap">2020年大型企业增加值占比31.0%，小型+微型合计44.8%；2025年大型19.2%，小微56.8%。这是同类公开占比的描述比较，不是固定企业样本追踪。</div></article></div>'+
 '<details class="gap"><summary class="small"><b>2020—2025六份公报与可比性检查</b> · 点击查看</summary>'+
 V4.YEARS.map(y=>'<div class="source-item"><a href="'+V4.S[y.source]+'" target="_blank" rel="noopener noreferrer">'+y.year+'年博罗工业细分统计 ↗</a>'+
 '<span class="micro">'+html(y.note)+'</span></div>').join('')+'</details>';
}
function v4PeersPanel(){
 const comp=V4.compare(v4Peer);
 const chosen=comp.peer,shares=comp.shares.map(x=>x*100);
 return '<div class="grid2"><article class="panel"><h3>2025惠州五地三次产业结构坐标</h3>'+
 V4V.ternary(v4Peer)+
 '<div class="v4-peer-pills">'+V4.REGIONS.filter(x=>x.id!=='boluo').map(x=>'<button type="button" data-v4-peer="'+x.id+'" class="'+(v4Peer===x.id?'active':'')+'">'+x.name+'</button>').join('')+'</div>'+
 '<p class="footnote">'+html(comp.caveat)+'</p></article>'+
 '<article class="panel"><h3>博罗与'+html(chosen.name)+'：分别站在产业三角形什么位置？</h3>'+
 '<div class="research-kpi"><div><small>博罗2025现价GDP</small><strong>'+money(comp.boluo.gdp)+'亿</strong></div>'+
 '<div><small>'+html(chosen.name)+'现价GDP</small><strong>'+money(chosen.gdp)+'亿</strong></div>'+
 '<div><small>三产结构距离 √JSD</small><strong class="cyan">'+decimal(comp.jsDistance,3)+'</strong></div></div>'+
 V4V.compareBars(v4Peer)+
 '<div class="research-vintage gap">比较的是2025年结构占比，不是两地谁经济发展质量更高。距离采用三部门组成比例的Jensen-Shannon差异平方根，不能解释为贸易距离或价值流。</div>'+
 '<h3 class="gap">博罗相对其余四地合计结构的专业化LQ</h3>'+V4V.lq(comp)+
 '<div class="line-sep"></div>'+line(chosen.name+'实际GDP增速',decimal(chosen.realGrowth)+'%','')+
 line(chosen.name+'规上工业增速',decimal(chosen.industrialGrowth)+'%','')+
 line(chosen.name+'固定资产投资增速',chosen.investGrowth===null?'未核实':sign(chosen.investGrowth)+'%',chosen.investGrowth===null?'gold':'')+
 '<p class="footnote">未核实的指标保持空白；不以其他地区简单替代博罗经济结构的政策反事实。</p></article></div>'+
 '<div class="panel gap"><h3>四个地区距离博罗有多远？</h3>'+
 comp.distances.map(x=>'<div class="v4-distance"><span>'+x.name+'</span><div class="v4-distance-track"><i style="width:'+Math.min(100,x.distance/.45*100)+'%"></i></div>'+
 '<b>'+decimal(x.distance,3)+'</b></div>').join('')+
 '<p class="footnote">这里只衡量三次产业组成差异。作为县域的惠东、龙门和作为城区的惠城、惠阳有不同区域功能，不构成直接的因果对照组。</p></div>'+
 v4EvidenceLinks(['b2025','huicheng','huiyang','huidong','longmen']);
}
function v4DataPanel(){
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">V4 / HISTORICAL INDUSTRY & PEER STRUCTURE</div><h3>一条产业历史线 · 一个惠州比较坐标</h3></div>'+
 badge('2020—2025历史 + 2025横截面','real')+'</div>'+
 '<div class="research-tabs">'+[['history','六年工业内部史'],['peers','惠州五地结构坐标']].map(([key,name])=>
 '<button type="button" data-v4-lens="'+key+'" class="'+(v4Lens===key?'active':'')+'">'+name+'</button>').join('')+'</div>'+
 (v4Lens==='history'?v4HistoryPanel():v4PeersPanel())+'</section>';
}
function v4RetentionPanel(){
 const m=V4.retention({local:v4Local,va:v4VA,improve:v4Improve}),heat=V4V.retentionHeat(m);
 const sliders=[
 ['local','假设服务采购在本地的比例',v4Local,'%','0','100','5'],
 ['va','假设本地服务供应商增加值率',v4VA,'%','0','100','5'],
 ['improve','假设本地采购提升幅度',v4Improve,'个百分点','0',String(100-v4Local),'5']
 ];
 return '<section class="card research-feature gap"><div class="row wrap"><div><div class="eyebrow">LOCAL VALUE CAPTURE / IDENTIFICATION BOUNDARY</div><h3>制造业扩张，真正留在博罗的价值有多少？</h3></div>'+badge('规范化100单位 · 不是GDP','model')+'</div>'+
 '<div class="research-vintage">真实本地采购比例和服务供应商增加值率尚无可信的县域观测。现在先建立会计机制：假设每100单位制造企业专业服务采购支出，分别流向本地与外地。本图的“本地增加值”只由假设计算，不能冒充博罗实际统计。</div>'+
 '<div class="grid2 gap"><article class="panel"><h3>改变假设，观察本地留存</h3>'+
 sliders.map(([id,name,val,unit,min,max,step])=>'<div class="sliderrow"><label>'+name+' <output data-live-v4="'+id+'">'+val+unit+'</output></label>'+
 '<input type="range" data-v4-control="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></div>').join('')+
 '<div class="research-kpi gap"><div><small>本地服务采购支付</small><strong>'+decimal(m.localPay)+' 单位</strong></div>'+
 '<div><small>跨地区采购支付</small><strong>'+decimal(m.external)+' 单位</strong></div>'+
 '<div><small>本地服务增加值（假设）</small><strong class="cyan">'+decimal(m.added)+' 单位</strong></div>'+
 '<div><small>采购转移情景增量</small><strong class="gold">+'+decimal(m.delta)+' 单位</strong></div></div>'+
 '<p class="footnote">新增本地采购份额只是在固定服务采购预算下改动分配，不证明政策可直接实现，也不考虑资源约束、替代成本或重复核算。</p></article>'+
 '<article class="panel"><h3>这100单位假设采购，沿着谁流动？</h3>'+V4V.flow(m)+
 '<div class="notice gap"><b>部分识别：</b>若本地采购率未知，即使暂时固定增加值率为'+m.va+'%，本地服务增加值仅能落在0到'+decimal(m.trivialBounds[1])+'假设单位之间。没有实测采购额，无法得出县域总量。</div></article></div>'+
 '<div class="panel gap"><h3>121种采购结构：哪些组合才会出现高本地价值留存？</h3>'+heat+
 '<p class="footnote">图中横轴是本地采购百分比、纵轴是供应商增加值率，格内数值是每100假设采购单位中形成本地增加值的数量。点击格子更新条件；所有结果是会计恒等关系而不是从真实数据估计的产业网络模型。</p></div>'+
 '<div class="research-vintage gap">'+html(m.caution)+'</div></section>';
}
function v4ReadinessPanel(){
 const rows=V4.evidenceReadiness();
 return '<section class="card gap"><div class="row wrap"><div><div class="eyebrow">EVIDENCE & IDENTIFICATION GATE</div><h3>真实产业网络，已看到什么？关键还缺什么？</h3></div>'+badge('不推定未经证实的企业交易','warn')+'</div>'+
 '<div class="v4-evidence-grid">'+rows.map(x=>'<div class="v4-evidence"><div class="row wrap"><b>'+html(x.title)+'</b>'+badge(html(x.status),x.status.includes('缺失')?'warn':'real')+'</div>'+
 '<p><strong>现有：</strong>'+html(x.observable)+'</p>'+
 '<p><strong>还需：</strong>'+html(x.need)+'</p>'+
 '<p class="micro">'+html(x.reason)+'</p></div>').join('')+'</div>'+
 '<div class="line-sep"></div><h3>公开报道提及的产业主体 ≠ 真实采购关系</h3><div class="grid2">'+
 V4.ENTITY_CLUES.map(x=>'<div class="notice"><b>'+html(x.name)+'</b><p>'+html(x.observed)+'</p>'+
 '<p class="micro"><strong>待核：</strong>'+html(x.missing)+'</p></div>').join('')+'</div>'+
 '<div class="research-vintage gap">本研究数据集中，目前有2个公开点名的企业线索，但没有足够可靠的实际交易边可用于SNA。旧版500主体680边始终是合成网络，绝不能让用户误认为这两家真实企业与模拟节点发生了采购。</div>'+
 v4EvidenceLinks(['industryNews'])+'</section>';
}
function v4HomePanel(){
 return '<section class="grid3 gap"><div class="tile"><small>2020→2025 · 工业内部结构</small><div class="big-num cyan">24.2% → 23.2%</div><p>电子设备制造份额并非单调上升，2023年曾降到18.6%。</p>'+btn('go-data','查看六年行业曲线','tiny-btn')+'</div>'+
 '<div class="tile"><small>2020→2025 · 企业规模</small><div class="big-num gold">31.0% → 19.2%</div><p>大型企业增加值占比下降，不代表头部企业退出；需要识别规模分组变动。</p>'+btn('go-data','查看企业结构变化','tiny-btn')+'</div>'+
 '<div class="tile"><small>2025 · 惠州五地</small><div class="big-num cyan">54.6%</div><p>博罗第二产业GDP份额。与惠阳65%、惠城27.6%放在同一结构坐标对照。</p>'+btn('go-data','比较五地结构','tiny-btn')+'</div></section>';
}

function dataPage(r){
 const d=E.DATA;
 return heading('02 / EVIDENCE DESK','事实先钉牢，未知才好推演。',
 '数据划成 A/B/C 层，宏观基数不与合成企业关系混称。导入与导出本阶段不做，使用仓库既有公开信息和可复现合成样本。',
 btn('go-survey','继续：看模拟调查 ↗','primary'))+
 v4DataPanel()+
 '<details class="card gap"><summary><b>宏观三产历史与2024修订</b> · 点击展开</summary>'+historicalPanel()+'</details>'+
 v3PriceBridgePanel()+v3DataPanel()+
 '<details class="card gap"><summary><b>原版2025宏观清单与来源</b> · 点击展开</summary>'+ '<section class="stats">'+stat('2025 GDP',money(d.gdp)+' 亿','公开地区生产总值','cyan')+
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
 '<p class="footnote">有数字未验证、年份或口径变更时，应优先改事实基准，而不是用调整模型来掩盖冲突。</p></article></div></details>';
}
function surveyPage(r){
 const m=getSurvey();
 const path=(n)=>'<div class="metric-line"><span>'+n+'</span><b class="cyan">'+decimal(m.paths[n],3)+' <small class="muted">['+decimal(m.intervals[n][0],2)+', '+decimal(m.intervals[n][1],2)+']</small></b></div>';
 return heading('03 / SYNTHETIC FIELD SURVEY','真正算一次路径，而不是画几根箭头。',
 '固定随机种子合成问卷，改变样本规模并重新估计。演示的是“有调查数据后可以怎样检验机制”，不是博罗企业实测结论。',
 btn('go-models','下一站：多模型 ↗','primary'))+
 '<section class="stats">'+stat('合成企业问卷',m.n+' 份','可调样本数 · C级','cyan')+
 stat('重抽样','120 次','Bootstrap 百分位区间','')+
 stat('服务使用解释度',perc(m.r2.SU),'合成样本内 R²','')+
 stat('经营表现解释度',perc(m.r2.OP),'合成样本内 R²','')+'</section>'+
 '<div class="grid2"><article class="card"><h3>调查模型 · 双链关系</h3>'+surveyGraph(m)+''+
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
 '<div class="actions">'+btn('resample','换一个随机种子，再研究','secondary')+'</div></article></div>'+
 '<div class="grid2 gap"><article class="card"><h3>区分效度：HTMT诊断</h3>'+
 line('SA / SU',decimal(m.htmt.SA_SU,3),'')+
 line('SA / OP',decimal(m.htmt.SA_OP,3),'')+
 line('SU / OP',decimal(m.htmt.SU_OP,3),'')+
 line('经营表现模型两个解释构念的VIF',decimal(m.vifOP,3),'')+
 '<div class="research-vintage gap">HTMT根据合成问卷题项跨构念与构念内部相关性计算，VIF只适用于当前经营表现方程的两个构念。不能只看单一阈值就宣布量表有效，更不能冒充SmartPLS检验结果。</div></article>'+
 '<article class="card"><h3>样本内解释力 ≠ 留出样本预测能力</h3>'+
 '<div class="research-kpi"><div><small>80/20留出样本 · 训练 / 检验</small><strong>'+m.holdout.train+' / '+m.holdout.test+'</strong></div>'+
 '<div><small>测试集RMSE</small><strong>'+decimal(m.holdout.rmse,3)+'</strong></div>'+
 '<div><small>训练均值基准RMSE</small><strong>'+decimal(m.holdout.meanBaselineRMSE,3)+'</strong></div>'+
 '<div><small>相对均值基准预测得分</small><strong class="'+(m.holdout.skill<0?'bad':'cyan')+'">'+decimal(m.holdout.skill,3)+'</strong></div></div>'+
 '<div class="research-vintage gap">'+html(m.holdout.method)+'。该对照使用构念题项的均分与独立线性回归，不能称为PLSpredict或完成PLS-SEM的样本外验证。</div></article></div>';
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
 const net=R.networkStress({cut:cutCount,mode:cutMode}),m=getSurvey();
 return heading('04 / STRUCTURAL RESEARCH','真正的结构分析，不止画一张网。',
 '从可证伪的理论机制与变量测量开始，连接产业网络的实际计算、竞争性模型对照与条件敏感性。请始终区分真实历史和合成关系。',
 btn('go-wind','进入情景风洞 ↗','primary'))+
 '<section class="stats">'+
 stat('2020—2025现价GDP增长',money(R.describe().nominalTotal)+' 亿','真实历年现价数据的算术差分','cyan')+
 stat('合成企业主体',net.nodes+' 个','其中制造300 / 服务120 / 农业80','')+
 stat('合成网络连接',net.edges+' 条','有向采购/供货边，非实测','')+
 stat('问卷路径重抽样','120 次','探索性Mode-A PLS，合成问卷','')+'</section>'+
 hypothesisPanel()+v3QuestionPanel()+variablePanel()+v4RetentionPanel()+v4ReadinessPanel()+networkResearchPanel()+v3CascadePanel()+modelComparisonPanel(r)+backtestPanel()+v3MorrisPanel()+
 '<section class="grid2 gap"><article class="card"><h3>社会调查：为什么不能直接转成GDP？</h3>'+surveyGraph(m)+
 line('合成 SA→SU 路径',decimal(m.paths['SA→SU'],3),'')+
 line('合成 SA→OP 路径',decimal(m.paths['SA→OP'],3),'')+
 line('合成 SU→OP 路径',decimal(m.paths['SU→OP'],3),'')+
 '<p class="footnote">测量层是受访者对服务可得、使用及表现的题项。县域GDP是不同核算单位的汇总；若缺跨层机制和外部数据，绝不可将此路径系数乘GDP得到所谓政策效应。</p></article>'+
 '<article class="card"><h3>参数敏感性与研究可识别性</h3>'+sensitivityBars(E.sensitivity({...state,draws:850}))+
 '<div class="research-vintage gap">敏感性排序来自模型内的参数扰动，不等于变量已通过历史数据筛选，更不是因果影响排序。未来必须对照真实项目投产、采购流向、就业及价格指标才能识别机制。</div>'+
 '<div class="actions">'+btn('go-wind','改变产业条件，继续压测 ↗','primary')+'</div></article></section>';
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
 return '<div class="notice" style="margin-bottom:17px"><b>历史检验：</b>2020年二产份额50.0%，2025年54.6%；当前2030结构只是条件演示。2024年三产分项仍为初步统计，GDP已核实修订。'+btn('go-data','查看历史结构 ↗','tiny-btn')+'</div>'+ '<section class="stats">'+
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
 return v3ServicePanel()+'<div class="notice gap"><b>值得追问：</b>制造业产值增加，多少专业服务采购真正留在本地？当前没有真实采购网络可识别该比例。'+btn('go-models','打开每100单位采购的价值流实验','tiny-btn')+'</div>'+'<section class="stats">'+stat('2025第三产业增加值','349.00 亿','已公布的现价增加值','cyan')+
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
 return v3AgriculturePanel()+'<section class="stats">'+stat('2025农业增加值','107.44 亿','公开宏观基数','cyan')+
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
 return v3UncertaintyPanel(r)+modelComparisonPanel(r)+surfacePanel()+'<section class="stats">'+stat('条件抽样轨迹',money(r.samples)+' 条','固定随机种子可重现','cyan')+
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
 const content=page==='home'?home(current):page==='mission'?mission(current):page==='data'?dataPage(current):page==='survey'?surveyPage(current):page==='models'?modelsPage(current):page==='wind'?windPage(current):archivePage(current);
 const studyKey=page==='wind'?'wind'+view:page;
 const V5opts={studyTab:v5Tabs[studyKey],focus:v5Focus,cut:v5Cut};
 const V5ctx={state,r:current,sel:V5opts,survey:page==='survey'?getSurvey():null,tea:{receive:recv,pay,daily}};
 const insert=V5UI.studyPanel(studyKey,V5opts)+V5UI.deepPanel(studyKey,V5ctx);
 const closeHeader=content.indexOf('</header>');
 const expanded=v6Expanded[studyKey]===true;
 const v6Context={state,r:current,view,survey:V5ctx.survey,cut:v5Cut,local:v4Local,va:v4VA,improve:v4Improve,
   tea:V5ctx.tea,records:records.length,signalTopic:surveySignalTopic,sampleSize,seed:state.seed,
   surveyPressure,surveyMechanism,realSurveyFeed};
 const previousContent=closeHeader>=0?content.slice(closeHeader+9):content;
 stage.innerHTML=V6.headline(page,view)+V6.visual(page,v6Context)+
  '<details class="v6-depth" id="v6-depth" '+(expanded?'open':'')+'><summary><span class="v6-expand-icon">＋</span><span>更多图表与研究依据</span><small>按需查看详细数据、交互与方法边界</small></summary>'+
  '<div class="v6-depth-content">'+previousContent+insert+'</div></details>';
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
document.addEventListener('toggle',function(e){
 if(e.target&&e.target.id==='v6-depth'){
  const key=page==='wind'?'wind'+view:page;
  v6Expanded[key]=Boolean(e.target.open);
 }
},true);
document.addEventListener('click',function(e){
 const surveyMechanismButton=e.target.closest('[data-survey-mechanism]');if(surveyMechanismButton){
  surveyMechanism=surveyMechanismButton.dataset.surveyMechanism==='friction'?'friction':'expansion';draw();return;
 }
 const topic=e.target.closest('[data-survey-topic]');if(topic){surveySignalTopic=topic.dataset.surveyTopic;draw();return;}
 const v5tab=e.target.closest('[data-v5-tab]');if(v5tab){v5Tabs[v5tab.dataset.v5Page]=v5tab.dataset.v5Tab;draw();return;}
 const v5focus=e.target.closest('[data-v5-focus]');if(v5focus){v5Focus=v5focus.dataset.v5Focus;draw();return;}
 const v4lens=e.target.closest('[data-v4-lens]');if(v4lens){v4Lens=v4lens.dataset.v4Lens;draw();return;}
 const v4industry=e.target.closest('[data-v4-industry]');if(v4industry){v4Industry=v4industry.dataset.v4Industry;draw();return;}
 const v4metric=e.target.closest('[data-v4-metric]');if(v4metric){v4Metric=v4metric.dataset.v4Metric;draw();return;}
 const v4peer=e.target.closest('[data-v4-peer]');if(v4peer){v4Peer=v4peer.dataset.v4Peer;draw();return;}
 const v4heat=e.target.closest('[data-v4-heat]');if(v4heat){const x=v4heat.dataset.v4Heat.split(',').map(Number);if(x.length===2&&x.every(Number.isFinite)){v4Local=x[0];v4VA=x[1];v4Improve=Math.min(v4Improve,100-v4Local);draw();}return;}
 const filter=e.target.closest('[data-method-filter]');if(filter){methodFilter=filter.dataset.methodFilter;draw();return;}
 const v3lens=e.target.closest('[data-v3-lens]');if(v3lens){dataLens=v3lens.dataset.v3Lens;draw();return;}
 const v3industry=e.target.closest('[data-v3-industry]');if(v3industry){selectedIndustry=Number(v3industry.dataset.v3Industry);draw();return;}
 const v3conflict=e.target.closest('[data-v3-conflict]');if(v3conflict){selectedConflict=v3conflict.dataset.v3Conflict;draw();return;}
 const v3question=e.target.closest('[data-v3-question]');if(v3question){selectedQuestion=v3question.dataset.v3Question;selectedMechanism=0;draw();return;}
 const v3mechanism=e.target.closest('[data-v3-mechanism]');if(v3mechanism){selectedMechanism=Number(v3mechanism.dataset.v3Mechanism);draw();return;}
 const heat=e.target.closest('[data-heat]');if(heat){const vals=heat.dataset.heat.split(',').map(Number);if(vals.length===2&&vals.every(Number.isFinite)){state.knobs.manufacturing=vals[0];state.knobs.services=vals[1];draw();}return;}
 const historical=e.target.closest('[data-history]');if(historical){historyMode=historical.dataset.history;draw();return;}
 const variable=e.target.closest('[data-variable]');if(variable){selectedVariable=variable.dataset.variable;draw();return;}
 const service=e.target.closest('[data-service-node]');if(service){selectedNetworkNode=service.dataset.serviceNode;draw();return;}
 const viewButton=e.target.closest('[data-view]');if(viewButton){navigate('wind',Number(viewButton.dataset.view));return;}
 const p=e.target.closest('[data-page]');if(p){navigate(p.dataset.page);return;}
 const preset=e.target.closest('[data-preset]');if(preset){state.scenario=preset.dataset.preset;draw();return;}
 const action=e.target.closest('[data-action]');if(!action)return;
 const act=action.dataset.action,id=action.dataset.id;
 if(act==='calibration'){document.getElementById('calibrationContent').innerHTML=calibrationMarkup();overlay.hidden=false;document.body.style.overflow='hidden';return;}
 if(act==='close-calibration'){overlay.hidden=true;document.body.style.overflow='';return;}
 if(act==='survey-to-wind'){
  // A user-selected WHAT-IF parameter, never a calibrated OSINT effect.
  const key=({industry:'manufacturing',tourism:'services',talent:'talent',agriculture:'agriculture'})[surveySignalTopic];
  if(key&&Object.prototype.hasOwnProperty.call(E.EFFECTS,key)){
   const impact=surveyPressure*(surveyMechanism==='friction'?-1:1);
   state.knobs[key]=Math.max(-1,Math.min(1,impact));
   navigate('wind',({industry:1,tourism:2,talent:4,agriculture:3})[surveySignalTopic]);
  }return;
 }
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
 const pressure=e.target.closest('[data-survey-pressure]');if(pressure){
  surveyPressure=Math.max(-1,Math.min(1,Number(pressure.value)));draw();return;
 }
 const v5cut=e.target.closest('[data-v5-cut]');if(v5cut){v5Cut=Number(v5cut.value);draw();return;}
 const v4input=e.target.closest('[data-v4-control]');if(v4input){
 const value=Number(v4input.value);if(v4input.dataset.v4Control==='local'){v4Local=value;v4Improve=Math.min(v4Improve,100-v4Local);}
 if(v4input.dataset.v4Control==='va')v4VA=value;
 if(v4input.dataset.v4Control==='improve')v4Improve=value;
 draw();return;}
 const v3input=e.target.closest('[data-v3-control]');if(v3input){const key=v3input.dataset.v3Control;
 if(key==='domain')v3Domain=v3input.value;
 if(key==='cut')cascadeCut=Number(v3input.value);
 if(key==='mode')cascadeMode=v3input.value;
 if(key==='threshold')cascadeThreshold=Number(v3input.value);
 draw();return;}
 const research=e.target.closest('[data-research]');
 if(research){if(research.dataset.research==='cut')cutCount=Number(research.value);else cutMode=research.value;draw();return;}
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
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-variable], [data-service-node], [data-heat], [data-v3-industry], [data-v4-industry], [data-v4-peer], [data-v4-heat]')){e.preventDefault();e.target.click();}if(e.key==='Escape'&&!overlay.hidden){overlay.hidden=true;document.body.style.overflow='';}});
window.addEventListener('hashchange',()=>{
 const p=(location.hash||'#home').slice(1).split('/');
 if(p[0]==='wind'&&p[1]!==undefined&&Number.isInteger(Number(p[1])))view=Math.max(0,Math.min(5,Number(p[1])));
 draw();
});
const first=location.hash.slice(1).split('/');
if(first[0]==='wind'&&first[1])view=Math.max(0,Math.min(5,Number(first[1])||0));
draw();
// Real surveys are ingested as anonymized aggregates from a versioned same-origin
// feed. Pending state runs offline; no invented replies or required accounts.
if(typeof window.fetch==='function'){
 window.fetch('./data/survey-summary.json',{cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error('survey feed unavailable');return response.json();})
  .then(feed=>{
   const check=SurveyBridge.checkSurveyFeed(feed);
   if(check.ok){realSurveyFeed=feed;if(page==='survey')draw();}
  }).catch(()=>{/* optional feed: remain in the honest pending state */});
}
})();
