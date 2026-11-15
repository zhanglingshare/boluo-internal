'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../engine.js');
const R=require('../research-core.js');
globalThis.BoluoResearch=R;
const RV=require('../research-viz.js');
const js=fs.readFileSync(path.resolve(__dirname,'../lab.js'),'utf8');
function boot(route){
 const nodes={};const listeners={};
 function element(id){if(!nodes[id])nodes[id]={innerHTML:'',textContent:'',style:{},hidden:true};return nodes[id];}
 const location={hash:'#'+route};
 const window={BoluoEngine:E,BoluoResearch:R,BoluoResearchViz:RV,location,scrollTo(){},addEventListener(name,fn){listeners['win:'+name]=fn;}};
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
