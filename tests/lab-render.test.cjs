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
const V5=require('../research-v5.js');globalThis.BoluoV5=V5;
const V5V=require('../research-v5-viz.js');globalThis.BoluoV5Viz=V5V;
const V5UI=require('../research-v5-ui.js');
const SurveyEvidence=require('../survey-evidence-v1.js');
const SurveyBridge=require('../survey-bridge-v1.js');globalThis.BoluoSurveyBridge=SurveyBridge;
const SurveyBridgeUI=require('../survey-bridge-ui-v1.js');
const V6=require('../presentation-v6.js');
const js=fs.readFileSync(path.resolve(__dirname,'../lab.js'),'utf8');
function boot(route){
 const nodes={};const listeners={};
 function element(id){if(!nodes[id])nodes[id]={innerHTML:'',textContent:'',style:{},hidden:true};return nodes[id];}
 const location={hash:'#'+route};
 const window={BoluoEngine:E,BoluoResearch:R,BoluoResearchViz:RV,BoluoV3:V3,BoluoV3Viz:V3V,BoluoV4:V4,BoluoV4Viz:V4V,BoluoV5:V5,BoluoV5Viz:V5V,BoluoV5UI:V5UI,BoluoSurveyEvidence:SurveyEvidence,BoluoSurveyBridge:SurveyBridge,BoluoSurveyBridgeUI:SurveyBridgeUI,BoluoPresentationV6:V6,location,scrollTo(){},addEventListener(name,fn){listeners['win:'+name]=fn;}};
 const document={body:{style:{}},getElementById:element,querySelectorAll(){return [];},addEventListener(name,fn){listeners[name]=fn;}};
 const storage=new Map();
 const localStorage={getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}};
 const ctx={window,location,document,localStorage,alert(){throw new Error('unexpected alert');}};
 vm.runInNewContext(js,ctx,{timeout:10000});
 return {nodes,listeners,location,window,document,stage:element('stage')};
}
test('seven workspaces all render non-empty HTML',()=>{
 for(const name of ['home','mission','data','survey','models','wind/0','archive']){
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


test('V5 research contract is available in seven workspaces and six wind views',()=>{
 for(const route of ['home','mission','data','survey','models','archive',...Array.from({length:6},(_,i)=>'wind/'+i)]){
  const v=boot(route);
  assert.match(v.stage.innerHTML,/RESEARCH CONTRACT/,route);
  assert.match(v.stage.innerHTML,/研究对象|研究问题|产业结构|预测|模型/,route);
  assert.match(v.stage.innerHTML,/v5-deep/,route);
  assert.doesNotMatch(v.stage.innerHTML,/NaN|Infinity|undefined/,route);
 }
});
test('V5 question-identification-falsification tabs change actual research content',()=>{
 const v=boot('mission');
 const a=v.stage.innerHTML;
 v.listeners.click({target:{closest(sel){return sel==='[data-v5-tab]'?{dataset:{v5Page:'mission',v5Tab:'falsify'}}:null;}}});
 assert.notEqual(v.stage.innerHTML,a);
 assert.match(v.stage.innerHTML,/什么会推翻当前解释/);
 assert.match(v.stage.innerHTML,/替代解释/);
});
test('V5 hypothesis selection in home explains alternative mechanisms',()=>{
 const v=boot('home');
 v.listeners.click({target:{closest(sel){return sel==='[data-v5-focus]'?{dataset:{v5Focus:'H4'}}:null;}}});
 assert.match(v.stage.innerHTML,/工业扩张与绿色效率/);
 assert.match(v.stage.innerHTML,/技术效率改善/);
});
test('V5 synthetic network adversarial compare recalculates on cut change',()=>{
 const v=boot('models');
 assert.match(v.stage.innerHTML,/随机失效对照/);
 v.listeners.change({target:{closest(sel){return sel==='[data-v5-cut]'?{value:'20'}:null;}}});
 assert.match(v.stage.innerHTML,/20个/);
 assert.match(v.stage.innerHTML,/二阶受影响制造主体/);
});
test('V5 wind views each have purpose-specific calculations',()=>{
 const expect=[
 ['wind/0','仅此产业承担目标后的反解点'],
 ['wind/1','2025工业增长8.7%'],
 ['wind/2','本地增加值'],
 ['wind/3','账期错配'],
 ['wind/4','网格覆盖率'],
 ['wind/5','模型响应']
 ];
 for(const [route,word] of expect){
  const v=boot(route);
  assert.ok(v.stage.innerHTML.includes(word),route+' lacks '+word);
 }
});
test('V5 archives show evidence gates and note non-immutable local storage',()=>{
 const v=boot('archive');
 assert.match(v.stage.innerHTML,/顶级研究的终点/);
 assert.match(v.stage.innerHTML,/尚缺实证/);
 assert.match(v.stage.innerHTML,/localStorage/);
});


test('visual-first survey separates synthetic ordinal scenarios from unobserved real attitudes',()=>{
 const v=boot('survey');
 assert.match(v.stage.innerHTML,/公开世界有什么迹象/);
 assert.match(v.stage.innerHTML,/群体真实倾向/);
 assert.match(v.stage.innerHTML,/未测量/);
 assert.match(v.stage.innerHTML,/真实问卷/);
 assert.match(v.stage.innerHTML,/0 <small>份/);
 assert.match(v.stage.innerHTML,/更多图表与研究依据/);
 assert.match(v.stage.innerHTML,/HTMT诊断/); // previous survey computations remain available, collapsed
});
test('switching public evidence topics shows independent source lineage and unknowns',()=>{
 const v=boot('survey');
 v.listeners.click({target:{closest(sel){return sel==='[data-survey-topic]'?{dataset:{surveyTopic:'agriculture'}}:null;}}});
 assert.match(v.stage.innerHTML,/网上较少发声的农户/);
 assert.match(v.stage.innerHTML,/没有可核验的公开材料|尚无可核验/);
 v.listeners.click({target:{closest(sel){return sel==='[data-survey-topic]'?{dataset:{surveyTopic:'tourism'}}:null;}}});
 assert.match(v.stage.innerHTML,/游客人次同比/);
 assert.match(v.stage.innerHTML,/媒体引述平台数据/);
});
test('V6 lead is graphical-first, old quantitative detail is preserved inside disclosure',()=>{
 for(const route of ['home','data','models','wind/0','wind/2','wind/3','wind/4','archive']){
  const v=boot(route);
  assert.match(v.stage.innerHTML,/v6-lead/,route);
  assert.match(v.stage.innerHTML,/v6-depth-content/,route);
  assert.match(v.stage.innerHTML,/v5-study-strip/,route);
 }
});


test('V7 dual-track survey controls modify scenario and retain zero real responses',()=>{
 const v=boot('survey');
 assert.match(v.stage.innerHTML,/可运行：情景与合成分群/);
 assert.match(v.stage.innerHTML,/未来调查校验/);
 assert.match(v.stage.innerHTML,/真实问卷尚未接入/);
 const original=v.stage.innerHTML;
 v.listeners.click({target:{closest(sel){return sel==='[data-survey-mechanism]'?{dataset:{surveyMechanism:'friction'}}:null;}}});
 assert.notEqual(original,v.stage.innerHTML);
 assert.match(v.stage.innerHTML,/class="active" data-survey-mechanism="friction"/);
 v.listeners.change({target:{closest(sel){return sel==='[data-survey-pressure]'?{value:'0.8'}:null;}}});
 assert.match(v.stage.innerHTML,/value="0.8"/);
 assert.match(v.stage.innerHTML,/真实问卷尚未接入/);
});
test('V7 user-triggered transfer sends SCENARIO condition into a specific wind view',()=>{
 const v=boot('survey');
 v.listeners.click({target:{closest(sel){return sel==='[data-survey-mechanism]'?{dataset:{surveyMechanism:'friction'}}:null;}}});
 v.listeners.change({target:{closest(sel){return sel==='[data-survey-pressure]'?{value:'0.6'}:null;}}});
 v.listeners.click({target:{closest(sel){return sel==='[data-action]'?{dataset:{action:'survey-to-wind'}}:null;}}});
 assert.match(v.location.hash,/#wind\/1/);
 assert.match(v.stage.innerHTML,/风洞|制造业|产业|工业/);
});
