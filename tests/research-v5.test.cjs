'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js');
const R=require('../research-core.js');globalThis.BoluoResearch=R;
const V3=require('../research-v3.js');globalThis.BoluoV3=V3;
const V4=require('../research-v4.js');globalThis.BoluoV4=V4;
const V5=require('../research-v5.js');globalThis.BoluoV5=V5;
const Viz=require('../research-v5-viz.js');globalThis.BoluoV5Viz=Viz;
const UI=require('../research-v5-ui.js');
test('every live research view has specific estimand, rival and falsification rule',()=>{
 const names=['home','mission','data','survey','models','archive',...Array.from({length:6},(_,i)=>'wind'+i)];
 assert.equal(names.length,12);
 for(const name of names){
  const x=V5.STUDIES[name];
  assert.ok(x&&x.question&&x.unit&&x.estimand&&x.mechanism&&x.rival&&x.falsify&&x.gap&&x.tier,name);
  assert.match(UI.studyPanel(name,{studyTab:'falsify'}),/反证条件/);
 }
});
test('historical wide-sector entropy and HHI derive from actual sectors and are finite',()=>{
 const d=V5.historyDiagnostics();
 assert.equal(d.rows.length,6);
 assert.ok(d.rows.every(r=>r.entropy>0&&r.hhi>0&&r.hhi<1));
 assert.ok(Math.abs(d.rows[0].industrial-50.05)<.1);
 assert.ok(Math.abs(d.rows[5].industrial-54.6)<.1);
 assert.ok(d.inner.filter(x=>x.missing>0).length>=2);
 assert.equal(d.shifts.length,5);
 assert.ok(d.peakDrop<0);
 assert.match(Viz.entropy(d),/<svg/);
});
test('target feasibility only solves normalized conditional sector growth identity',()=>{
 const s=E.normalize({target:1600,year:2030,seed:317});
 const x=V5.targetStudy(s);
 assert.ok(x.required>.09&&x.required<.1);
 assert.equal(x.gridCells,81);
 assert.ok(x.cellsPass>=0&&x.cellsPass<=81);
 assert.equal(x.rows.length,3);
 assert.ok(Math.abs(x.overall-x.path.reduce((a,b)=>a+b,0))<1e-6);
 for(let i=0;i<3;i++){
   const row=x.rows[i];
   if(row.requiredRate===null)continue;
   const back=row.base*Math.pow(1+row.requiredRate,x.year-2025)+(x.overall-x.path[i]);
   assert.ok(Math.abs(back-x.target)<1e-6);
 }
 assert.match(Viz.feasibility(x),/仅此产业承担目标/);
});
test('adversarial model disagreement is not represented as estimated real-world probability',()=>{
 const x=V5.rivalCompare(E.normalize({target:1600,seed:317,year:2030}));
 assert.equal(x.cases.length,4);
 assert.ok(x.cases.every(v=>Number.isFinite(v.margin)));
 assert.ok(x.spread>0);
 assert.match(x.message,/不能把四个模型/);
 assert.match(Viz.modelVotes(x),/门槛/);
});
test('synthetic random versus targeted network cuts yield a reproducible topology experiment',()=>{
 const a=V5.networkTrial(10),b=V5.networkTrial(10);
 assert.equal(a.targeted.cutEdges,b.targeted.cutEdges);
 assert.deepEqual(a.cascadeTargeted,b.cascadeTargeted);
 assert.ok(a.targeted.cutValue>=a.random.cutValue);
 assert.ok(a.cascadeTargeted.manufacturersImpaired>=0);
 assert.match(Viz.pairedNetworks(a),/固定种子随机移除/);
});
test('tea scenario alternatives are deterministic but not claiming real seasonal cash peak',()=>{
 const x=V5.teaTrial(75,12,10);
 assert.equal(x.harvestWindow,25);
 assert.equal(x.baseline.gap,63);
 assert.equal(x.baseline.money,630);
 assert.equal(x.scenarios.length,4);
 assert.ok(x.shock>0);
 assert.match(x.note,/不能由63/);
 assert.match(Viz.teaDays(x),/渠道延后15天/);
});
test('synthetic survey review requires multiple method criteria, not one p value',()=>{
 const m=E.survey({sampleSize:100,seed:317});
 const x=V5.surveyReview(m);
 assert.equal(x.total,5);
 assert.ok(x.green>=0&&x.green<=5);
 assert.ok(x.thresholds.every(row=>Number.isFinite(row.value)&&row.guide&&row.explanation));
 assert.match(x.warning,/尚未与SmartPLS/);
 assert.match(Viz.quality(x),/HTMT最大值/);
});
test('observation ledger distinguishes public rows from synthetic evidence absent',()=>{
 const x=V5.sourceLedger();
 assert.equal(x.length,6);
 assert.equal(x.filter(a=>a.level==='公开统计').length,3);
 assert.ok(x.filter(a=>a.level==='合成样本').every(a=>a.count===0));
});
test('assurance gate explicitly marks blocked empirical and data lineage prerequisites',()=>{
 const x=V5.assurance();
 assert.equal(x.length,10);
 assert.ok(x.some(row=>row.name.includes('外生变动')&&row.status==='尚缺实证'));
 assert.ok(x.some(row=>row.name.includes('不可篡改')&&row.status==='尚未实现'));
 assert.match(Viz.gateMap(x),/不可篡改/);
});
test('research UX renders all study-specific panels without claiming causal proof',()=>{
 const ctx={state:E.normalize({draws:300}),r:E.run({draws:300}),sel:{studyTab:'question',focus:'H1',cut:10},survey:E.survey({sampleSize:100}),tea:{receive:75,pay:12,daily:10}};
 for(const name of Object.keys(V5.STUDIES)){
  const x=UI.deepPanel(name,ctx);
  assert.ok(x.length>150,name);
  assert.doesNotMatch(x,/NaN|Infinity|undefined/,name);
 }
});
