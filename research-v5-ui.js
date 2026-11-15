/* V5 research UX: one cognitive task per page, with expandable doctoral-style review.
   This is a renderer; controls are wired by lab.js. */
(function(root){
'use strict';
const D=root.BoluoV5,V=root.BoluoV5Viz,E=root.BoluoEngine,R=root.BoluoResearch,V3=root.BoluoV3,V4=root.BoluoV4,V4V=root.BoluoV4Viz;
if(!D||!V)return;
const esc=x=>String(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const f=(x,d=1)=>Number(x).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const n=x=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1});
const txt=(t,label)=>'<span class="v5-tag">'+esc(label||t)+'</span>';
const item=(label,value)=>'<div class="v5-value-item"><span>'+esc(label)+'</span><b>'+value+'</b></div>';
const note=text=>'<p class="v5-warning">'+esc(text)+'</p>';
function studyPanel(key,opts={}){
 const d=D.STUDIES[key];if(!d)return '';
 const t=['question','design','falsify'].includes(opts.studyTab)?opts.studyTab:'question';
 const tab=[['question','核心问题'],['design','研究对象与机制'],['falsify','反证条件']];
 const body=t==='question'?
  '<div><strong>'+esc(d.question)+'</strong><p>研究对象：'+esc(d.unit)+'。当前证据边界：'+esc(d.tier)+'。</p></div>':
 t==='design'?
  '<div><strong>要估计什么？</strong><p>'+esc(d.estimand)+'</p><p>候选机制：'+esc(d.mechanism)+'</p></div>':
  '<div><strong>什么会推翻当前解释？</strong><p>'+esc(d.falsify)+'</p><p>替代解释：'+esc(d.rival)+'</p><p>优先缺口：'+esc(d.gap)+'</p></div>';
 return '<section class="v5-study-strip" aria-label="本页研究设计"><div class="v5-study-top">'+
 '<span class="v5-study-label">'+esc(d.id)+' / '+esc(d.name)+' · RESEARCH CONTRACT</span>'+
 '<div class="v5-study-tabs">'+tab.map(([k,label])=>'<button type="button" data-v5-tab="'+k+'" data-v5-page="'+key+'" class="'+(k===t?'active':'')+'">'+label+'</button>').join('')+'</div></div>'+
 '<div class="v5-study-body">'+body+'</div></section>';
}
function home(ctx){
 const {state,r,sel}=ctx,p=D.targetStudy(state),h=D.historyDiagnostics(),list=V3.HYPOTHESES;
 const pick=list.find(x=>x.id===sel.focus)||list[0];
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">研究总论 / COMPETING EXPLANATIONS</div><h3>“突破千亿”只是现象，哪条解释更接近真实？</h3></div>'+txt('V5','研究问题不是结论')+'</div>'+
 '<div class="v5-thesis-buttons">'+list.map(x=>'<button type="button" data-v5-focus="'+x.id+'" class="'+(pick.id===x.id?'active':'')+'">'+x.id+' '+esc(x.title)+'</button>').join('')+'</div>'+
 '<div class="grid2 gap"><div class="v5-insight-hero"><span>已观察结构变化</span><strong>'+f(h.industryPP)+' <small>pp</small></strong>'+
 '<p>2020—2025第二产业份额净变化。不能单凭比例证明产业升级。</p></div>'+
 '<div class="v5-insight-hero"><span>2025→'+state.year+'总量的算术门槛</span><strong>'+f(p.required*100,2)+'<small>% / 年</small></strong>'+
 '<p>达到'+n(state.target)+'亿元所需的名义复合增幅，不是现实成功概率。</p></div></div>'+
 '<div class="v5-hypothesis-focus"><strong>'+esc(pick.title)+'</strong><p>'+esc(pick.facts.join(' · '))+'</p>'+
 '<div class="v5-pills">'+pick.rival.map(x=>txt(x)).join('')+'</div>'+
 '<p class="micro">反证：'+esc(pick.falsifier)+'</p></div>'+
 '<details><summary><b>为什么高增长、结构升级、价值留存和生活福利必须分别检验？</b></summary>'+
 '<p class="footnote">GDP增长是地区增加值的总量描述；产业占比变化是组成变化；企业采购属地决定本地连接的一部分；居民福利又受收入分配、就业和价格影响。四者可以相关，却没有天然的因果换算系数。需要逐层提出竞争机制。</p></details></section>';
}
function mission(ctx){
 const quality=D.assurance(),obs=D.sourceLedger();
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">PREREGISTRATION / ESTIMAND → IDENTIFICATION</div><h3>真正的博士研究先定义要识别什么，再选择方法</h3></div>'+txt('设计','四个研究闸门')+'</div>'+
 '<div class="v5-method-steps">'+[
 ['01 提出可证伪命题','不要用2025结果倒推最有利的理论解释'],
 ['02 明确观测单位','县区/年度、企业/交易、行业/年份不能混成一个样本'],
 ['03 指定竞争机制','外需、价格、企业样本、项目时滞和政策都可能同时作用'],
 ['04 说明识别失败','无可信外生变动及对照时，只能做描述与情景推演']
 ].map(x=>'<div><b>'+esc(x[0])+'</b><p>'+esc(x[1])+'</p></div>').join('')+'</div>'+
 '<details><summary><b>研究数据实物清单：有多少是真实观察？</b></summary>'+
 '<div class="v5-ledger">'+obs.map(x=>'<div><b>'+esc(x.name)+'</b><span>'+esc(x.level)+' · '+x.count+'个观测单元</span><small>'+esc(x.issue)+'</small></div>').join('')+'</div>'+
 note('观测单元不是统计独立样本数。年度六个观测值不能充当企业600个独立观察。')+'</details>'+
 '<details><summary><b>论文答辩式追问：为什么现在不能运行DiD、IV和真实投入产出网络？</b></summary>'+
 '<p class="footnote">目前没有可信的处理组和控制组、外生冲击、前趋势、网络采购边及价格口径。技术上写得出估计器，不代表存在可识别的估计对象。可信研究允许结论是“尚不可识别”。</p></details></section>';
}
function data(ctx){
 const h=D.historyDiagnostics(),delta=h.rows;
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">DESCRIPTIVE DIAGNOSTICS / COMPOSITIONAL CHANGE</div><h3>结构变化的第二层：集中度、均衡度与转折脆弱性</h3></div>'+txt('公开统计','2020—2025')+'</div>'+
 '<div class="grid2 gap"><article class="panel"><h3>宽口径三次产业的熵与HHI</h3>'+V.entropy(h)+
 '<div class="v5-mini-facts">'+item('熵变化',f(h.changeEntropy,3))+item('HHI变化',f(h.changeHHI,3))+'</div></article>'+
 '<article class="panel"><h3>不等于线性增长：电子设备制造份额的年度拐点</h3>'+
 '<div class="v5-shifts">'+h.shifts.map(x=>'<div><span>'+x.from+'→'+x.to+'</span>'+
 '<i style="width:'+Math.min(50,Math.abs(x.pp)/6*50)+'%;'+(x.pp<0?'right:50%;background:#e3a276':'left:50%;background:#66c7e7')+'"></i>'+
 '<b class="'+(x.pp<0?'gold':'good')+'">'+(x.pp>0?'+':'')+f(x.pp)+' pp</b></div>').join('')+'</div>'+
 '<div class="v5-mini-facts">'+item('2020—2025二产份额净变化',f(h.industryPP)+'pp')+
 item('2020—2025三产份额净变化',f(h.servicePP)+'pp')+'</div>'+
 '<p class="footnote">电子设备份额的改变涉及行业相对规模，不能单独识别技术升级，也不能推断某家企业投资或退出。</p></article></div>'+
 '<details><summary><b>研究方法：为什么三次产业HHI与企业集中度不是一回事？</b></summary>'+
 note(h.warning)+'</details></section>';
}
function survey(ctx){
 const m=ctx.survey||E.survey({...ctx.state,sampleSize:150}),q=D.surveyReview(m);
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">MEASUREMENT MODEL / VALIDITY vs PREDICTION</div><h3>不应只问路径有多大，还要问题项是否真的测到了构念</h3></div>'+txt('合成问卷','禁止实证推广')+'</div>'+
 '<div class="research-kpi">'+
 '<div><small>提示性测量指标符合规则</small><strong>'+q.green+' / '+q.total+'</strong></div>'+
 '<div><small>合成样本数量</small><strong>'+m.n+'</strong></div>'+
 '<div><small>bootstrap次数</small><strong>'+m.bootstrap+'</strong></div></div>'+
 V.quality(q)+
 '<details><summary><b>质量标准怎样用于论文，而不是颜色打分？</b></summary>'+
 '<p class="footnote">应根据反映式/形成式测量类型分别评估题项载荷、信度、AVE、HTMT区间、VIF和预测误差。当前合成Mode-A算法尚未与SmartPLS等价验证，也没有真实调查抽样框、无响应偏差和共同方法偏差检查；不可仅靠五项提示指标自称量表成立。</p></details></section>';
}
function models(ctx){
 const cut=Number.isFinite(ctx.sel.cut)?ctx.sel.cut:10,n=D.networkTrial(cut);
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">ADVERSARIAL SNA / ATTACK VS CONTROL</div><h3>谁是关键节点？必须和随机失效对照，而非只展示断开的那一张图</h3></div>'+txt('合成关系','500主体 · 680边')+'</div>'+
 '<div class="research-switch"><label>一次移除服务主体</label><select class="select" data-v5-cut>'+
 [0,3,5,10,20,30].map(x=>'<option value="'+x+'" '+(x===cut?'selected':'')+'>'+x+'个</option>').join('')+'</select></div>'+
 V.pairedNetworks(n)+
 '<div class="research-kpi">'+
 '<div><small>高采购额优先策略失联额</small><strong>'+f(n.targeted.cutValue,1)+' <small>百万元</small></strong></div>'+
 '<div><small>随机策略失联额</small><strong>'+f(n.random.cutValue,1)+' <small>百万元</small></strong></div>'+
 '<div><small>二阶受影响制造主体（高额策略）</small><strong>'+n.cascadeTargeted.manufacturersImpaired+'</strong></div>'+
 '<div><small>二阶受影响制造主体（随机策略）</small><strong>'+n.cascadeRandom.manufacturersImpaired+'</strong></div></div>'+
 note(n.note)+
 '<details><summary><b>方法缺陷：度中心性、介数和替代供应商为什么都重要？</b></summary>'+
 '<p class="footnote">本实验按合成采购额识别节点，并非求得真实经济中最具系统重要性的企业。真实网络还需边方向、权重、供需可替代程度、社区间桥接节点和时间变化。没有企业采购边，不应该输出真实SNA中心性排名。</p></details></section>';
}
function wind0(ctx){
 const x=D.targetStudy(ctx.state);
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">SECTOR FEASIBILITY / BUDGET IDENTITY</div><h3>如果只靠一个产业，追赶1600亿需要多高名义增长？</h3></div>'+txt('条件反解','非政策预测')+'</div>'+
 '<div class="research-kpi"><div><small>'+x.year+'目标所需总量名义复合增幅</small><strong>'+f(x.required*100,2)+'%</strong></div>'+
 '<div><small>当前确定性条件路径</small><strong>'+n(x.overall)+'亿</strong></div>'+
 '<div><small>距目标的条件差额</small><strong class="'+(x.baselineGap>=0?'good':'bad')+'">'+f(x.baselineGap,1)+'亿</strong></div></div>'+
 V.feasibility(x)+note(x.caution)+'</section>';
}
function wind1(ctx){
 const h=D.historyDiagnostics(),recent=V4.YEARS[5],old=V4.YEARS[0];
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">INDUSTRIAL GROWTH / RIVAL EXPLANATIONS</div><h3>2025工业增长8.7%，五个行业并不是一起增长</h3></div>'+txt('真实产业事实','非行业因果贡献')+'</div>'+
 '<div class="v5-industrial-table"><div><b>行业</b><b>2020份额</b><b>2025份额</b><b>2025增长</b></div>'+
 V4.INDUSTRIES.map((item,i)=>'<div><span>'+esc(item.name)+'</span><span>'+(old.shares[i]===null?'未披露':f(old.shares[i])+'%')+
 '</span><span>'+f(recent.shares[i])+'%</span><b class="'+(recent.rates[i]<0?'bad':'good')+'">'+(recent.rates[i]>0?'+':'')+f(recent.rates[i])+'%</b></div>').join('')+'</div>'+
 '<div class="v5-hypothesis-focus"><b>最值得压力测试的解释</b><p>产能利用率、项目投产时间差、外需和规上企业名录调整，均可能造成“投资在降、工业在涨”。目前没有将这些机制分别识别的真实时序数据。</p></div>'+
 '<details><summary><b>怎样构建真正的工业因果研究？</b></summary><p class="footnote">需要行业×企业×时间面板，逐项目开工/试产/达产日期，行业价格、订单来源与企业进出记录。应定义估计对象、对照设计和外部冲击，且控制预趋势或事件选择，而不是将行业当年增长机械投射到未来。</p></details></section>';
}
function wind2(ctx){
 const x=V4.retention({local:30,va:35,improve:20});
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">VALUE CAPTURE / PARTIAL IDENTIFICATION</div><h3>制造业买了100单位专业服务，不等于100单位留在本地</h3></div>'+txt('假设数值','缺真实采购额')+'</div>'+
 '<div class="grid2 gap"><div class="v5-insight-hero"><span>演示：30%本地采购 × 35%供应商增加值率</span><strong>'+f(x.added)+' <small>单位</small></strong>'+
 '<p>这是每100单位假设采购支出中的本地增加值，不是博罗GDP。</p></div>'+
 '<div class="v5-insight-hero"><span>缺少实测本地采购率时</span><strong>0–35 <small>单位</small></strong>'+
 '<p>甚至在固定增加值率35%的假设下，也只能给出极宽的部分识别边界。</p></div></div>'+
 '<details><summary><b>必须避免的三个跨层推断</b></summary><p class="footnote">不能将本地采购的账面收入等于本地增加值；不能从产业增加值倒推跨县购买金额；不能将合成服务网络失联额等于实际GDP损失。完整交互价值流在04多模型实验室。</p></details></section>';
}
function wind3(ctx){
 const x=D.teaTrial(ctx.tea.receive,ctx.tea.pay,ctx.tea.daily);
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">SEASONAL LIQUIDITY / MULTI-SCENARIO</div><h3>柏塘春茶25天收获季，为什么可能形成63天账期错配？</h3></div>'+txt('独立现金流模型','不接GDP')+'</div>'+
 '<div class="research-kpi">'+
 '<div><small>春茶集中采摘窗口（机制假设）</small><strong>25天</strong></div>'+
 '<div><small>当前演示账期错配</small><strong>'+x.baseline.gap+'天</strong></div>'+
 '<div><small>当前演示资金占用</small><strong>'+n(x.baseline.money)+'万元</strong></div></div>'+
 V.teaDays(x)+note(x.note)+
 '<details><summary><b>现金流模型缺什么，才能用真实账本检验？</b></summary>'+
 '<p class="footnote">至少需要订单分日、农户付款分日、渠道回款、库存占用、授信、退货和应收账款实际回收曲线。固定日均垫资的账期乘法只回答一个简化机制，不等于春茶季的峰值现金缺口。</p></details></section>';
}
function wind4(ctx){
 const t=D.targetStudy(ctx.state),m=D.rivalCompare(ctx.state);
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">RED TEAM / ROBUSTNESS FRONTIER</div><h3>在81个允许的工业×服务参数组合中，多少个跨过门槛？</h3></div>'+txt('设计覆盖率','绝非预测概率')+'</div>'+
 '<div class="research-kpi"><div><small>达到目标的网格格子</small><strong>'+t.cellsPass+' / '+t.gridCells+'</strong></div>'+
 '<div><small>网格覆盖率（非概率）</small><strong>'+f(t.gridCoverage*100,1)+'%</strong></div>'+
 '<div><small>极端低组合</small><strong>'+n(t.worst.value)+'亿</strong></div>'+
 '<div><small>极端高组合</small><strong>'+n(t.best.value)+'亿</strong></div></div>'+
 V.modelVotes(m)+
 '<div class="v5-hypothesis-focus"><b>'+(m.disagreement?'模型对目标判断存在方向性分歧':'当前四种机制的目标方向暂时一致')+'</b>'+
 '<p>'+esc(m.message)+'</p></div>'+note(t.caution)+
 '<details><summary><b>哪些情况应当拒绝给出“达标概率”？</b></summary>'+
 '<p class="footnote">缺参数经验分布、统计修订一致口径、历史外部验证和模型选择先验时，随机模拟的“成功百分比”只是条件频率。网格覆盖率受参数上下界和选格间距影响，不能伪装为真实政策概率。</p></details></section>';
}
function wind5(ctx){
 const s=E.sensitivity({...ctx.state,draws:500}),map={
 manufacturing:'按行业核对产能利用率、企业扩张和真实订单',
 services:'企业服务采购流向、当地供应商增加值率',
 agriculture:'分产品产量、季节性价格、加工与农户收益',
 talent:'技能岗位空缺、企业招聘与通勤负担',
 project_delay:'逐项目建设—试产—达产时间序列'
 };
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">VALUE OF INFORMATION / VERIFY FIRST</div><h3>下一份值得补的证据：优先核实会改变结论的条件</h3></div>'+txt('核验顺序','不是政策清单')+'</div>'+
 '<div class="v5-evidence-priority">'+s.slice(0,5).map((x,i)=>'<div><span>'+String(i+1).padStart(2,'0')+'</span><div><b>'+esc(x.name)+'</b>'+
 '<small>'+esc(map[x.key]||'对应真实口径与外部证据')+'</small></div>'+
 '<strong>模型响应 '+n(x.span)+'亿</strong></div>').join('')+'</div>'+
 '<div class="v5-hypothesis-focus"><b>重要区分</b><p>这个排序按既有模型的参数敏感度排列，只表示“在假设模型中改变它，结果变化较大”。它不是信息价值的正式期望值（EVSI）、不是政策因果收益，也不保证现实数据最容易取得。</p></div></section>';
}
function archive(ctx){
 const d=D.assurance(),ok=d.filter(x=>x.status==='已编码').length,unknown=d.length-ok;
 return '<section class="card v5-deep"><div class="row wrap"><div><div class="eyebrow">REPRODUCIBILITY / RESEARCH AUDIT</div><h3>顶级研究的终点：别人能复算、能质疑，也能指出失败条件</h3></div>'+txt('本地快照','非不可篡改归档')+'</div>'+
 '<div class="research-kpi"><div><small>已编码并有部分自动化检查</small><strong>'+ok+' / '+d.length+'</strong></div>'+
 '<div><small>仍需外部证据或后端</small><strong class="gold">'+unknown+'</strong></div>'+
 '<div><small>当前抽样种子</small><strong>'+ctx.state.seed+'</strong></div>'+
 '<div><small>当前输入指纹</small><strong>'+esc(ctx.r.runId)+'</strong></div></div>'+
 V.gateMap(d)+
 '<details><summary><b>复现声明与严格限制</b></summary>'+
 '<p class="footnote">GitHub源码与自动测试可以检查当前代码的重复运行，浏览器localStorage保存输入快照；但还没有经第三方核验的数据版本哈希、不可篡改档案、真实微观数据许可与跨统计软件结果一致性。不能把本地保存按钮称为论文级科研数据管理系统。</p></details></section>';
}
function deepPanel(key,ctx){
 switch(key){
  case 'home':return home(ctx);
  case 'mission':return mission(ctx);
  case 'data':return data(ctx);
  case 'survey':return survey(ctx);
  case 'models':return models(ctx);
  case 'wind0':return wind0(ctx);
  case 'wind1':return wind1(ctx);
  case 'wind2':return wind2(ctx);
  case 'wind3':return wind3(ctx);
  case 'wind4':return wind4(ctx);
  case 'wind5':return wind5(ctx);
  case 'archive':return archive(ctx);
  default:return '';
 }
}
root.BoluoV5UI={studyPanel,deepPanel};
if(typeof module!=='undefined'&&module.exports)module.exports=root.BoluoV5UI;
})(typeof window!=='undefined'?window:globalThis);
