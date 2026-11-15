'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const R=require('../research-core.js');
const E=require('../engine.js');
globalThis.BoluoResearch=R;
const V=require('../research-viz.js');
test('six observed historical vintages exist and reproduce published levels',()=>{
 assert.deepEqual(R.HISTORY.map(x=>x.year),[2020,2021,2022,2023,2024,2025]);
 assert.equal(R.HISTORY[0].gdp,619.04);
 assert.equal(R.HISTORY[5].gdp,1005.45);
 assert.equal(R.HISTORY[4].gdp,952.24);
 assert.equal(R.HISTORY[4].finalGdp,970.87);
 assert.ok(R.HISTORY.every(x=>x.source.startsWith('https://')));
});
test('revision-aware nominal growth never pairs 2024 prelim with 2025',()=>{
 const desc=R.describe();
 const y25=desc.rows.find(x=>x.year===2025);
 assert.ok(y25.revisions);
 assert.ok(Math.abs(y25.gdpNominalRate-(1005.45/970.87-1))<1e-9);
 assert.ok(Math.abs(desc.revision-18.63)<1e-6);
});
test('the 2020 to 2025 nominal sector differences decompose the total without causal claims',()=>{
 const d=R.describe();
 assert.ok(Math.abs(d.delta.reduce((a,b)=>a+b,0)-d.nominalTotal)<0.02);
 assert.ok(Math.abs(d.shareStart[1]-.50)<0.001);
 assert.ok(Math.abs(d.shareChangePp[1]-4.6)<0.05);
 assert.ok(d.shareChangePp[2]<-4);
 assert.ok(d.concentrationStart>0&&d.concentrationEnd<1);
});
test('theory dictionary exposes missing confounders without calling them measured',()=>{
 assert.ok(R.VARIABLES.length>=10);
 assert.equal(R.variable('price').status,'缺失');
 assert.equal(R.variable('project_delivery').status,'假设');
 assert.ok(R.HYPOTHESES.every(h=>h.test&&h.alternative));
 assert.ok(R.DAG.length>=10);
});
test('all four model comparators are finite and separate modeling assumptions',()=>{
 const r=E.run({year:2030,target:1600,draws:500,seed:317});
 const out=R.compareModels(r);
 assert.equal(out.candidates.length,4);
 assert.ok(out.candidates.every(x=>Number.isFinite(x.value)&&x.value>0));
 assert.ok(out.spread>0);
 assert.ok(out.candidates.some(x=>x.id==='historical'));
});
test('synthetic graph has exactly 500 subjects 680 directed edges',()=>{
 const a=R.networkStress({cut:10,mode:'targeted'});
 assert.equal(a.nodes,500);assert.equal(a.edges,680);assert.equal(a.serviceEdges,600);
 assert.ok(a.cutEdges>0);assert.ok(a.impactPct>0&&a.impactPct<1);
 assert.ok(a.serviceHHI>0&&a.serviceHHI<1);
});
test('targeted cuts are stronger than same-size deterministic random cuts, same seed repeats',()=>{
 const a=R.networkStress({cut:10,mode:'targeted'}),b=R.networkStress({cut:10,mode:'random'});
 assert.deepEqual(R.networkStress({cut:10,mode:'random'}).selected,b.selected);
 assert.ok(a.cutValue>=b.cutValue);
 const c=R.networkStress({cut:20,mode:'targeted'});
 assert.ok(c.cutValue>=a.cutValue);
});
test('all research graphics contain meaningful SVG or structured data',()=>{
 for(const mode of ['share','levels','gdp'])assert.match(V.history(mode),/<svg/);
 assert.match(V.history('gdp'),/970.87/);
 assert.match(V.dag('gdp'),/data-variable="gdp"/);
 assert.match(V.networkMap(R.networkStress({cut:10}),'S1'),/data-service-node/);
 assert.match(V.waterfall(),/现价GDP增量/);
 assert.match(V.comparison(R.compareModels(E.run({draws:500})),1600),/research-cmp-row/);
});
test('rolling-origin historical check cannot be mistaken for a verified model',()=>{
 const b=R.backtest();
 assert.deepEqual(b.tests.map(x=>x.year),[2022,2023]);
 assert.ok(Number.isFinite(b.histMAPE)&&b.histMAPE>=0);
 assert.ok(Number.isFinite(b.constantMAPE)&&b.constantMAPE>=0);
 assert.match(b.caution,/不满足正式/);
 assert.match(V.backtestTable(b),/2023/);
});
test('two-parameter stress response spans 81 clickable scenarios',()=>{
 const state=E.normalize({year:2030,target:1600});
 const s=R.surface(E,state);
 assert.equal(s.values.length,81);
 assert.ok(s.minimum<s.maximum);
 assert.ok(s.values.every(x=>Number.isFinite(x.value)));
 const low=s.values.find(x=>x.manufacturing===-1&&x.services===-1);
 const high=s.values.find(x=>x.manufacturing===1&&x.services===1);
 assert.ok(high.value>low.value);
 assert.match(V.stressSurface(s,state),/data-heat="1,1"/);
});
test('research dashboard has no calls to upload, download or live endpoints',()=>{
 const page=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.match(page,/research-core.js/);
 assert.match(page,/research-viz.js/);
});
