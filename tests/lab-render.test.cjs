'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../engine.js');
const R=require('../research-core.js');
globalThis.BoluoResearch=R;
const RV=require('../research-viz.js');
const V3=require('../research-v3.js');globalThis.BoluoV3=V3;
const V3V=require('../research-v3-viz.js');
const V4=require('../research-v4.js');globalThis.BoluoV4=V4;
const V4V=require('../research-v4-viz.js');
const Cards=require('../research-cards.js');globalThis.BoluoCards=Cards;
const Disc=require('../research-discovery.js');globalThis.BoluoDiscovery=Disc;
const Adapter=require('../research-adapter.js');globalThis.BoluoAdapter=Adapter;
const js=fs.readFileSync(path.resolve(__dirname,'../lab.js'),'utf8');
function boot(route){
 const nodes={};const listeners={};
 function element(id){if(!nodes[id])nodes[id]={innerHTML:'',textContent:'',style:{},hidden:true};return nodes[id];}
 const location={hash:'#'+route};
 const window={BoluoEngine:E,BoluoResearch:R,BoluoResearchViz:RV,BoluoV3:V3,BoluoV3Viz:V3V,BoluoV4:V4,BoluoV4Viz:V4V,BoluoCards:Cards,BoluoDiscovery:Disc,BoluoAdapter:Adapter,location,scrollTo(){},addEventListener(name,fn){listeners['win:'+name]=fn;}};
 const document={body:{style:{},classList:{toggle(){},remove(){}}},getElementById:element,querySelectorAll(){return [];},addEventListener(name,fn){listeners[name]=fn;}};
 const storage=new Map();
 const localStorage={getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);},removeItem(k){storage.delete(k);}};
 const ctx={window,location,document,localStorage,alert(){throw new Error('unexpected alert');}};
 vm.runInNewContext(js,ctx,{timeout:10000});
 return {nodes,listeners,location,window,document,stage:element('stage')};
}
test('eight workspaces all render non-empty HTML',()=>{
 for(const name of ['home','mission','data','survey','models','wind/0','archive','adapter']){
  const v=boot(name);
  assert.ok(v.stage.innerHTML.length>1000,name+' blank');
  assert.doesNotMatch(v.stage.innerHTML,/undefined|NaN/,'corrupt number or label on '+name);
 }
});
test('all six live wind-tunnel views render with proper headers',()=>{
 const names=['目标与现实','工业','专业服务','农业','情景与压力','行动跟踪'];
 for(let i=0;i<6;i++){
  const v=boot('wind/'+i);
  assert.ok(v.stage.innerHTML.includes(names[i]),'missing title '+i);
  assert.ok(v.stage.innerHTML.includes('data-view="'+i+'"'));
 }
});
test('calibration overlay opens and closes',()=>{
 const v=boot('home');
 v.listeners.click({target:{closest(sel){return sel==='[data-action]'?{dataset:{action:'calibration'}}:null;}}});
 assert.equal(v.nodes.calibrationOverlay.hidden,false);
 v.listeners.click({target:{closest(sel){return sel==='[data-action]'?{dataset:{action:'close-calibration'}}:null;}}});
 assert.equal(v.nodes.calibrationOverlay.hidden,true);
});
test('interactive control changes trigger new run ID and visible result',()=>{
 const v=boot('wind/0');
 const before=v.nodes.topRun.textContent;
 v.listeners.change({target:{closest(sel){return sel==='[data-set]'?{dataset:{set:'manufacturing'},value:'1'}:null;}}});
 const after=v.nodes.topRun.textContent;
 assert.notEqual(after,before);
 assert.ok(v.stage.innerHTML.includes('目标'));
});
test('research archive saves and reloads snapshot',()=>{
 const v=boot('archive');
 v.listeners.click({target:{closest(sel){return sel==='[data-action]'?{dataset:{action:'save'}}:null;}}});
 assert.ok(v.stage.innerHTML.includes('研究 1'));
 assert.ok(v.stage.innerHTML.includes('重开'));
});


test('historical chart switches between share, level and GDP revision view',()=>{
 const v=boot('data');
 assert.match(v.stage.innerHTML,/2024年原初步GDP/);
 const before=v.stage.innerHTML;
 v.listeners.click({target:{closest(sel){return sel==='[data-history]'?{dataset:{history:'gdp'}}:null;}}});
 assert.notEqual(v.stage.innerHTML,before);
 assert.match(v.stage.innerHTML,/GDP与修订/);
 assert.match(v.stage.innerHTML,/970.87/);
});
test('theory variable selection changes the visible evidence and identification warning',()=>{
 const v=boot('models');
 const original=v.stage.innerHTML;
 v.listeners.click({target:{closest(sel){return sel==='[data-variable]'?{dataset:{variable:'price'}}:null;}}});
 assert.notEqual(v.stage.innerHTML,original);
 assert.match(v.stage.innerHTML,/产业价格与折算指数/);
 assert.match(v.stage.innerHTML,/缺失该数据/);
});
test('network stress selector recalculates cut edges without repainting placeholders',()=>{
 const v=boot('models');
 const before=v.stage.innerHTML;
 v.listeners.change({target:{closest(sel){return sel==='[data-research]'?{dataset:{research:'cut'},value:'20'}:null;}}});
 const after=v.stage.innerHTML;
 assert.notEqual(after,before);
 assert.match(after,/20 个/);
 assert.match(after,/合成采购额失联/);
});
test('clicking a two-parameter heatmap cell really updates the simulation',()=>{
 const v=boot('wind/4');
 const before=v.nodes.topRun.textContent;
 v.listeners.click({target:{closest(sel){return sel==='[data-heat]'?{dataset:{heat:'1,1'}}:null;}}});
 assert.notEqual(v.nodes.topRun.textContent,before);
 assert.match(v.stage.innerHTML,/双变量压力面/);
});


test('V3 data microscope navigates four rich, measured evidence lenses',()=>{
 const v=boot('data');
 assert.match(v.stage.innerHTML,/增长速度 × 产业体量/);
 const before=v.stage.innerHTML;
 const lens=(key)=>v.listeners.click({target:{closest(sel){return sel==='[data-v3-lens]'?{dataset:{v3Lens:key}}:null;}}});
 lens('targets');assert.match(v.stage.innerHTML,/2025计划 vs 实际/);
 lens('signals');assert.match(v.stage.innerHTML,/跨系统公开信号/);
 lens('audit');assert.match(v.stage.innerHTML,/社零基期不一致/);
 assert.notEqual(before,v.stage.innerHTML);
});
test('V3 actual industry bubble selects the correct observed sector',()=>{
 const v=boot('data');
 v.listeners.click({target:{closest(sel){return sel==='[data-v3-industry]'?{dataset:{v3Industry:'2'}}:null;}}});
 assert.match(v.stage.innerHTML,/橡胶塑料/);
 assert.match(v.stage.innerHTML,/-4.2%/);
});
test('V3 hypothesis competition and second-order cut controls really update the model page',()=>{
 const v=boot('models');
 assert.match(v.stage.innerHTML,/FALSIFICATION LAB/);
 v.listeners.click({target:{closest(sel){return sel==='[data-v3-question]'?{dataset:{v3Question:'H3'}}:null;}}});
 assert.match(v.stage.innerHTML,/经济增长是否改善普通人收入/);
 v.listeners.change({target:{closest(sel){return sel==='[data-v3-control]'?{dataset:{v3Control:'threshold'},value:'1'}:null;}}});
 assert.match(v.stage.innerHTML,/失去1项服务/);
 assert.match(v.stage.innerHTML,/农业供应关联/);
});
test('V3 scenario page distinguishes shock variation from parameter uncertainty',()=>{
 const v=boot('wind/4');
 assert.match(v.stage.innerHTML,/两种完全不同的不确定性/);
 assert.match(v.stage.innerHTML,/参数知识不足/);
});


test('doctoral-method admission panel is filterable and forbids unsupported causal estimates',()=>{
 const v=boot('mission');
 assert.match(v.stage.innerHTML,/14种研究方法/);
 v.listeners.click({target:{closest(sel){return sel==='[data-method-filter]'?{dataset:{methodFilter:'证据不足'}}:null;}}});
 assert.match(v.stage.innerHTML,/双重差分DiD/);
 assert.doesNotMatch(v.stage.innerHTML,/蒙特卡洛压力/);
});
test('synthetic survey exposes measurement quality and honest holdout errors',()=>{
 const v=boot('survey');
 assert.match(v.stage.innerHTML,/HTMT诊断/);
 assert.match(v.stage.innerHTML,/经营表现模型两个解释构念的VIF/);
 assert.match(v.stage.innerHTML,/留出样本预测能力/);
 assert.match(v.stage.innerHTML,/不能称为PLSpredict/);
});


test('V4 industry history and missing-value heatmap render on data workspace',()=>{
 const v=boot('data');
 assert.match(v.stage.innerHTML,/六年行业内部史/);
 assert.match(v.stage.innerHTML,/份额变化/);
 v.listeners.click({target:{closest(sel){return sel==='[data-v4-industry]'?{dataset:{v4Industry:'power'}}:null;}}});
 assert.match(v.stage.innerHTML,/电力热力/);
 assert.match(v.stage.innerHTML,/缺测/);
 v.listeners.click({target:{closest(sel){return sel==='[data-v4-metric]'?{dataset:{v4Metric:'rates'}}:null;}}});
 assert.match(v.stage.innerHTML,/增速冷暖/);
 assert.match(v.stage.innerHTML,/30.4%/);
});
test('V4 same-city five-region composition graph uses grounded comparator and select',()=>{
 const v=boot('data');
 v.listeners.click({target:{closest(sel){return sel==='[data-v4-lens]'?{dataset:{v4Lens:'peers'}}:null;}}});
 assert.match(v.stage.innerHTML,/2025惠州五地三次产业结构坐标/);
 v.listeners.click({target:{closest(sel){return sel==='[data-v4-peer]'?{dataset:{v4Peer:'huicheng'}}:null;}}});
 assert.match(v.stage.innerHTML,/博罗与惠城/);
 assert.match(v.stage.innerHTML,/结构距离/);
 assert.match(v.stage.innerHTML,/1,203.3亿/);
});
test('V4 normalized local value model reacts to sliders and 121-case heatmap',()=>{
 const v=boot('models');
 assert.match(v.stage.innerHTML,/规范化100单位/);
 assert.match(v.stage.innerHTML,/真实本地采购比例和服务供应商增加值率尚无可信的县域观测/);
 v.listeners.change({target:{closest(sel){return sel==='[data-v4-control]'?{dataset:{v4Control:'local'},value:'70'}:null;}}});
 assert.match(v.stage.innerHTML,/70.0 单位/);
 v.listeners.click({target:{closest(sel){return sel==='[data-v4-heat]'?{dataset:{v4Heat:'50,50'}}:null;}}});
 assert.match(v.stage.innerHTML,/25.0 单位/);
 assert.match(v.stage.innerHTML,/data-v4-heat="50,50"/);
});
test('V4 public enterprise clues are separated from unverified purchase relations',()=>{
 const v=boot('models');
 assert.match(v.stage.innerHTML,/欣旺达/);
 assert.match(v.stage.innerHTML,/华通/);
 assert.match(v.stage.innerHTML,/没有足够可靠的实际交易边/);
});

test('dynamic research cards render across the existing workspaces',()=>{
 const home=boot('home');
 assert.match(home.stage.innerHTML,/动态研判台/);
 assert.match(home.stage.innerHTML,/1 : 5 : 4/);
 assert.match(home.stage.innerHTML,/不是三次产业增加值占比/);
 assert.match(home.stage.innerHTML,/已核实高等级预警/);
 assert.match(home.stage.innerHTML,/工业增长与投资下行同时出现/);
 for(const [route,needle] of [['data','证据冲突'],['models','真实企业关系图'],['wind/0','当前风洞总量对照线'],['archive','复盘机制']]){
  const v=boot(route);assert.ok(v.stage.innerHTML.includes(needle),route+' missing related card '+needle);
 }
});
test('research-card workflow state changes and survives redraw in the same browser',()=>{
 const v=boot('home');
 v.listeners.click({target:{closest(sel){return sel==='[data-card-status]'?{dataset:{cardId:'signal-industrial-investment',cardStatus:'investigating'}}:null;}}});
 assert.match(v.stage.innerHTML,/核查中/);
 assert.match(v.stage.innerHTML,/标记已核实/);
});
test('research-card filters and destinations are wired',()=>{
 const v=boot('home'),before=v.stage.innerHTML;
 v.listeners.click({target:{closest(sel){return sel==='[data-card-filter]'?{dataset:{cardFilter:'gap'}}:null;}}});
 assert.notEqual(v.stage.innerHTML,before);
 assert.match(v.stage.innerHTML,/制造企业本地服务采购关系尚不可测/);
 v.listeners.click({target:{closest(sel){return sel==='[data-card-open]'?{dataset:{cardOpen:'models',cardView:''}}:null;}}});
 assert.equal(v.location.hash,'#models');
});

test('V6 active discovery panel renders explainable candidates and safe local intake',()=>{
 const v=boot('home');
 assert.match(v.stage.innerHTML,/主动问题发现/);
 assert.match(v.stage.innerHTML,/工业产出与投资方向背离/);
 assert.match(v.stage.innerHTML,/竞争解释与反证条件/);
 assert.match(v.stage.innerHTML,/导入匿名汇总 CSV/);
 assert.match(v.stage.innerHTML,/不会上传/);
 assert.match(v.stage.innerHTML,/下载CSV模板/);
});
test('V6 discovery statuses, filters and destination links are wired',()=>{
 const v=boot('home');
 v.listeners.click({target:{closest(sel){return sel==='[data-discovery-status]'?{dataset:{discoveryId:'discovery-public-industrial-investment',discoveryStatus:'investigating'}}:null;}}});
 assert.match(v.stage.innerHTML,/核查中/);
 v.listeners.click({target:{closest(sel){return sel==='[data-discovery-filter]'?{dataset:{discoveryFilter:'anomaly'}}:null;}}});
 assert.match(v.stage.innerHTML,/这个分类暂时没有问题候选/);
 v.listeners.click({target:{closest(sel){return sel==='[data-discovery-open]'?{dataset:{discoveryOpen:'survey'}}:null;}}});
 assert.equal(v.location.hash,'#survey');
});

test('V7 adapter workspace renders as a visual research defense',()=>{
 const v=boot('adapter');
 assert.match(v.stage.innerHTML,/RESEARCH QUESTION/);
 assert.match(v.stage.innerHTML,/\+8\.7%/);
 assert.match(v.stage.innerHTML,/-18\.8%/);
 assert.match(v.stage.innerHTML,/全屏答辩模式/);
 assert.match(v.stage.innerHTML,/data-adapter-step="4"/);
 assert.doesNotMatch(v.stage.innerHTML,/数据审核台/);
});
test('V7 defense navigation reveals evidence, variable mapping and live model demo',()=>{
 const v=boot('adapter');
 const click=(selector,dataset)=>v.listeners.click({target:{closest(sel){return sel===selector?{dataset}:null;}}});
 click('[data-adapter-next]',{});
 assert.match(v.stage.innerHTML,/EVIDENCE REVIEW/);
 assert.match(v.stage.innerHTML,/先问数据/);
 click('[data-adapter-map-save]',{adapterMapSave:'public-2025-industrial'});
 assert.match(v.stage.innerHTML,/映射已保存/);
 click('[data-adapter-status]',{adapterId:'public-2025-industrial',adapterStatus:'已批准'});
 assert.match(v.stage.innerHTML,/已批准证据/);
 click('[data-adapter-next]',{});
 assert.match(v.stage.innerHTML,/VARIABLE MAPPING/);
 assert.match(v.stage.innerHTML,/RESEARCH VARIABLE/);
 click('[data-adapter-next]',{});
 assert.match(v.stage.innerHTML,/LIVE MODEL DEMO/);
 assert.match(v.stage.innerHTML,/运行模型/);
 v.listeners.input({target:{closest(sel){return sel==='[data-adapter-proposal-note]'?{value:'规上工业增速只作为当前状态证据，测试制造业条件变化对情景分布的影响。'}:null;}}});
 click('[data-adapter-run]',{});
 assert.match(v.stage.innerHTML,/同一随机种子/);
 assert.match(v.stage.innerHTML,/ad-hist-bars/);
 click('[data-adapter-next]',{});
 assert.match(v.stage.innerHTML,/FINDINGS & LIMITATIONS/);
 click('[data-adapter-save-proposal]',{});
 assert.match(v.stage.innerHTML,/情景提案已保存/);
 assert.match(v.stage.innerHTML,/情景提案 · 未应用/);
});
test('V7 model condition tabs and presentation mode are interactive',()=>{
 const v=boot('adapter');
 const click=(selector,dataset)=>v.listeners.click({target:{closest(sel){return sel===selector?{dataset}:null;}}});
 click('[data-adapter-step]',{adapterStep:'2'});
 assert.match(v.stage.innerHTML,/VARIABLE MAPPING/);
 click('[data-adapter-param]',{adapterParam:'project_delay'});
 assert.match(v.stage.innerHTML,/项目延期条件/);
 click('[data-adapter-presentation]',{});
 assert.match(v.stage.innerHTML,/退出演示/);
 assert.equal(v.document.body.classList.toggle!==undefined,true);
 v.listeners.keydown({key:'ArrowRight',target:{closest(){return null;}},preventDefault(){}});
 assert.match(v.stage.innerHTML,/LIVE MODEL DEMO/);
 v.listeners.keydown({key:'Escape',target:{closest(){return null;}},preventDefault(){}});
 assert.match(v.stage.innerHTML,/全屏答辩模式/);
});
